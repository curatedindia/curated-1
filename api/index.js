const app = require('../server/server');

module.exports = (req, res) => {
  // Normalize URL prefix for Express routing on Vercel
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
};
