# IDX Exchange Property Search

A Zillow/Redfin-style property search app on real MLS data: searchable, filterable, sortable, paginated listings; a detail page with photo gallery + lightbox, Google map and open-house schedule; and favorites.

> Screenshot: run the app (see below) and add `docs/screenshot.png` here. Not included yet.

## Architecture

```
React (3000)  ──/api/*──▶  Express REST API (5000)  ──mysql2 pool──▶  MySQL 8 in Docker (3306)
```

React never talks to MySQL. In development the CRA `proxy` forwards `/api/*` to Express.

```
backend/   Express API (src/routes, src/utils/queryBuilder.js, src/middleware, src/db)
frontend/  React app (src/api, components, pages, hooks, utils)
sql/       indexes.sql (performance indexes, run after importing the dumps)
```

## Tech stack

| Part | Versions used |
|---|---|
| Node / npm | 24.14 / 11.13 |
| Backend | Express 5, mysql2, dotenv, cors, Jest + Supertest |
| Frontend | React 18, React Router 6, react-scripts 5 (CRA), Jest + React Testing Library |
| Database | MySQL 8.4 (`mysql:8` image) |

## Setup from a fresh machine

1. **Data**: obtain `rets_property.sql` and `rets_openhouse.sql` from the team lead (not committed; they are large).
2. **MySQL in Docker**
   ```bash
   docker run -d --name idx-mysql-local -e MYSQL_ROOT_PASSWORD=idxlocal -e MYSQL_DATABASE=rets \
     -p 3306:3306 mysql:8 --character-set-server=utf8mb4 --max_allowed_packet=512M \
     --sql-mode=NO_ENGINE_SUBSTITUTION
   docker cp rets_property.sql idx-mysql-local:/tmp/ && docker cp rets_openhouse.sql idx-mysql-local:/tmp/
   docker exec idx-mysql-local sh -c 'mysql -uroot -pidxlocal rets < /tmp/rets_openhouse.sql'
   docker exec idx-mysql-local sh -c 'mysql -uroot -pidxlocal rets < /tmp/rets_property.sql'   # ~30-60 min
   docker exec -i idx-mysql-local mysql -uroot -pidxlocal rets < sql/indexes.sql
   ```
   `NO_ENGINE_SUBSTITUTION` (no strict/zero-date modes) is needed because the dump contains `'0000-00-00 00:00:00'` defaults.
   Verify: `SHOW TABLES;` → `rets_property`, `rets_openhouse`; `SELECT COUNT(*)` → 55,212 and 13,433 with the dumps used here.
3. **Backend**: `cd backend && cp .env.example .env` (set `DB_PASSWORD`), `npm install`, `npm run dev` → http://localhost:5000/api/health
4. **Frontend**: `cd frontend && cp .env.example .env` (add `REACT_APP_GOOGLE_MAPS_API_KEY`), `npm install`, `npm start` → http://localhost:3000

### Environment variables

| File | Variable | Purpose |
|---|---|---|
| `backend/.env` | `DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME` | MySQL connection |
| `backend/.env` | `PORT` | API port (default 5000) |
| `frontend/.env` | `REACT_APP_GOOGLE_MAPS_API_KEY` | Maps Embed API key (restrict to `localhost:3000`). Without it the map preview is replaced by a notice; Get Directions still works. |

`.env` files are git-ignored.

## API

All errors are JSON `{ "error": "message" }`. 400 = invalid input, 404 = unknown property/route, 500 = server/database failure (generic message, details only in server logs).

### `GET /api/health`
`200 {"status":"ok","database":"connected"}` · DB down: `500 {"status":"error","database":"disconnected","message":"..."}`

### `GET /api/properties`
| Param | Rule |
|---|---|
| `city` | ≤ 50 chars, case-insensitive match on `L_City` |
| `zipcode` | `12345` or `12345-6789` → `L_Zip` |
| `minPrice` / `maxPrice` | non-negative integers, min ≤ max → `L_SystemPrice` |
| `beds` / `baths` | **minimum** values → `L_Keyword2 >= ?`, `LM_Dec_3 >= ?` |
| `limit` / `offset` | 1–100 (default 20) / ≥ 0 |
| `sortBy` | `L_SystemPrice`, `ListingContractDate`, `LM_Int2_3`, `L_Keyword2` (whitelist of real columns) |
| `sortOrder` | `asc` (default) / `desc` |

```
GET /api/properties?city=Irvine&minPrice=300000&beds=3&limit=2&sortBy=L_SystemPrice&sortOrder=desc
→ 200 { "total": 548, "limit": 2, "offset": 0, "results": [ { "id": 61812, "L_ListingID": "1142070303",
        "L_Address": "142 Hedge Bloom", "L_City": "Irvine", "L_State": "CA", "L_Zip": "92618",
        "L_SystemPrice": 1028888, "L_Keyword2": 3, "LM_Dec_3": "3.0", "LM_Int2_3": 1390, "L_Photos": "[...]", ... } ] }
GET /api/properties?minPrice=abc → 400 { "error": "minPrice must be a non-negative integer" }
```

### `GET /api/properties/:id`
`:id` is `L_ListingID` (1–64 of `A-Za-z0-9_-`). Returns the full property (incl. `L_Remarks`, `LMD_MP_Latitude/Longitude`; agent contact details and parcel numbers are deliberately not exposed). `400` malformed id, `404` unknown.

### `GET /api/properties/:id/openhouses`
Always an array, ordered by `OpenHouseDate, OH_StartTime`; `[]` when none; `404` for an unknown property.
```json
[{ "id": 1, "L_ListingID": "1190952876", "OpenHouseDate": "2026-09-27", "OH_StartTime": "13:30:00",
   "OH_EndTime": "15:30:00", "all_data": "{\"OpenHouseRemarks\":null, ...}" }]
```
`OpenHouseRemarks` is inside the `all_data` JSON string and is extracted in the React component. `/:id/openhouses` is registered before `/:id` (Express matches in registration order).

## Database schema summary

Verified against the provided dumps (older RETS names, not RESO):

**`rets_property`** (55,212 rows, InnoDB) – PK `id`; `L_ListingID` (non-unique), `L_Address`, `L_City`, `L_State`, `L_Zip`, `L_SystemPrice` (price), `L_Keyword2` (beds), `LM_Dec_3` (baths), `LM_Int2_3` (sqft), `L_Photos` (JSON array text), `LMD_MP_Latitude/Longitude`, `L_Remarks`, `YearBuilt`, `LotSizeAcres`, `ListingContractDate`, …
**`rets_openhouse`** (13,433 rows, MyISAM/latin1) – PK `id`; `L_ListingID` (join key to `rets_property.L_ListingID`, no FK), `OpenHouseDate`, `OH_StartTime`, `OH_EndTime`, `all_data` (JSON text).

## Performance (EXPLAIN ANALYZE, local Docker MySQL 8.4, 55k rows)

The dump ships single-column indexes (`L_City`, `L_Zip`, …). Measured before/after adding `sql/indexes.sql`:

| Query | Before | After |
|---|---|---|
| price range + sort by price | 7,147 ms (full scan + filesort) | 11.4 ms |
| sort by `ListingContractDate` desc | 6,656 ms | 1.3 ms (covering index, reverse scan) |
| `COUNT` price range | 6,986 ms | 12.3 ms |
| `COUNT` ZIP + price range | 1.8 ms | 0.18 ms |
| sort by sqft desc | scan | 0.04 ms |
| city + price + beds, page 1 | 2.9 ms | 5.2 ms (slightly slower: optimizer now uses the composite index then sorts ~700 rows by `id`; both are single-digit ms) |

Why: rows contain large `L_Photos`/`L_Remarks`, so scans are slow; composite indexes `(city|zip, price, beds, baths)` let `COUNT(*)` be answered from the index alone.

Query-design decisions found via EXPLAIN:
- **City match uses `L_City = ?`**, not `LOWER(TRIM(L_City))`. The column's collation (`utf8mb4_0900_ai_ci`) is already case-insensitive, and wrapping the column in functions scanned the whole index (cost 54,065 vs 720). Verified: no `L_City` values with leading/trailing spaces exist in this dump.
- **`ORDER BY col DIR, id DIR`** rather than `col IS NULL, col`: the `IS NULL` prefix defeats index ordering. Trade-off: NULLs sort first for ascending.

Request logs (`ISO-timestamp METHOD URL status Nms`) are written to stdout for every request.

## Debugging notes (symptom → root cause → fix → regression test)

1. **minPrice + beds wrong total** – `COUNT` and `SELECT` must bind the same filter `values`; `LIMIT/OFFSET` are appended to a *copy* only. Test: `regression: minPrice + beds binds identical filter values…` (the mock DB rejects placeholder/value count mismatches).
2. **Old results flash after Search → Clear → Search** – responses were committed whenever they arrived, so a slow earlier request overwrote newer state. Each effect run now owns an `AbortController` (cleanup aborts; a guard ignores late responses; stale rows are cleared on new requests). Tests in `ListingsPage.test.js` (stale data and stale error).
3. **Pagination `1 ... 2 3 4 ... 1`** – last page was appended unconditionally. `getPageNumbers` adds first/last exactly once with a fixed-size window; exhaustively tested for totals 1–40.
4. **Escape does not close the lightbox** – key events go to the focused element and a `<div>` is not focusable. The dialog has `tabIndex={-1}` and takes focus on open; focus returns to the opener on close. Test sends a real keyboard event via `user-event`.
5. **Open-house endpoint crash for one listing ID** – *not reproducible with this dataset*: all 13,433 open-house listing IDs were requested through the API → 12,111 × 200, 1,322 × 404 (listing absent from `rets_property`), 0 × 400/500. Handlers are wrapped in try/catch with a central error handler regardless.
6. Remarks never appear → they live inside `all_data` JSON (`parseOpenHouseRemarks`). Photos broken → `L_Photos` may be `''`, null, malformed or non-array (`parsePhotos`, unit tested).

## Known data issues (handled or documented)

- `L_Photos`: 140+ empty strings; handled defensively. Expired image URLs are dropped client-side.
- 731 properties have null/0 coordinates → no map, notice shown.
- `LM_Int2_3` (sqft) is 0 for 112 rows and NULL for 92; `L_Keyword2` (beds) is 0 for 353 and NULL for 104. Zero sqft is displayed as missing. Sorting by sqft ascending lists unknown values first.
- `L_ListingID` is not unique (duplicates exist); detail returns the most recently modified row.
- 6 open houses have implausible years (2031–4202), 36 have end ≤ start time, and 1,322 open-house listing IDs have no property row. Data is returned as-is.
- Prices range from $100 to $400,000,000; shown as stored. `null`/`0` price renders "Price unavailable".

## Advanced feature: Sorting + Favorites (Option 3)

- **Sorting**: backend whitelist of real column names (`L_SystemPrice`, `ListingContractDate`, `LM_Int2_3`, `L_Keyword2`), 400 otherwise. Sort lives in the URL → persists across pages, resets on a new search, and returns to page 1 when changed.
- **Favorites**: `useFavorites` (the only place that touches `localStorage`), shared across components via `useSyncExternalStore`, synced across tabs; heart `stopPropagation`; `/favorites` page; header count.

## Testing

```bash
cd backend  && npm test && npm run lint
cd frontend && npm test && npm run lint
```
Backend: Jest + Supertest with the pool mocked (45 tests). Frontend: Jest + RTL with `global.fetch` mocked. Last measured: backend 45 tests, 98.7% statements / 100% lines on loaded files (`server.js` and `pool.js` are not exercised by tests); frontend 155 tests, 97.1% statements / 97.7% lines. Both projects lint clean.

Dev proxy note: on Node 24/Windows the CRA proxy intermittently truncated responses larger than ~64 KB (direct calls were fine). `frontend/src/setupProxy.js` is the default; if you see listings stuck on "Loading", set `REACT_APP_API_URL=http://127.0.0.1:5000/api` in `frontend/.env`.

## Git workflow

`main` ← `develop` ← `feature/*` (merged with `--no-ff`), Conventional Commits, PR template in `.github/`.

## Known limitations / future improvements

- Google Maps rendering requires a user-supplied API key and was not verified here with a real key.
- Natural-language search (Option 5) is not implemented.
- Filters only expose the minimum for beds/baths; no status/type filters.
- Add an FK/unique index strategy for `L_ListingID` and an images proxy for expired URLs.
- Cursor-based pagination would scale better than `OFFSET` for deep pages.
