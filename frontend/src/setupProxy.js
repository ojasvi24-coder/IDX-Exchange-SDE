const { createProxyMiddleware } = require('http-proxy-middleware');

// Dev-only proxy: /api/* -> Express. Targets 127.0.0.1 explicitly (not 'localhost')
// so Node does not try IPv6 ::1 first, and uses a fresh connection per request:
// the default CRA 'proxy' field truncated large JSON responses (>64 KB) after a
// ~19 s stall on Node 24 in this environment.
module.exports = function setupProxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:5000',
      changeOrigin: true,
      agent: false,
    }),
  );
};
