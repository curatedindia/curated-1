const app = require('../server/server');

module.exports = (req, res) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
};
