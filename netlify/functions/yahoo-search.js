const https = require("https");

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        ...headers,
      },
      timeout: 10000,
    };

    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

const ALLOWED_EXCHANGES = new Set([
  "NYQ", "NMS", "NGM", "NCM", "NYS", "NAS", "ASE", "PCX", "BTS",
  "NSI", "BSE", "NSE", "BOM",
]);

const BROAD_TYPES = new Set(["EQUITY", "ETF", "INDEX", "FUTURE", "CRYPTOCURRENCY", "MUTUALFUND"]);

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const params = event.queryStringParameters || {};
  const query = (params.q || "").trim().slice(0, 50);
  const mode = (params.mode || "").trim();

  if (!query) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing query parameter q" }),
    };
  }

  try {
    const encoded = encodeURIComponent(query);
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encoded}&quotesCount=12&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
    const res = await httpsGet(url, {
      Referer: "https://finance.yahoo.com/",
      Origin: "https://finance.yahoo.com",
    });

    const json = JSON.parse(res.body);
    let quotes;
    if (mode === "all") {
      quotes = (json.quotes || [])
        .filter(q => BROAD_TYPES.has(q.quoteType))
        .map(q => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          type: q.quoteType,
          exchange: q.exchange,
          exchDisp: q.exchDisp || q.exchange,
        }))
        .slice(0, 10);
    } else {
      quotes = (json.quotes || [])
        .filter(q => q.quoteType === "EQUITY" && ALLOWED_EXCHANGES.has(q.exchange))
        .map(q => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchange,
          exchDisp: q.exchDisp || q.exchange,
        }))
        .slice(0, 8);
    }

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
      body: JSON.stringify({ quotes }),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
