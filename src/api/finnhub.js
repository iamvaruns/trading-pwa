const API_BASE = '';

export async function fetchSentiment(symbol) {
  try {
    const url = `${API_BASE}/api/finnhub-sentiment?symbol=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.sentiment) return null;
    return json;
  } catch {
    return null;
  }
}

export async function fetchCompanyNews(symbol) {
  try {
    const url = `${API_BASE}/api/finnhub-news?symbol=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}
