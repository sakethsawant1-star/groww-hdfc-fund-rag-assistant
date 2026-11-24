// server.js - Dual-port Zero-Dependency Local Server for Groww AI Navigator
const http = require('http');
const fs = require('fs');
const path = require('path');
const { processRAGQuery, SCHEMES } = require('./api/rag-engine');

// Ports
const PRIMARY_PORT = process.env.PORT || 3000;
const SECONDARY_PORT = 8080;

// Content types
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function requestHandler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API Endpoint: /api/chat
  if (pathname === '/api/chat') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        service: 'Groww HDFC Mutual Fund RAG Assistant API',
        latency: '< 50ms',
        schemesSupported: SCHEMES.map(s => ({ name: s.name, nav: s.nav, aum: s.aum, minSip: s.minSip }))
      }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const query = parsed.query || parsed.message || '';
          if (!query.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing query parameter' }));
            return;
          }

          const result = await processRAGQuery(query);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            response: result.response,
            status: result.status,
            source: result.source || 'ground_truth_rag'
          }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ response: 'System Error: ' + err.message }));
        }
      });
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // Static File Serving
  let relativeFile = pathname;
  if (relativeFile === '/' || relativeFile === '') {
    relativeFile = '/index.html';
  }

  const candidatePaths = [
    path.join(__dirname, relativeFile),
    path.join(__dirname, 'frontend', relativeFile),
    path.join(__dirname, 'phase5_stitch_ui', 'static', relativeFile)
  ];

  let foundFile = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      foundFile = p;
      break;
    }
  }

  if (foundFile) {
    const ext = path.extname(foundFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(foundFile);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } else {
    // Fallback to index.html for SPA routing
    const fallbackPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(fallbackPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end(fs.readFileSync(fallbackPath));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
}

// Start Server on Primary Port
const server1 = http.createServer(requestHandler);
server1.listen(PRIMARY_PORT, () => {
  console.log(`\n==========================================================`);
  console.log(`🚀 Groww AI Navigator server running on:`);
  console.log(`   👉 http://localhost:${PRIMARY_PORT}`);
  console.log(`   ⚡ Health check: http://localhost:${PRIMARY_PORT}/api/chat`);
  console.log(`==========================================================\n`);
});

// Also listen on secondary port 8080 if different
if (PRIMARY_PORT !== SECONDARY_PORT) {
  const server2 = http.createServer(requestHandler);
  server2.listen(SECONDARY_PORT, () => {
    console.log(`   👉 Backup local link: http://localhost:${SECONDARY_PORT}`);
  }).on('error', () => {
    // Secondary port already in use, ignore
  });
}
