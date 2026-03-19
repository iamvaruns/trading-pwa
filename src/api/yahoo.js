const API_BASE = '';

export async function fetchYahoo(symbol, range = '1y', interval = '1d') {
  const apiUrl = `${API_BASE}/api/yahoo?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No chart data for ${symbol}`);
  return result;
}

export async function fetchYahooQuote(symbol) {
  try {
    const url = `${API_BASE}/api/yahoo-quote?symbol=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
