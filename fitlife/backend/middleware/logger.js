// backend/middleware/logger.js
const morgan = require('morgan');

// Custom token: request body (for dev debugging)
morgan.token('body', (req) => {
  const body = { ...req.body };
  // Hide password from logs
  if (body.password) body.password = '***';
  return JSON.stringify(body);
});

// Use combined format in production, dev format in development
const logger =
  process.env.NODE_ENV === 'production'
    ? morgan('combined')
    : morgan(':method :url :status :response-time ms - :body');

module.exports = logger;
