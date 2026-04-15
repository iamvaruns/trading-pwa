const https = require("https");

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SYMBOL_RE = /^[A-Za-z0-9^=.\-]{1,20}$/;

function fetchCompanyNews(symbol, from, to, apiKey) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "finnhub.io",
      path: `/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&token=${encodeURIComponent(apiKey)}`,
      method: "GET",
      headers: { Accept: "application/json" },
      timeout: 10000,
    };

    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const articles = JSON.parse(data);
          const trimmed = Array.isArray(articles) ? articles.slice(0, 10) : [];
          resolve(trimmed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Finnhub news timeout"));
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
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify([]),
    };
  }

  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid or missing symbol parameter" }),
    };
  }

  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const data = await fetchCompanyNews(symbol, from, to, apiKey);
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
