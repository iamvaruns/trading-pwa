const https = require("https");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
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
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        ...headers,
      },
      timeout: 15000,
    };

    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

async function getCrumb() {
  const cookieRes = await httpsGet("https://fc.yahoo.com/", {});
  const setCookie = cookieRes.headers["set-cookie"];
  if (!setCookie) throw new Error("No cookies from Yahoo");
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  const cookieStr = cookies.map((c) => c.split(";")[0]).join("; ");

  const crumbRes = await httpsGet("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    Cookie: cookieStr,
    Accept: "text/plain",
  });

  if (!crumbRes.body || crumbRes.status !== 200) {
    throw new Error("Failed to get crumb");
  }

  return { crumb: crumbRes.body.trim(), cookies: cookieStr };
}

async function proxyYahoo(symbol, range, interval) {
  const encoded = encodeURIComponent(symbol);

  let crumb, cookies;
  try {
    const auth = await getCrumb();
    crumb = auth.crumb;
    cookies = auth.cookies;
  } catch {
    crumb = null;
    cookies = "";
  }

  const crumbParam = crumb ? `&crumb=${encodeURIComponent(crumb)}` : "";
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?interval=${interval}&range=${range}&includePrePost=false${crumbParam}`;

  const res = await httpsGet(url, {
    Cookie: cookies,
    Accept: "application/json",
    Referer: "https://finance.yahoo.com/",
    Origin: "https://finance.yahoo.com",
  });

  if (!res.body || res.body.trim() === "") {
    throw new Error(`Empty response for ${symbol} (HTTP ${res.status})`);
  }

  let json;
  try {
    json = JSON.parse(res.body);
  } catch {
    throw new Error(`Non-JSON response for ${symbol} (HTTP ${res.status}): ${res.body.slice(0, 200)}`);
  }

  if (json.chart?.error) {
    throw new Error(json.chart.error.description || `Yahoo error for ${symbol}`);
  }

  return json;
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
