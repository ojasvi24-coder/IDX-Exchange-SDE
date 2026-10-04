// Logs: <ISO timestamp> <METHOD> <URL> <status> <duration>ms
// Written on 'finish' so the real status code and full duration are known.
function requestLogger(write = (line) => process.stdout.write(`${line}\n`)) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
      write(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
  };
}

module.exports = requestLogger;
