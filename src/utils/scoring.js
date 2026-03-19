function clamp(v) {
  return Math.max(0, Math.min(100, v));
}

export function scoreVolatility(d) {
  let s = 100;
  const vix = d.vix?.price || 20;
  if (vix > 35) s -= 60;
  else if (vix > 25) s -= 40;
  else if (vix > 20) s -= 20;
  else if (vix <= 13) s += 5;
  const slope = d.vix?.slope5d || 0;
  if (slope > 2) s -= 20;
  else if (slope > 0.5) s -= 10;
  else if (slope < -1) s += 8;
  return clamp(s);
}

export function scoreTrend(d) {
  let s = 50;
  const spy = d.spy || {};
  if (spy.price > spy.sma200) s += 15; else s -= 15;
  if (spy.price > spy.sma50) s += 12; else s -= 12;
  if (spy.price > spy.sma20) s += 8; else s -= 8;
  const rsi = spy.rsi14 || 50;
  if (rsi > 60 && rsi < 75) s += 10;
  else if (rsi > 50) s += 5;
  else if (rsi < 40) s -= 10;
  else if (rsi < 30) s -= 15;
  const qqq = d.qqq || {};
  if (qqq.price > qqq.sma50) s += 5; else s -= 5;
  return clamp(s);
}

export function scoreBreadth(d) {
  const sectorAbove50 = (d.sectors || []).filter(s => s.price > s.sma50).length;
  const sectorAbove200 = (d.sectors || []).filter(s => s.price > s.sma200).length;
  const total = (d.sectors || []).length || 1;
  const pct50 = (sectorAbove50 / total) * 100;
  const pct200 = (sectorAbove200 / total) * 100;
  return clamp(pct50 * 0.5 + pct200 * 0.5);
}

export function scoreMomentum(d) {
  const sects = d.sectors || [];
  if (!sects.length) return 50;
  const changes = sects.map(s => s.change1d || 0).sort((a, b) => b - a);
  const posCount = changes.filter(c => c > 0).length;
  const top3avg = changes.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const bot3avg = changes.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const spread = top3avg - bot3avg;
  let s = (posCount / changes.length) * 70;
  if (spread > 2) s += 20;
  else if (spread > 1) s += 10;
  else if (spread < 0) s -= 10;
  return clamp(s);
}

export function scoreMacro(d) {
  let s = 60;
  const tnx = d.tnx?.price || 4.3;
  if (tnx > 5.0) s -= 25;
  else if (tnx > 4.5) s -= 12;
  else if (tnx < 3.5) s += 10;
  const dxy = d.dxy?.price || 103;
  if (dxy > 107) s -= 10;
  else if (dxy < 99) s += 8;
  if (d.fomcSoon) s -= 10;
  return clamp(s);
}

export function computeMQS(scores) {
  return Math.round(
    scores.volatility * 0.25 +
    scores.momentum * 0.25 +
    scores.trend * 0.20 +
    scores.breadth * 0.20 +
    scores.macro * 0.10
  );
}

export function getDecision(mqs, ew) {
  const combined = mqs * 0.75 + ew * 0.25;
  if (combined >= 75) return 'YES';
  if (combined >= 55) return 'CAUTION';
  return 'NO';
}

const HORIZON_WEIGHTS = {
  SHORT:  { technical: 0.40, momentum: 0.30, risk: 0.20, fundamental: 0.10 },
  MEDIUM: { technical: 0.30, momentum: 0.25, risk: 0.20, fundamental: 0.25 },
  LONG:   { technical: 0.20, momentum: 0.20, risk: 0.20, fundamental: 0.40 },
};

function scoreTechnical(d, horizon) {
  let s = 50;
  if (d.sma200 && d.sma50 && d.sma20) {
    if (d.price > d.sma200 && d.price > d.sma50 && d.price > d.sma20) s += 30;
    else if (d.price > d.sma200 && d.price > d.sma50) s += 20;
    else if (d.price > d.sma200) s += 10;
    else s -= 20;
  }
  if (d.rsi14 != null) {
    if (d.rsi14 >= 40 && d.rsi14 <= 60) s += 15;
    else if (d.rsi14 < 30) s += (horizon === 'SHORT' ? 20 : 5);
    else if (d.rsi14 > 70) s -= 10;
    else if (d.rsi14 > 50) s += 5;
  }
  if (d.macdLine != null && d.macdSignal != null) {
    if (d.macdLine > d.macdSignal) s += 15;
    else s -= 10;
  }
  if (d.bbLower != null && d.price && d.price <= d.bbLower) {
    s += (horizon === 'SHORT' ? 10 : 5);
  }
  return clamp(s);
}

function scoreMomentumStock(d, rs, horizon) {
  let s = 50;
  const rsKey = horizon === 'SHORT' ? 'rs1m' : horizon === 'MEDIUM' ? 'rs3m' : 'rs1y';
  const rsVal = rs?.[rsKey] || 1;
  if (rsVal > 1.2) s += 25;
  else if (rsVal > 1.0) s += 10;
  else if (rsVal > 0.8) s += 0;
  else s -= 15;

  if (d.slope5d != null) {
    if (d.slope5d > 0) s += 10;
    else s -= 5;
  }

  if (d.volume && d.avgVol20 && d.avgVol20 > 0) {
    const ratio = d.volume / d.avgVol20;
    if (ratio > 1.5) s += 10;
    else if (ratio < 0.5) s -= 5;
  }
  return clamp(s);
}

function scoreRisk(d) {
  let s = 70;
  if (d.atr14 && d.price) {
    const atrPct = d.atr14 / d.price;
    if (atrPct < 0.02) s += 20;
    else if (atrPct < 0.03) s += 10;
    else if (atrPct > 0.04) s -= 15;
  }
  if (d.srLevels && d.price) {
    const nearSupport = d.srLevels.find(l => l.type === 'support' && Math.abs(d.price - l.price) / d.price < 0.05);
    const nearResistance = d.srLevels.find(l => l.type === 'resistance' && Math.abs(d.price - l.price) / d.price < 0.05);
    if (nearSupport) s += 15;
    if (nearResistance) s -= 10;
  }
  return clamp(s);
}

function scoreFundamental(fund) {
  if (!fund) return 50;
  let s = 50;
  if (fund.forwardPE != null) {
    if (fund.forwardPE < 15) s += 25;
    else if (fund.forwardPE < 25) s += 10;
    else if (fund.forwardPE > 40) s -= 15;
  }
  if (fund.revenueGrowth != null) {
    if (fund.revenueGrowth > 0.20) s += 20;
    else if (fund.revenueGrowth > 0.10) s += 10;
    else if (fund.revenueGrowth < 0) s -= 15;
  }
  if (fund.profitMargins != null) {
    if (fund.profitMargins > 0.20) s += 15;
    else if (fund.profitMargins > 0.10) s += 5;
    else if (fund.profitMargins < 0) s -= 10;
  }
  if (fund.earningsDate) {
    const daysToEarnings = (fund.earningsDate * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysToEarnings > 0 && daysToEarnings < 14) s -= 15;
  }
  return clamp(s);
}

export function scoreStock(data, fundamentals, rsData, horizon = 'MEDIUM') {
  const weights = HORIZON_WEIGHTS[horizon] || HORIZON_WEIGHTS.MEDIUM;
  const technical = scoreTechnical(data, horizon);
  const momentum = scoreMomentumStock(data, rsData, horizon);
  const risk = scoreRisk(data);
  const fundamental = scoreFundamental(fundamentals);
  const total = Math.round(
    technical * weights.technical +
    momentum * weights.momentum +
    risk * weights.risk +
    fundamental * weights.fundamental
  );
  let verdict = 'HOLD';
  if (total >= 70) verdict = 'BUY';
  else if (total < 50) verdict = 'AVOID';
  return { total, technical, momentum, risk, fundamental, verdict };
}
