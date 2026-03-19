#!/usr/bin/env node
/**
 * Should I Be Trading? — Local Dev Server
 * Uses ONLY Node.js built-in modules — no npm install needed
 * Run: node server.js
 * Open: http://localhost:3000
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const DIR = __dirname;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// ─── Yahoo Finance fetcher ────────────────────────────────────────────────────
function fetchYahoo(symbol, range, interval) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(symbol);
    const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=${interval}&range=${range}&includePrePost=false`;

    const opts = {
      hostname: 'query1.finance.yahoo.com',
      path: `/v8/finance/chart/${encoded}?interval=${interval}&range=${range}&includePrePost=false`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
      },
      timeout: 12000,
    };

    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const raw = Buffer.concat(chunks);
          // Handle gzip
          if (res.headers['content-encoding'] === 'gzip') {
            const zlib = require('zlib');
            zlib.gunzip(raw, (err, decoded) => {
              if (err) reject(err);
              else resolve(JSON.parse(decoded.toString()));
            });
          } else {
            const text = raw.toString();
            if (!text || text.trim() === '') reject(new Error('Empty response'));
            else resolve(JSON.parse(text));
          }
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

// ─── FRED fetcher ─────────────────────────────────────────────────────────────
function fetchFRED(seriesId, apiKey) {
  return new Promise((resolve, reject) => {
    if (!apiKey) return resolve(null);
    const opts = {
      hostname: 'api.stlouisfed.org',
      path: `/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&limit=30&sort_order=desc&file_type=json`,
      method: 'GET',
      timeout: 8000,
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('FRED timeout')); });
    req.end();
  });
}

// ─── Request handler ──────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── API: Yahoo Finance proxy ──────────────────────────────────────────────
  if (pathname === '/api/yahoo') {
    const symbol = parsed.query.symbol;
    const range = parsed.query.range || '1y';
    const interval = parsed.query.interval || '1d';

    if (!symbol) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing symbol' }));
      return;
    }

    console.log(`  📈 Yahoo: ${symbol} [${range}/${interval}]`);
    try {
      const data = await fetchYahoo(symbol, range, interval);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
      });
      res.end(JSON.stringify(data));
    } catch (e) {
      console.error(`  ✗ Yahoo error for ${symbol}:`, e.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message, symbol }));
    }
    return;
  }

  // ── API: FRED proxy ────────────────────────────────────────────────────────
  if (pathname === '/api/fred') {
    const seriesId = parsed.query.series;
    const apiKey = parsed.query.key;
    console.log(`  📊 FRED: ${seriesId}`);
    try {
      const data = await fetchFRED(seriesId, apiKey);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── API: Health check ──────────────────────────────────────────────────────
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  // ── Static files ───────────────────────────────────────────────────────────
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(DIR, filePath);

  // Prevent directory traversal
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback to index.html for SPA routing
      fs.readFile(path.join(DIR, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ◈ SHOULD I BE TRADING? — Local Server');
  console.log('  ═══════════════════════════════════════');
  console.log(`  ✓ Running at  http://localhost:${PORT}`);
  console.log(`  ✓ Yahoo API   http://localhost:${PORT}/api/yahoo?symbol=SPY`);
  console.log(`  ✓ Health      http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('  Open Chrome → http://localhost:${PORT}');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`  ✗ Port ${PORT} is already in use. Kill it with: lsof -ti:${PORT} | xargs kill`);
  } else {
    console.error('  ✗ Server error:', e.message);
  }
  process.exit(1);
});
