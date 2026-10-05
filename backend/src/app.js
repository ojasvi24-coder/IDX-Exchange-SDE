const express = require('express');
const cors = require('cors');
const pool = require('./db/pool');
const requestLogger = require('./middleware/requestLogger');
const propertiesRouter = require('./routes/properties');
const { HttpError } = require('./utils/errors');

function createApp({ logger = requestLogger() } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(logger);

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
      res.status(500).json({ status: 'error', database: 'disconnected', message: err.message });
    }
  });

  app.use('/api/properties', propertiesRouter);

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Route not found')));

  // Central error handler: 4xx messages are safe to show; anything else is a
  // 500 with a generic message so SQL/stack details never leak to clients.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
    process.stderr.write(`Unhandled error: ${err.stack || err}\n`);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
