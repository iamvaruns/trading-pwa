const API_BASE = '';

export async function fetchFRED(seriesId) {
  try {
    const apiUrl = `${API_BASE}/api/fred?series=${seriesId}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    return json?.observations
      ?.filter(o => o.value !== '.')
      .map(o => parseFloat(o.value)) || null;
  } catch {
    return null;
  }
}
