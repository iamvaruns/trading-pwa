const API_BASE = '';

export async function getAIAnalysis(data, scores, decision, mode) {
  const prompt = `You are a professional stock market analyst writing a terminal-style briefing for ${mode} traders.

Market data snapshot:
- Decision: ${decision} | Market Quality Score: ${scores.total}%
- VIX: ${data.vix?.price?.toFixed(1)} | SPY: ${data.spy?.price?.toFixed(2)} | RSI(14): ${data.spy?.rsi14?.toFixed(0)}
- SPY vs MA200: ${data.spy?.price > data.spy?.sma200 ? 'ABOVE (+' + (((data.spy?.price - data.spy?.sma200) / data.spy?.sma200) * 100).toFixed(1) + '%)' : 'BELOW'}
- SPY vs MA50: ${data.spy?.price > data.spy?.sma50 ? 'ABOVE' : 'BELOW'} | TNX: ${data.tnx?.price?.toFixed(2)}% | DXY: ${data.dxy?.price?.toFixed(2)}
- Sectors positive: ${(data.sectors || []).filter(s => s.change1d > 0).length}/11
- Score breakdown: Vol ${scores.volatility}% | Trend ${scores.trend}% | Breadth ${scores.breadth}% | Mom ${scores.momentum}% | Macro ${scores.macro}%
- FOMC risk: ${data.fomcSoon ? 'YES — EVENT WITHIN 72H' : 'No'}
- Mode: ${mode} TRADING

Write exactly 3 sentences. Be specific about actual numbers and conditions. End with one concrete implication for position sizing or setup selection. No markdown, no bullets, plain prose only.`;

  try {
    const res = await fetch(`${API_BASE}/api/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const json = await res.json();
    return json.text || json.error || 'Analysis unavailable.';
  } catch {
    return 'AI analysis failed. Check server logs.';
  }
}
