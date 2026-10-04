const express = require('express');
const pool = require('../db/pool');
const { HttpError } = require('../utils/errors');
const {
  parseFilters, parsePaging, parseSort, buildWhere, buildOrderBy,
} = require('../utils/queryBuilder');

const router = express.Router();

// Columns the listings grid needs. `L_Remarks` (long text) is deliberately
// left out of list responses; it is only returned by the detail endpoint.
const LIST_COLUMNS = [
  'id', 'L_ListingID', 'L_DisplayId', 'L_Address', 'L_City', 'L_State', 'L_Zip',
  'L_SystemPrice', 'L_Keyword2', 'LM_Dec_3', 'LM_Int2_3', 'L_Photos', 'L_Status',
  'L_Type_', 'ListingContractDate', 'YearBuilt',
].join(', ');

// Detail columns. Agent e-mail/phone and parcel numbers are intentionally not
// exposed through the public API.
const DETAIL_COLUMNS = [
  LIST_COLUMNS, 'L_Remarks', 'LMD_MP_Latitude', 'LMD_MP_Longitude', 'LotSizeAcres',
  'LotSizeSquareFeet', 'L_Class', 'StructureType', 'ArchitecturalStyle',
  'SubdivisionName', 'DaysOnMarket', 'StoriesTotal', 'L_Keyword5', 'GarageYN',
  'PoolPrivateYN', 'ViewYN', 'FireplaceYN', 'Cooling', 'Heating', 'Flooring',
  'AssociationFee', 'AssociationFeeFrequency', 'HighSchoolDistrict',
  'NewConstructionYN', 'ListAgentFullName', 'LO1_OrganizationName',
].join(', ');

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function validateId(req, _res, next) {
  if (!ID_PATTERN.test(req.params.id)) {
    return next(new HttpError(400, 'Invalid property id: use 1-64 letters, digits, "-" or "_"'));
  }
  return next();
}

// Express matches routes in registration order. '/:id/openhouses' must come
// before '/:id' (and both after '/'), otherwise a shorter pattern could shadow
// the more specific one.
router.get('/', async (req, res, next) => {
  try {
    const filters = parseFilters(req.query);
    const { limit, offset } = parsePaging(req.query);
    const sort = parseSort(req.query);

    const { where, values } = buildWhere(filters);
    const dataSql = `SELECT ${LIST_COLUMNS} FROM rets_property ${where} ${buildOrderBy(sort)} LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) AS total FROM rets_property ${where}`;

    // Copy, never mutate `values`: the COUNT query must see only the filter
    // placeholders, not LIMIT/OFFSET.
    const [[countRows], [rows]] = await Promise.all([
      pool.query(countSql, values),
      pool.query(dataSql, [...values, limit, offset]),
    ]);

    res.json({ total: Number(countRows[0].total), limit, offset, results: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/openhouses', validateId, async (req, res, next) => {
  try {
    const [found] = await pool.query(
      'SELECT L_ListingID FROM rets_property WHERE L_ListingID = ? LIMIT 1',
      [req.params.id],
    );
    if (found.length === 0) throw new HttpError(404, `Property ${req.params.id} not found`);

    const [rows] = await pool.query(
      `SELECT id, L_ListingID, OpenHouseDate, OH_StartTime, OH_EndTime, all_data
         FROM rets_openhouse
        WHERE L_ListingID = ?
        ORDER BY OpenHouseDate ASC, OH_StartTime ASC`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validateId, async (req, res, next) => {
  try {
    // L_ListingID is not unique in the dump, so take the most recent row.
    const [rows] = await pool.query(
      `SELECT ${DETAIL_COLUMNS} FROM rets_property
        WHERE L_ListingID = ?
        ORDER BY ModificationTimestamp DESC, id DESC LIMIT 1`,
      [req.params.id],
    );
    if (rows.length === 0) throw new HttpError(404, `Property ${req.params.id} not found`);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
