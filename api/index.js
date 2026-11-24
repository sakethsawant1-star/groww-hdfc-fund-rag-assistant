// api/index.js - Catch-all API handler for Vercel
const chatHandler = require('./chat');

module.exports = async function handler(req, res) {
  // Delegate all requests to chatHandler
  return chatHandler(req, res);
};
