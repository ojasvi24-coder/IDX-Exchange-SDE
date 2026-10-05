const mysql = require('mysql2/promise');
require('dotenv').config();

// A pool keeps a bounded set of authenticated connections open and hands them
// out per query. Opening a connection per request would pay the TCP + auth
// handshake every time and could exhaust MySQL's connection limit under load.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rets',
  waitForConnections: true,
  connectionLimit: 10,
  // Return DATE/DATETIME columns as plain strings. Otherwise mysql2 builds JS
  // Dates in the server's timezone and an open house on 2026-09-27 can
  // serialise to 2026-09-26T07:00:00Z and render on the wrong day.
  dateStrings: true,
});

module.exports = pool;
