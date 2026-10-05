# Runs every checkpoint check for weeks 1-3 and prints each command with its output.
# Usage (VS Code terminal, from repo root):  .\scripts\checkpoints.ps1
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$results = [ordered]@{}
$mysql = 'docker exec -i idx-mysql-local mysql -uroot -pidxlocal rets --table'

function Section($t) { Write-Host "`n==================== $t ====================" -ForegroundColor Cyan }
function Run($label, [scriptblock]$cmd) {
  Write-Host "`n> $label" -ForegroundColor Yellow
  $global:LASTEXITCODE = 0
  & $cmd 2>&1 | ForEach-Object { "$_" -replace 'Using a password on the command line.*', '' } | Where-Object { $_ -ne '' } | Write-Host
  $ok = ($LASTEXITCODE -eq 0)
  $results[$label] = $ok
  Write-Host ("[{0}] {1}" -f ($(if ($ok) { 'PASS' } else { 'FAIL' })), $label) -ForegroundColor ($(if ($ok) { 'Green' } else { 'Red' }))
}
function Sql($q) { $q | docker exec -i idx-mysql-local mysql -uroot -pidxlocal rets --table 2>&1 | Where-Object { $_ -notmatch 'Using a password' } }

Section 'WEEK 1 - Environment, database, schema'
Run 'node / npm / docker versions' { node -v; npm -v; docker --version }
Run 'start MySQL container' { docker start idx-mysql-local; docker ps --filter name=idx-mysql-local --format '{{.Names}}  {{.Status}}  {{.Ports}}' }
Run 'tables present' { Sql 'SHOW TABLES;' }
Run 'row counts (property ~55k, openhouse ~13k)' { Sql 'SELECT (SELECT COUNT(*) FROM rets_property) AS rets_property, (SELECT COUNT(*) FROM rets_openhouse) AS rets_openhouse;' }
Run 'schema: rets_property key columns' { Sql "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='rets' AND TABLE_NAME='rets_property' AND COLUMN_NAME IN ('id','L_ListingID','L_Address','L_City','L_Zip','L_SystemPrice','L_Keyword2','LM_Dec_3','LM_Int2_3','L_Photos');" }
Run 'schema: rets_openhouse columns' { Sql 'DESCRIBE rets_openhouse;' }

Section 'WEEK 2 - Backend API + React frontend'
Run 'backend: npm install' { npm --prefix backend install --no-audit --no-fund }
Run 'backend: npm test' { npm --prefix backend test }
Run 'backend: npm run lint' { npm --prefix backend run lint }
Run 'frontend: npm install' { npm --prefix frontend install --no-audit --no-fund }
Run 'frontend: npm test' { $env:CI = 'true'; npm --prefix frontend test -- --watchAll=false }
Run 'frontend: npm run lint' { npm --prefix frontend run lint }

# make sure the API is up for live endpoint checks
$api = 'http://localhost:5000/api'
$up = $false
try { Invoke-RestMethod "$api/health" -TimeoutSec 3 | Out-Null; $up = $true } catch {}
if (-not $up) {
  Write-Host "`nStarting backend in the background..." -ForegroundColor DarkGray
  $job = Start-Job { Set-Location $using:root\backend; node src/server.js }
  Start-Sleep 5
}
function Get-Api($path) {
  try { $r = Invoke-WebRequest "$api$path" -UseBasicParsing -TimeoutSec 20; "$($r.StatusCode) $path"; $r.Content.Substring(0, [Math]::Min(220, $r.Content.Length)) + ' ...'; $global:LASTEXITCODE = 0 }
  catch { "$($_.Exception.Response.StatusCode.value__) $path  $($_.ErrorDetails.Message)"; $global:LASTEXITCODE = 0 }
}
Run 'GET /api/health' { Get-Api '/health'; if ((Invoke-RestMethod "$api/health").status -ne 'ok') { $global:LASTEXITCODE = 1 } }
Run 'GET /api/properties?city=Irvine&limit=2' { Get-Api '/properties?city=Irvine&limit=2' }
Run 'GET /api/properties/:id (valid id)' { $id = (Invoke-RestMethod "$api/properties?limit=1").results[0].L_ListingID; Get-Api "/properties/$id" }
Run 'GET /api/properties/:id/openhouses (listing with open houses -> 200)' {
  $oh = (Sql 'SELECT o.L_ListingID FROM rets_openhouse o JOIN rets_property p ON p.L_ListingID = o.L_ListingID LIMIT 1;' | Select-String '\d{6,}' | Select-Object -First 1).Matches[0].Value
  Get-Api "/properties/$oh/openhouses"
  if ((Invoke-WebRequest "$api/properties/$oh/openhouses" -UseBasicParsing).StatusCode -ne 200) { $global:LASTEXITCODE = 1 }
}
Run 'GET invalid input -> 400' { Get-Api '/properties?minPrice=abc' }
Run 'GET unknown property -> 404' { Get-Api '/properties/doesnotexist' }

Section 'WEEK 3 - Indexes, EXPLAIN, filter bug regression'
Run 'indexes on rets_property' { Sql "SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='rets' AND TABLE_NAME='rets_property' ORDER BY 1;" }
Run 'week 3 bug: minPrice + beds total matches DB count' {
  $api_total = (Invoke-RestMethod "$api/properties?minPrice=500000&beds=3&limit=1").total
  $db_total = [int](Sql 'SELECT COUNT(*) FROM rets_property WHERE L_SystemPrice >= 500000 AND L_Keyword2 >= 3;' | Select-String '\d+' | Select-Object -Last 1).Matches[0].Value
  "API total=$api_total  DB total=$db_total"
  if ($api_total -ne $db_total) { $global:LASTEXITCODE = 1 }
}
Run 'EXPLAIN ANALYZE: city + price + beds (uses composite index)' { Sql "EXPLAIN ANALYZE SELECT COUNT(*) FROM rets_property WHERE L_City='Irvine' AND L_SystemPrice >= 300000 AND L_Keyword2 >= 3\G" | Select-Object -First 8 }
Run 'EXPLAIN ANALYZE: price range sort (index, no full scan)' { Sql 'EXPLAIN ANALYZE SELECT id FROM rets_property WHERE L_SystemPrice >= 500000 ORDER BY L_SystemPrice, id LIMIT 20\G' | Select-Object -First 8 }
Run 'regression tests (minPrice+beds, pagination, stale results, lightbox)' { npm --prefix backend test -- -t regression --coverage=false }

if ($job) { Stop-Job $job; Remove-Job $job }

Section 'SUMMARY'
$results.GetEnumerator() | ForEach-Object { Write-Host ("[{0}] {1}" -f ($(if ($_.Value) { 'PASS' } else { 'FAIL' }), $_.Key)) -ForegroundColor ($(if ($_.Value) { 'Green' } else { 'Red' })) }
$fail = ($results.Values | Where-Object { -not $_ }).Count
Write-Host "`n$($results.Count - $fail)/$($results.Count) checks passed" -ForegroundColor ($(if ($fail) { 'Red' } else { 'Green' }))
