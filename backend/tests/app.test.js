jest.mock('../src/db/pool', () => ({ query: jest.fn() }));

const request = require('supertest');
const pool = require('../src/db/pool');
const createApp = require('../src/app');
const requestLogger = require('../src/middleware/requestLogger');

beforeEach(() => pool.query.mockReset());

describe('GET /api/health', () => {
  const app = createApp({ logger: (_req, _res, next) => next() });

  it('reports a connected database', async () => {
    pool.query.mockResolvedValue([[{ 1: 1 }]]);
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'connected' });
  });

  it('returns 500 (and does not crash) when MySQL is unreachable', async () => {
    pool.query.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ status: 'error', database: 'disconnected' });
    expect(res.body.message).toMatch(/ECONNREFUSED/);
  });
});

describe('error handling', () => {
  const app = createApp({ logger: (_req, _res, next) => next() });

  it('returns a JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Route not found');
  });
});

describe('request logger', () => {
  it('logs timestamp, method, url, status and duration in ms', async () => {
    pool.query.mockResolvedValue([[{ 1: 1 }]]);
    const lines = [];
    const app = createApp({ logger: requestLogger((l) => lines.push(l)) });
    await request(app).get('/api/health?x=1');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z GET \/api\/health\?x=1 200 \d+ms$/);
  });

  it('writes to stdout by default', async () => {
    pool.query.mockResolvedValue([[{ 1: 1 }]]);
    const out = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await request(createApp()).get('/api/health');
    const logged = out.mock.calls.map((c) => c[0]).join('');
    out.mockRestore();
    expect(logged).toMatch(/GET \/api\/health 200 \d+ms/);
  });
});
