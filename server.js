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

// Load .env file (no dependencies needed)
const envPath = path.join(DIR, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ observations: [] }));
      return;
    }
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

  // ── API: Anthropic AI analysis proxy ───────────────────────────────────────
  if (pathname === '/api/analysis' && req.method === 'POST') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text: '[ ANTHROPIC_API_KEY not set in .env — AI analysis disabled ]' }));
      return;
    }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { prompt } = JSON.parse(body);
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing prompt' }));
          return;
        }
        const payload = JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        });
        const opts = {
          hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
          headers: {
            'Content-Type': 'application/json', 'x-api-key': apiKey,
            'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 30000,
        };
        console.log('  🤖 Anthropic: requesting analysis...');
        const apiReq = https.request(opts, (apiRes) => {
          let data = '';
          apiRes.on('data', c => data += c);
          apiRes.on('end', () => {
            try {
              const json = JSON.parse(data);
              const text = json.content?.[0]?.text || 'Analysis unavailable.';
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ text }));
            } catch {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to parse Anthropic response' }));
            }
          });
        });
        apiReq.on('error', (e) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        });
        apiReq.on('timeout', () => { apiReq.destroy(); });
        apiReq.write(payload);
        apiReq.end();
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
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
