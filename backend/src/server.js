const createApp = require('./app');

const PORT = Number(process.env.PORT) || 5000;

createApp().listen(PORT, () => {
  process.stdout.write(`API listening on http://localhost:${PORT}\n`);
});

// A rejected promise anywhere must not take the API down silently.
process.on('unhandledRejection', (reason) => {
  process.stderr.write(`Unhandled rejection: ${reason}\n`);
});
