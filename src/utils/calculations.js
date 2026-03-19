export function validClose(arr) {
  return (arr || []).filter(v => v != null && !isNaN(v));
}

export function calcSMA(closes, period) {
  const clean = validClose(closes);
  if (clean.length < period) return null;
  const slice = clean.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calcRSI(closes, period = 14) {
  const clean = validClose(closes);
  if (clean.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = clean.length - period; i < clean.length; i++) {
    const diff = clean[i] - clean[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  const rs = (gains / period) / (losses / period || 0.001);
  return 100 - (100 / (1 + rs));
}

export function calcSlope5d(closes) {
  const clean = validClose(closes).slice(-6);
  if (clean.length < 2) return 0;
  return clean[clean.length - 1] - clean[0];
}

export function calcPercentile(values, current) {
  const clean = validClose(values);
  if (!clean.length) return 50;
  return Math.round((clean.filter(v => v <= current).length / clean.length) * 100);
}

export function calcAvgVolume(volumes, period = 20) {
  const clean = (volumes || []).filter(v => v != null && v > 0).slice(-period);
  if (!clean.length) return 0;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

export function calcEMA(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const sma = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const ema = [sma];
  for (let i = period; i < values.length; i++) {
    ema.push(values[i] * k + ema[ema.length - 1] * (1 - k));
  }
  return ema;
}

export function calcSMASeries(closes, timestamps, period) {
  const result = [];
  const clean = [], times = [];
  for (let i = 0; i < closes.length; i++) {
    if (closes[i] != null && !isNaN(closes[i]) && timestamps[i] != null) {
      clean.push(closes[i]);
      times.push(timestamps[i]);
    }
  }
  for (let i = period - 1; i < clean.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += clean[j];
    result.push({ time: times[i], value: sum / period });
  }
  return result;
}

export function calcRSISeries(closes, timestamps, period = 14) {
  const clean = [], times = [];
  for (let i = 0; i < closes.length; i++) {
    if (closes[i] != null && !isNaN(closes[i]) && timestamps[i] != null) {
      clean.push(closes[i]);
      times.push(timestamps[i]);
    }
  }
  if (clean.length < period + 1) return [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = clean[i] - clean[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;
  const result = [{
    time: times[period],
    value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss),
  }];
  for (let i = period + 1; i < clean.length; i++) {
    const diff = clean[i] - clean[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
    result.push({
      time: times[i],
      value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss),
    });
  }
  return result;
}

export function calcMACDSeries(closes, timestamps) {
  const clean = [], times = [];
  for (let i = 0; i < closes.length; i++) {
    if (closes[i] != null && !isNaN(closes[i]) && timestamps[i] != null) {
      clean.push(closes[i]);
      times.push(timestamps[i]);
    }
  }
  if (clean.length < 26) return { macd: [], signal: [], histogram: [] };
  const ema12 = calcEMA(clean, 12);
  const ema26 = calcEMA(clean, 26);
  const macdLine = [];
  for (let j = 25; j < clean.length; j++) {
    macdLine.push({ time: times[j], value: ema12[j - 11] - ema26[j - 25] });
  }
  if (macdLine.length < 9) return { macd: macdLine, signal: [], histogram: [] };
  const macdVals = macdLine.map(m => m.value);
  const signalEma = calcEMA(macdVals, 9);
  const signal = [], histogram = [];
  for (let i = 0; i < signalEma.length; i++) {
    const mIdx = i + 8;
    const t = macdLine[mIdx].time;
    const m = macdLine[mIdx].value;
    const s = signalEma[i];
    signal.push({ time: t, value: s });
    histogram.push({ time: t, value: m - s });
  }
  return { macd: macdLine, signal, histogram };
}

export function detectSupportResistance(highs, lows, closes, timestamps) {
  const n = Math.min(highs.length, lows.length, closes.length);
  if (n < 11) return [];
  const lookback = 5;
  const lastPrice = validClose(closes).slice(-1)[0];
  if (!lastPrice) return [];
  const tolerance = lastPrice * 0.015;
  const pivots = [];
  for (let i = lookback; i < n - lookback; i++) {
    if (highs[i] == null || lows[i] == null) continue;
    let isHigh = true, isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (highs[i - j] == null || highs[i + j] == null || highs[i] <= highs[i - j] || highs[i] <= highs[i + j]) isHigh = false;
      if (lows[i - j] == null || lows[i + j] == null || lows[i] >= lows[i - j] || lows[i] >= lows[i + j]) isLow = false;
    }
    if (isHigh) pivots.push({ price: highs[i] });
    if (isLow) pivots.push({ price: lows[i] });
  }
  const used = new Set();
  const clusters = [];
  for (let i = 0; i < pivots.length; i++) {
    if (used.has(i)) continue;
    const cluster = [pivots[i]];
    used.add(i);
    for (let j = i + 1; j < pivots.length; j++) {
      if (!used.has(j) && Math.abs(pivots[j].price - pivots[i].price) <= tolerance) {
        cluster.push(pivots[j]);
        used.add(j);
      }
    }
    if (cluster.length >= 2) {
      const avg = cluster.reduce((a, p) => a + p.price, 0) / cluster.length;
      clusters.push({
        price: avg,
        touches: cluster.length,
        type: avg > lastPrice ? 'resistance' : 'support',
      });
    }
  }
  clusters.sort((a, b) => {
    const sa = a.touches / (1 + Math.abs(a.price - lastPrice) / lastPrice);
    const sb = b.touches / (1 + Math.abs(b.price - lastPrice) / lastPrice);
    return sb - sa;
  });
  return [
    ...clusters.filter(c => c.type === 'support').slice(0, 3),
    ...clusters.filter(c => c.type === 'resistance').slice(0, 3),
  ];
}

export function calcATR(highs, lows, closes, period = 14) {
  const n = Math.min(highs.length, lows.length, closes.length);
  if (n < period + 1) return null;
  const trs = [];
  for (let i = 1; i < n; i++) {
    if (highs[i] == null || lows[i] == null || closes[i - 1] == null) continue;
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  if (trs.length < period) return null;
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

export function calcBollingerBands(closes, period = 20, mult = 2) {
  const clean = validClose(closes);
  if (clean.length < period) return { upper: null, lower: null, width: null, mid: null };
  const slice = clean.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, v) => a + (v - mid) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return { upper: mid + mult * std, lower: mid - mult * std, width: (mult * std * 2) / mid, mid };
}

export function calcRelativeStrength(stockCloses, spyCloses) {
  const sc = validClose(stockCloses);
  const spy = validClose(spyCloses);
  const minLen = Math.min(sc.length, spy.length);
  if (minLen < 2) return { rs1m: 1, rs3m: 1, rs6m: 1, rs1y: 1 };
  const calcRS = (bars) => {
    if (minLen < bars + 1) return 1;
    const stockChg = (sc[sc.length - 1] - sc[sc.length - 1 - bars]) / sc[sc.length - 1 - bars];
    const spyChg = (spy[spy.length - 1] - spy[spy.length - 1 - bars]) / spy[spy.length - 1 - bars];
    if (Math.abs(spyChg) < 0.0001) return 1;
    return (1 + stockChg) / (1 + spyChg);
  };
  return { rs1m: calcRS(21), rs3m: calcRS(63), rs6m: calcRS(126), rs1y: calcRS(252) };
}

export function detectSignals(data) {
  const signals = [];
  if (!data || !data.price) return signals;

  if (data.sma50 && data.sma200 && data.sma50Prev && data.sma200Prev) {
    if (data.sma50Prev < data.sma200Prev && data.sma50 >= data.sma200) {
      signals.push({ type: 'GOLDEN_CROSS', direction: 'bullish', strength: 3, label: '50 SMA crossed above 200 SMA (Golden Cross)' });
    }
    if (data.sma50Prev > data.sma200Prev && data.sma50 <= data.sma200) {
      signals.push({ type: 'DEATH_CROSS', direction: 'bearish', strength: 3, label: '50 SMA crossed below 200 SMA (Death Cross)' });
    }
  }

  if (data.sma20 && data.sma50 && data.sma20Prev && data.sma50Prev) {
    if (data.sma20Prev < data.sma50Prev && data.sma20 >= data.sma50) {
      signals.push({ type: 'SMA_CROSS_20_50', direction: 'bullish', strength: 2, label: '20 SMA crossed above 50 SMA' });
    }
    if (data.sma20Prev > data.sma50Prev && data.sma20 <= data.sma50) {
      signals.push({ type: 'SMA_CROSS_20_50', direction: 'bearish', strength: 2, label: '20 SMA crossed below 50 SMA' });
    }
  }

  if (data.macdLine != null && data.macdSignal != null && data.macdLinePrev != null && data.macdSignalPrev != null) {
    if (data.macdLinePrev < data.macdSignalPrev && data.macdLine >= data.macdSignal) {
      signals.push({ type: 'MACD_CROSS', direction: 'bullish', strength: 2, label: 'MACD crossed above signal line' });
    }
    if (data.macdLinePrev > data.macdSignalPrev && data.macdLine <= data.macdSignal) {
      signals.push({ type: 'MACD_CROSS', direction: 'bearish', strength: 2, label: 'MACD crossed below signal line' });
    }
  }

  if (data.rsi14 != null) {
    if (data.rsi14 > 70) signals.push({ type: 'RSI_OB', direction: 'bearish', strength: 1, label: `RSI at ${data.rsi14.toFixed(0)} — overbought territory` });
    if (data.rsi14 < 30) signals.push({ type: 'RSI_OS', direction: 'bullish', strength: 1, label: `RSI at ${data.rsi14.toFixed(0)} — oversold territory` });
  }

  if (data.volume && data.avgVol20 && data.avgVol20 > 0) {
    const volRatio = data.volume / data.avgVol20;
    if (volRatio > 2) signals.push({ type: 'VOL_BREAKOUT', direction: 'neutral', strength: 2, label: `Volume ${volRatio.toFixed(1)}x above 20d average` });
  }

  if (data.srLevels && data.price) {
    for (const level of data.srLevels) {
      const dist = Math.abs(data.price - level.price) / data.price;
      if (dist < 0.02) {
        signals.push({
          type: level.type === 'support' ? 'AT_SUPPORT' : 'AT_RESISTANCE',
          direction: level.type === 'support' ? 'bullish' : 'bearish',
          strength: 2,
          label: `Price within 2% of ${level.type} at ${level.price.toFixed(2)} (${level.touches}x tested)`,
        });
      }
    }
  }

  if (data.bbWidth != null && data.bbWidthPercentile != null && data.bbWidthPercentile < 10) {
    const volSpike = data.volume && data.avgVol20 && (data.volume / data.avgVol20) > 1.5;
    if (volSpike) {
      signals.push({ type: 'BB_SQUEEZE', direction: 'neutral', strength: 2, label: 'Bollinger Band squeeze with volume expansion — breakout likely' });
    }
  }

  return signals;
}

export function processChart(result) {
  const meta = result.meta || {};
  const timestamps = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const opens = q.open || [];
  const highs = q.high || [];
  const lows = q.low || [];
  const closes = q.close || [];
  const volumes = q.volume || [];
  const clean = validClose(closes);
  const lastClose = clean[clean.length - 1];
  const prevClose = clean[clean.length - 2];
  const lastVol = (volumes || []).filter(v => v != null).slice(-1)[0] || 0;

  const ohlc = [];
  const volumeSeries = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null && !isNaN(closes[i]) && timestamps[i] != null) {
      ohlc.push({
        time: timestamps[i],
        open: opens[i] != null ? opens[i] : closes[i],
        high: highs[i] != null ? highs[i] : closes[i],
        low: lows[i] != null ? lows[i] : closes[i],
        close: closes[i],
      });
      volumeSeries.push({ time: timestamps[i], value: volumes[i] || 0 });
    }
  }

  const atr14 = calcATR(highs, lows, closes);
  const bb = calcBollingerBands(closes);

  const prevCloses = clean.length > 1 ? closes.slice(0, -1) : closes;
  const sma20Prev = calcSMA(prevCloses, 20);
  const sma50Prev = calcSMA(prevCloses, 50);
  const sma200Prev = calcSMA(prevCloses, 200);

  const macdResult = calcMACDSeries(closes, timestamps);
  let macdLine = null, macdSignal = null, macdLinePrev = null, macdSignalPrev = null;
  if (macdResult.macd.length > 1 && macdResult.signal.length > 1) {
    macdLine = macdResult.macd[macdResult.macd.length - 1].value;
    macdLinePrev = macdResult.macd[macdResult.macd.length - 2].value;
    macdSignal = macdResult.signal[macdResult.signal.length - 1].value;
    macdSignalPrev = macdResult.signal[macdResult.signal.length - 2].value;
  }

  let bbWidthPercentile = null;
  if (clean.length >= 100) {
    const widths = [];
    for (let i = 20; i <= clean.length; i++) {
      const slice = clean.slice(i - 20, i);
      const m = slice.reduce((a, b) => a + b, 0) / 20;
      const std = Math.sqrt(slice.reduce((a, v) => a + (v - m) ** 2, 0) / 20);
      widths.push((2 * 2 * std) / m);
    }
    if (widths.length > 0 && bb.width != null) {
      bbWidthPercentile = Math.round((widths.filter(w => w <= bb.width).length / widths.length) * 100);
    }
  }

  return {
    symbol: meta.symbol,
    price: lastClose || meta.regularMarketPrice,
    prevClose,
    change1d: prevClose ? ((lastClose - prevClose) / prevClose) * 100 : 0,
    volume: lastVol,
    avgVol20: calcAvgVolume(volumes, 20),
    sma20: calcSMA(closes, 20),
    sma50: calcSMA(closes, 50),
    sma100: calcSMA(closes, 100),
    sma200: calcSMA(closes, 200),
    sma20Prev, sma50Prev, sma200Prev,
    rsi14: calcRSI(closes),
    slope5d: calcSlope5d(closes),
    percentile1y: calcPercentile(closes, lastClose),
    closes: clean.slice(-60),
    timestamps: timestamps.slice(-60),
    currency: meta.currency,
    ohlc,
    volumeSeries,
    allCloses: closes,
    allTimestamps: timestamps,
    allHighs: highs,
    allLows: lows,
    atr14,
    bbUpper: bb.upper, bbLower: bb.lower, bbWidth: bb.width, bbMid: bb.mid,
    bbWidthPercentile,
    macdLine, macdSignal, macdLinePrev, macdSignalPrev,
  };
}
