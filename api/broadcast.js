const app = require('../server/server');

module.exports = (req, res) => {
  // Ensure req.url matches the Express /api/broadcast route
  req.url = '/api/broadcast';
  return app(req, res);
};
