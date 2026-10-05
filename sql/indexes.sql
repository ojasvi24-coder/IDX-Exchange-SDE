-- Performance indexes for rets_property.
-- Run once after importing the provided dumps:
--   docker exec -i idx-mysql-local mysql -uroot -p rets < sql/indexes.sql
--
-- The dump already ships single-column indexes on L_ListingID, L_City, L_Zip,
-- L_DisplayId and L_Type_. EXPLAIN ANALYZE showed those are fine for city/ZIP
-- filters (~2 ms) but price-range filters and every sort took ~7 s because
-- they full-scanned a table whose rows carry large L_Photos/L_Remarks values.
--
-- Design rules (see README "Performance" for the measurements):
--  * Equality column first (L_City / L_Zip), then the range column
--    (L_SystemPrice), then the remaining filter columns, so one index serves
--    the WHERE clause AND lets COUNT(*) be answered from the index alone
--    ("Using index"), never touching the wide rows.
--  * Leading column of each index also serves ORDER BY for that column
--    (price, beds). The sort whitelist columns without a natural leading index
--    get their own index (ListingContractDate, LM_Int2_3).
--  * Redundant single-column indexes are not added (a composite's prefix
--    already covers them).

CREATE INDEX idx_city_price_beds_baths ON rets_property (L_City, L_SystemPrice, L_Keyword2, LM_Dec_3);
CREATE INDEX idx_zip_price_beds_baths  ON rets_property (L_Zip,  L_SystemPrice, L_Keyword2, LM_Dec_3);
CREATE INDEX idx_price_beds_baths      ON rets_property (L_SystemPrice, L_Keyword2, LM_Dec_3);
CREATE INDEX idx_beds_baths            ON rets_property (L_Keyword2, LM_Dec_3);
CREATE INDEX idx_baths                 ON rets_property (LM_Dec_3);
CREATE INDEX idx_listing_date          ON rets_property (ListingContractDate);
CREATE INDEX idx_sqft                  ON rets_property (LM_Int2_3);
