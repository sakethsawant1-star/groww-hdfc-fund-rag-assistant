// api/chat.js - Vercel Serverless Function for Groww HDFC Mutual Fund Assistant
const { processRAGQuery, SCHEMES } = require('./rag-engine');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Health / Catalog check
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'Groww HDFC Mutual Fund RAG Assistant API',
      latency: '< 50ms',
      schemesSupported: SCHEMES.map(s => ({ name: s.name, nav: s.nav, aum: s.aum, minSip: s.minSip }))
    });
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          body = {};
        }
      }

      const query = (body && (body.query || body.message || body.prompt)) || '';

      if (!query || !query.trim()) {
        return res.status(400).json({
          error: 'Missing query parameter',
          example: { query: 'What is the minimum SIP for HDFC Small Cap Fund?' }
        });
      }

      const result = await processRAGQuery(query);
      return res.status(200).json({
        response: result.response,
        status: result.status,
        source: result.source || 'ground_truth_rag'
      });
    } catch (err) {
      console.error('Chat endpoint error:', err);
      return res.status(500).json({
        response: 'System error: Unable to process mutual fund query. Please try again.',
        error: err.message
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
