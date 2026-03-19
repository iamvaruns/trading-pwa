const https = require("https");
const zlib = require("zlib");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function proxyYahoo(symbol, range, interval) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(symbol);
    const opts = {
      hostname: "query1.finance.yahoo.com",
      path: `/v8/finance/chart/${encoded}?interval=${interval}&range=${range}&includePrePost=false`,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://finance.yahoo.com/",
        Origin: "https://finance.yahoo.com",
      },
      timeout: 12000,
    };

    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          const raw = Buffer.concat(chunks);
          if (res.headers["content-encoding"] === "gzip") {
            zlib.gunzip(raw, (err, decoded) => {
              if (err) reject(err);
              else resolve(JSON.parse(decoded.toString()));
            });
          } else if (res.headers["content-encoding"] === "br") {
            zlib.brotliDecompress(raw, (err, decoded) => {
              if (err) reject(err);
              else resolve(JSON.parse(decoded.toString()));
            });
          } else {
            const text = raw.toString();
            if (!text || text.trim() === "") reject(new Error("Empty response"));
            else resolve(JSON.parse(text));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const params = event.queryStringParameters || {};
  const symbol = params.symbol;
  const range = params.range || "1y";
  const interval = params.interval || "1d";

  if (!symbol) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing symbol" }),
    };
  }

  try {
    const data = await proxyYahoo(symbol, range, interval);
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30",
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: e.message, symbol }),
    };
  }
};
