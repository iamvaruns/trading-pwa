const https = require("https");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function callAnthropic(apiKey, prompt, mode) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const opts = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: 30000,
    };

    const req = https.request(opts, (res) => {
      let data = "";
      console.log("[analysis] Anthropic HTTP status:", res.statusCode);
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          console.log("[analysis] Anthropic raw response:", data.substring(0, 500));
          const json = JSON.parse(data);
          resolve(json.content?.[0]?.text || "Analysis unavailable.");
        } catch {
          reject(new Error("Failed to parse Anthropic response"));
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Anthropic API timeout"));
    });
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log("[analysis] ANTHROPIC_API_KEY present:", !!apiKey);
  console.log("[analysis] ANTHROPIC_API_KEY length:", apiKey ? apiKey.length : 0);
  console.log("[analysis] Available env var keys:", Object.keys(process.env).filter(k => k.includes("ANTHROPIC") || k.includes("API")).join(", ") || "none matching");
  if (!apiKey) {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "[ ANTHROPIC_API_KEY not configured — set it in Netlify environment variables ]",
      }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    if (!prompt) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing prompt" }),
      };
    }

    const text = await callAnthropic(apiKey, prompt);
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
