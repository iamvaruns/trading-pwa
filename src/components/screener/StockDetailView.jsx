import { useState, useEffect, useRef } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { useTheme, scoreColor } from '../../context/ThemeContext';
import { CHART_TIMEFRAMES } from '../../constants';
import { loadStockDataForChart } from '../../utils/data';
import { calcSMASeries, calcRSISeries, calcMACDSeries } from '../../utils/calculations';
import { Sk } from '../ui/Skeleton';

const HORIZON_LABELS = { SHORT: 'SHORT (1-2mo)', MEDIUM: 'MEDIUM (3-6mo)', LONG: 'LONG (1yr)' };

function SignalsPanel({ signals, C, D }) {
  if (!signals || signals.length === 0) return null;
  return (
    <div style={{ marginTop: 12, padding: '10px 14px', background: C.bgPanel, border: `1px solid ${C.dimmer}`, borderRadius: 4 }}>
      <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, letterSpacing: '0.1em', marginBottom: 8 }}>SIGNALS</div>
      {signals.map((sig, i) => {
        const borderCol = sig.direction === 'bullish' ? C.yes : sig.direction === 'bearish' ? C.no : C.caution;
        const dirLabel = sig.direction === 'bullish' ? 'BULLISH' : sig.direction === 'bearish' ? 'BEARISH' : 'CAUTION';
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0',
            borderLeft: `3px solid ${borderCol}`, paddingLeft: 10, marginBottom: 4,
          }}>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: borderCol, fontWeight: 700, minWidth: 60 }}>
              {dirLabel}
            </span>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: C.text, flex: 1 }}>
              {sig.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ScorePanel({ score, horizon, C, D }) {
  if (!score) return null;
  const verdictColor = score.verdict === 'BUY' ? C.yes : score.verdict === 'AVOID' ? C.no : C.caution;
  const size = 110;
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const fill = (score.total / 100) * circ;

  const WEIGHTS = {
    SHORT:  { technical: 0.40, momentum: 0.30, risk: 0.20, fundamental: 0.10 },
    MEDIUM: { technical: 0.30, momentum: 0.25, risk: 0.20, fundamental: 0.25 },
    LONG:   { technical: 0.20, momentum: 0.20, risk: 0.20, fundamental: 0.40 },
  };
  const w = WEIGHTS[horizon] || WEIGHTS.MEDIUM;

  const bars = [
    { label: 'TECHNICAL', score: score.technical, weight: w.technical, color: scoreColor(score.technical, C) },
    { label: 'MOMENTUM', score: score.momentum, weight: w.momentum, color: scoreColor(score.momentum, C) },
    { label: 'RISK', score: score.risk, weight: w.risk, color: scoreColor(score.risk, C) },
    { label: 'FUNDAMENTAL', score: score.fundamental, weight: w.fundamental, color: scoreColor(score.fundamental, C) },
  ];

  return (
    <div style={{ marginTop: 12, padding: '10px 14px', background: C.bgPanel, border: `1px solid ${C.dimmer}`, borderRadius: 4 }}>
      <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, letterSpacing: '0.1em', marginBottom: 10 }}>STOCK SCORE</div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.dimmer} strokeWidth={7} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={verdictColor} strokeWidth={7}
              strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 6px ${verdictColor})` }} />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 24, color: verdictColor, lineHeight: 1 }}>{score.total}</span>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, marginTop: 2 }}>SCORE</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          {bars.map(b => (
            <div key={b.label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim }}>
                  {b.label} <span style={{ color: C.dimmer }}>x{b.weight}</span>
                </span>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: b.color }}>{Math.round(b.score)}%</span>
              </div>
              <div style={{ height: 4, background: C.dimmer, borderRadius: 2 }}>
                <div style={{
                  height: '100%', width: `${b.score}%`, background: b.color,
                  borderRadius: 2, transition: 'width 1s ease', boxShadow: `0 0 4px ${b.color}80`,
                }} />
              </div>
            </div>
          ))}
          <div style={{
            fontFamily: 'Share Tech Mono', fontSize: 10, marginTop: 6,
            padding: '4px 12px', display: 'inline-block', borderRadius: 3,
            background: `${verdictColor}18`, border: `1px solid ${verdictColor}60`, color: verdictColor,
            fontWeight: 700, letterSpacing: '0.1em',
          }}>{score.verdict}</div>
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, marginLeft: 8 }}>
            Based on {HORIZON_LABELS[horizon] || horizon} horizon
          </span>
        </div>
      </div>
    </div>
  );
}

function RiskCalculator({ data, C, D, isDesktop, candleSeriesRef }) {
  const [accountSize, setAccountSize] = useState(() => {
    try { return Number(localStorage.getItem('risk_account_size')) || 0; } catch { return 0; }
  });
  const [riskPct, setRiskPct] = useState(() => {
    try { return Number(localStorage.getItem('risk_pct')) || 1; } catch { return 1; }
  });
  const priceLinesRef = useRef([]);

  if (!data || !data.price || !data.atr14) return null;

  const entry = data.price;
  const stopLoss = entry - 2 * data.atr14;
  const riskPerShare = entry - stopLoss;
  const hasAccount = accountSize > 0;
  const riskAmount = hasAccount ? accountSize * (riskPct / 100) : 0;
  const shares = hasAccount && riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
  const positionValue = shares * entry;

  const nearestResistance = data.srLevels?.find(l => l.type === 'resistance' && l.price > entry);
  const target = nearestResistance ? nearestResistance.price : entry + 4 * data.atr14;
  const reward = target - entry;
  const rrRatio = riskPerShare > 0 ? reward / riskPerShare : 0;
  const rrColor = rrRatio >= 2 ? C.yes : rrRatio >= 1 ? C.caution : C.no;

  const saveAccount = (val) => {
    const num = Math.max(0, Number(val) || 0);
    setAccountSize(num);
    localStorage.setItem('risk_account_size', String(num));
  };

  const saveRisk = (val) => {
    setRiskPct(val);
    localStorage.setItem('risk_pct', String(val));
  };

  useEffect(() => {
    const series = candleSeriesRef?.current;
    if (!series) return;
    priceLinesRef.current.forEach(line => {
      try { series.removePriceLine(line); } catch { /* ignore */ }
    });
    const lines = [];
    lines.push(series.createPriceLine({
      price: stopLoss, color: C.no, lineWidth: 1, lineStyle: LineStyle.Dashed,
      axisLabelVisible: true, title: 'STOP',
    }));
    lines.push(series.createPriceLine({
      price: target, color: C.yes, lineWidth: 1, lineStyle: LineStyle.Dashed,
      axisLabelVisible: true, title: 'TARGET',
    }));
    priceLinesRef.current = lines;
    return () => {
      lines.forEach(line => {
        try { series.removePriceLine(line); } catch { /* ignore */ }
      });
    };
  }, [stopLoss, target, candleSeriesRef, C]);

  return (
    <div style={{ marginTop: 12, padding: '10px 14px', background: C.bgPanel, border: `1px solid ${C.dimmer}`, borderRadius: 4 }}>
      <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, letterSpacing: '0.1em', marginBottom: 4 }}>RISK CALCULATOR</div>
      <div style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: C.dim, marginBottom: 10, opacity: 0.7 }}>
        Enter your account size and risk tolerance to calculate position sizing.
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: C.text }}>YOUR ACCOUNT SIZE ($)</label>
          <input
            type="number"
            value={accountSize || ''}
            placeholder="e.g. 25000"
            onChange={e => saveAccount(e.target.value)}
            style={{
              background: C.bg, border: `1px solid ${hasAccount ? C.blue : C.dimmer}`, color: C.text,
              padding: '8px 12px', fontFamily: 'Share Tech Mono', fontSize: 13,
              borderRadius: 3, width: 160,
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: C.text }}>RISK PER TRADE</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0.5, 1, 2].map(pct => (
              <button key={pct} onClick={() => saveRisk(pct)} style={{
                background: riskPct === pct ? `${C.blue}20` : 'transparent',
                border: `1px solid ${riskPct === pct ? C.blue : C.dimmer}`,
                color: riskPct === pct ? C.blue : C.dim,
                padding: '5px 10px', fontFamily: 'Share Tech Mono', fontSize: 11,
                cursor: 'pointer', borderRadius: 3,
              }}>{pct}%</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 10 }}>
        {[
          { label: 'ATR(14)', value: data.atr14.toFixed(2), color: C.text },
          { label: 'STOP LOSS', value: `$${stopLoss.toFixed(2)}`, color: C.no },
          { label: 'TARGET', value: `$${target.toFixed(2)}`, color: C.yes },
          { label: 'R:R RATIO', value: `${rrRatio.toFixed(1)}:1`, color: rrColor },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: 13, color: item.color, fontWeight: 700 }}>{item.value}</div>
          </div>
        ))}
      </div>
      {hasAccount ? (
        <>
          <div style={{ borderTop: `1px solid ${C.dimmer}`, marginTop: 10, paddingTop: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 10 }}>
              {[
                { label: 'POSITION SIZE', value: `${shares.toLocaleString()} shares`, color: C.text },
                { label: 'POSITION VALUE', value: `$${positionValue.toLocaleString()}`, color: C.text },
                { label: 'MAX LOSS', value: `$${riskAmount.toFixed(0)}`, color: C.caution },
                { label: 'STOP DISTANCE', value: `$${riskPerShare.toFixed(2)}`, color: C.dim },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontFamily: 'Share Tech Mono', fontSize: 13, color: item.color, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, marginTop: 8, fontStyle: 'italic', opacity: 0.7 }}>
            Position sized so that hitting the stop loss costs at most {riskPct}% of your account (${riskAmount.toFixed(0)}).
          </div>
        </>
      ) : (
        <div style={{
          fontFamily: 'Share Tech Mono', fontSize: 11, color: C.dim, textAlign: 'center',
          padding: '14px 0', marginTop: 10, borderTop: `1px solid ${C.dimmer}`,
        }}>
          Set your account size above to see position sizing.
        </div>
      )}
    </div>
  );
}

function AIAnalysisPanel({ symbol, data, score, signals, rsData, fundamentals, horizon, C, D }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    const rsKey = horizon === 'SHORT' ? 'rs1m' : horizon === 'LONG' ? 'rs1y' : 'rs3m';
    const sigList = (signals || []).map(s => s.label).join('; ');
    const srList = (data?.srLevels || []).map(l => `${l.type} at ${l.price.toFixed(2)}`).join(', ');
    const prompt = `You are a professional stock analyst. Analyze ${symbol} for a ${HORIZON_LABELS[horizon] || horizon} investment horizon.

Stock data:
- Price: ${data?.price?.toFixed(2)} | Change: ${data?.change1d?.toFixed(2)}%
- SMA20: ${data?.sma20?.toFixed(2)} | SMA50: ${data?.sma50?.toFixed(2)} | SMA200: ${data?.sma200?.toFixed(2)}
- RSI(14): ${data?.rsi14?.toFixed(0)} | ATR(14): ${data?.atr14?.toFixed(2)}
- MACD: ${data?.macdLine?.toFixed(3) || 'N/A'} | Signal: ${data?.macdSignal?.toFixed(3) || 'N/A'}
- RS vs SPY: ${rsData?.[rsKey]?.toFixed(2) || 'N/A'}
- Signals: ${sigList || 'None'}
- S/R Levels: ${srList || 'None'}
- Bollinger: Upper ${data?.bbUpper?.toFixed(2) || 'N/A'} / Lower ${data?.bbLower?.toFixed(2) || 'N/A'}
${fundamentals ? `- Forward P/E: ${fundamentals.forwardPE || 'N/A'} | Revenue Growth: ${fundamentals.revenueGrowth ? (fundamentals.revenueGrowth * 100).toFixed(1) + '%' : 'N/A'} | Profit Margin: ${fundamentals.profitMargins ? (fundamentals.profitMargins * 100).toFixed(1) + '%' : 'N/A'}` : '- Fundamentals: N/A'}
- Score: ${score?.total || 'N/A'}/100 (${score?.verdict || 'N/A'}) — Tech: ${score?.technical || 'N/A'}, Mom: ${score?.momentum || 'N/A'}, Risk: ${score?.risk || 'N/A'}, Fund: ${score?.fundamental || 'N/A'}

Write exactly 3 sentences. Be specific about numbers and conditions. End with one concrete recommendation for this holding period. Plain prose only, no markdown.`;

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      setAnalysis(json.text || json.error || 'Analysis unavailable.');
    } catch {
      setAnalysis('AI analysis failed. Check server logs.');
    }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 12, padding: '10px 14px', background: C.bgPanel, border: `1px solid ${C.dimmer}`, borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: analysis ? 10 : 0 }}>
        <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, letterSpacing: '0.1em' }}>AI ANALYSIS</div>
        <button onClick={runAnalysis} disabled={loading} style={{
          background: loading ? C.dimmer : `${C.blue}20`, border: `1px solid ${C.blue}`,
          color: C.blue, padding: '5px 14px', fontFamily: 'Share Tech Mono', fontSize: 10,
          cursor: loading ? 'default' : 'pointer', borderRadius: 3, opacity: loading ? 0.6 : 1,
        }}>{loading ? 'ANALYZING...' : 'RUN AI ANALYSIS'}</button>
      </div>
      {analysis && (
        <div style={{
          fontFamily: 'Share Tech Mono', fontSize: 11, color: C.text, lineHeight: 1.6,
          padding: '8px 12px', background: C.bg, borderRadius: 3, border: `1px solid ${C.dimmer}`,
        }}>{analysis}</div>
      )}
    </div>
  );
}

export function StockDetailView({
  symbol, onBack, stockScore, stockSignals, stockFundamentals,
  stockRSData, earningsDays, horizon,
}) {
  const { C, D, isDesktop } = useTheme();

  const mainRef = useRef(null);
  const volRef = useRef(null);
  const rsiRef = useRef(null);
  const macdRef = useRef(null);
  const wrapperRef = useRef(null);
  const chartsRef = useRef([]);
  const syncingRef = useRef(false);
  const candleSeriesRef = useRef(null);

  const [timeframe, setTimeframe] = useState('1Y');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [smaToggles, setSmaToggles] = useState({ 20: true, 50: true, 100: false, 200: true });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const tf = CHART_TIMEFRAMES.find(t => t.key === timeframe);
    loadStockDataForChart(symbol, tf.range, tf.interval, timeframe === '1H')
      .then(data => { if (!cancelled) { setChartData(data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError('Failed to load chart data'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!chartData || !mainRef.current || !volRef.current || !rsiRef.current || !macdRef.current) return;

    chartsRef.current.forEach(c => { try { c.remove(); } catch { /* already removed */ } });
    chartsRef.current = [];
    candleSeriesRef.current = null;
    mainRef.current.innerHTML = '';
    volRef.current.innerHTML = '';
    rsiRef.current.innerHTML = '';
    macdRef.current.innerHTML = '';

    const isIntraday = timeframe === '1H' || timeframe === '1D';
    const mkOpts = (h) => ({
      width: wrapperRef.current?.clientWidth || 600,
      height: h,
      layout: { background: { type: 'solid', color: C.bg }, textColor: C.dim, fontFamily: 'Share Tech Mono', fontSize: 10 },
      grid: { vertLines: { color: C.dimmer }, horzLines: { color: C.dimmer } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: C.dimmer },
      timeScale: { borderColor: C.dimmer, timeVisible: isIntraday, secondsVisible: false },
    });

    const mainH = isDesktop ? 400 : 280;
    const volH = isDesktop ? 90 : 70;
    const subH = isDesktop ? 110 : 90;

    const mainChart = createChart(mainRef.current, mkOpts(mainH));
    const candleSeries = mainChart.addCandlestickSeries({
      upColor: C.yes, downColor: C.no,
      borderUpColor: C.yes, borderDownColor: C.no,
      wickUpColor: C.yes, wickDownColor: C.no,
    });
    candleSeries.setData(chartData.ohlc);
    candleSeriesRef.current = candleSeries;

    const smaColors = { 20: C.sma20, 50: C.sma50, 100: C.sma100, 200: C.sma200 };
    [20, 50, 100, 200].forEach(p => {
      if (smaToggles[p]) {
        const smaData = calcSMASeries(chartData.allCloses, chartData.allTimestamps, p);
        if (smaData.length > 0) {
          const s = mainChart.addLineSeries({ color: smaColors[p], lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          s.setData(smaData);
        }
      }
    });

    if (chartData.srLevels) {
      chartData.srLevels.forEach(level => {
        candleSeries.createPriceLine({
          price: level.price,
          color: level.type === 'support' ? C.yes : C.no,
          lineWidth: 1, lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `${level.type === 'support' ? 'S' : 'R'} ${level.price.toFixed(2)}`,
        });
      });
    }

    const volChart = createChart(volRef.current, {
      ...mkOpts(volH),
      rightPriceScale: { borderColor: C.dimmer, scaleMargins: { top: 0.1, bottom: 0 } },
    });
    const volSeries = volChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false });
    const volData = chartData.volumeSeries.map((v, i) => {
      const candle = chartData.ohlc[i];
      const isUp = candle && candle.close >= candle.open;
      return { ...v, color: isUp ? C.yes + '50' : C.no + '50' };
    });
    volSeries.setData(volData);

    const rsiChart = createChart(rsiRef.current, {
      ...mkOpts(subH),
      rightPriceScale: { borderColor: C.dimmer, scaleMargins: { top: 0.08, bottom: 0.08 } },
    });
    const rsiSeries = rsiChart.addLineSeries({ color: C.blue, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
    const rsiData = calcRSISeries(chartData.allCloses, chartData.allTimestamps);
    rsiSeries.setData(rsiData);
    rsiSeries.createPriceLine({ price: 70, color: C.no + '60', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: '' });
    rsiSeries.createPriceLine({ price: 30, color: C.yes + '60', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: '' });

    const macdChart = createChart(macdRef.current, mkOpts(subH));
    const macdData = calcMACDSeries(chartData.allCloses, chartData.allTimestamps);
    if (macdData.histogram.length > 0) {
      const histSeries = macdChart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
      histSeries.setData(macdData.histogram.map(h => ({ ...h, color: h.value >= 0 ? C.yes + '99' : C.no + '99' })));
      const macdLineSeries = macdChart.addLineSeries({ color: C.blue, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      macdLineSeries.setData(macdData.macd);
      const signalSeries = macdChart.addLineSeries({ color: C.sma20, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
      signalSeries.setData(macdData.signal);
    }

    const allCharts = [mainChart, volChart, rsiChart, macdChart];
    chartsRef.current = allCharts;

    allCharts.forEach((chart, idx) => {
      chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (syncingRef.current || !range) return;
        syncingRef.current = true;
        allCharts.forEach((other, oidx) => {
          if (idx !== oidx) try { other.timeScale().setVisibleLogicalRange(range); } catch { /* ignore */ }
        });
        syncingRef.current = false;
      });
    });

    allCharts.forEach(c => c.timeScale().fitContent());

    const ro = new ResizeObserver(() => {
      const w = wrapperRef.current?.clientWidth;
      if (w) allCharts.forEach(c => { try { c.applyOptions({ width: w }); } catch { /* ignore */ } });
    });
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    return () => {
      ro.disconnect();
      allCharts.forEach(c => { try { c.remove(); } catch { /* ignore */ } });
      chartsRef.current = [];
      candleSeriesRef.current = null;
    };
  }, [chartData, smaToggles, isDesktop, C]);

  const toggleSMA = (p) => setSmaToggles(prev => ({ ...prev, [p]: !prev[p] }));
  const smaColors = { 20: C.sma20, 50: C.sma50, 100: C.sma100, 200: C.sma200 };

  return (
    <div className="fade-in" style={{ padding: '0 0 80px' }}>
      <div style={{ background: C.bgPanel, borderBottom: `1px solid ${C.dimmer}`, padding: isDesktop ? '12px 32px' : '10px 14px' }}>
        <div style={{ maxWidth: D.contentMax, margin: D.contentMax ? '0 auto' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={onBack} style={{
              background: 'none', border: `1px solid ${C.dimmer}`, color: C.dim,
              padding: '6px 12px', cursor: 'pointer', fontFamily: 'Share Tech Mono', fontSize: 12, borderRadius: 3,
            }}>&larr; BACK</button>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: isDesktop ? 22 : 18, color: C.text, fontWeight: 700 }}>{symbol}</span>
            {chartData && (
              <>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: isDesktop ? 18 : 14, color: C.text }}>{chartData.price?.toFixed(2)}</span>
                <span style={{
                  fontFamily: 'Share Tech Mono', fontSize: isDesktop ? 14 : 12,
                  color: chartData.change1d >= 0 ? C.yes : C.no,
                }}>{chartData.change1d >= 0 ? '+' : ''}{chartData.change1d?.toFixed(2)}%</span>
              </>
            )}
            {stockScore && (
              <span style={{
                fontFamily: 'Share Tech Mono', fontSize: 12, fontWeight: 700,
                padding: '3px 12px', borderRadius: 10,
                background: `${stockScore.verdict === 'BUY' ? C.yes : stockScore.verdict === 'AVOID' ? C.no : C.caution}18`,
                border: `1px solid ${stockScore.verdict === 'BUY' ? C.yes : stockScore.verdict === 'AVOID' ? C.no : C.caution}60`,
                color: stockScore.verdict === 'BUY' ? C.yes : stockScore.verdict === 'AVOID' ? C.no : C.caution,
              }}>{stockScore.total} {stockScore.verdict}</span>
            )}
            {earningsDays != null && (
              <span style={{
                fontFamily: 'Share Tech Mono', fontSize: 10,
                padding: '3px 10px', borderRadius: 3,
                background: `${C.caution}18`, border: `1px solid ${C.caution}40`, color: C.caution,
              }}>EARNINGS IN {earningsDays}d</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {CHART_TIMEFRAMES.map(tf => (
              <button key={tf.key} onClick={() => setTimeframe(tf.key)} style={{
                background: timeframe === tf.key ? C.blue + '20' : 'transparent',
                border: `1px solid ${timeframe === tf.key ? C.blue : C.dimmer}`,
                color: timeframe === tf.key ? C.blue : C.dim,
                padding: isDesktop ? '6px 16px' : '5px 12px',
                fontFamily: 'Share Tech Mono', fontSize: isDesktop ? 12 : 11,
                cursor: 'pointer', borderRadius: 3,
              }}>{tf.key}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[20, 50, 100, 200].map(p => (
              <button key={p} onClick={() => toggleSMA(p)} style={{
                background: smaToggles[p] ? `${smaColors[p]}18` : 'transparent',
                border: `1px solid ${smaToggles[p] ? smaColors[p] : C.dimmer}`,
                color: smaToggles[p] ? smaColors[p] : C.dim,
                padding: isDesktop ? '4px 12px' : '3px 8px',
                fontFamily: 'Share Tech Mono', fontSize: isDesktop ? 11 : 10,
                cursor: 'pointer', borderRadius: 3,
                boxShadow: smaToggles[p] ? `0 0 6px ${smaColors[p]}40` : 'none',
              }}>{smaToggles[p] ? '\u25CF' : '\u25CB'} SMA{p}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: isDesktop ? '14px 32px' : '10px 14px', maxWidth: D.contentMax, margin: D.contentMax ? '0 auto' : undefined }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Sk h={isDesktop ? 400 : 280} />
            <Sk h={isDesktop ? 90 : 70} />
            <Sk h={isDesktop ? 110 : 90} />
            <Sk h={isDesktop ? 110 : 90} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.no, fontFamily: 'Share Tech Mono' }}>{error}</div>
        ) : (
          <div ref={wrapperRef}>
            <div style={{ marginBottom: 2 }}>
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, letterSpacing: '0.1em', marginBottom: 4 }}>PRICE</div>
              <div ref={mainRef} />
            </div>
            <div style={{ marginBottom: 2 }}>
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, letterSpacing: '0.1em', marginBottom: 4 }}>VOLUME</div>
              <div ref={volRef} />
            </div>
            <div style={{ marginBottom: 2 }}>
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, letterSpacing: '0.1em', marginBottom: 4 }}>RSI (14)</div>
              <div ref={rsiRef} />
            </div>
            <div style={{ marginBottom: 2 }}>
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, letterSpacing: '0.1em', marginBottom: 4 }}>MACD (12, 26, 9)</div>
              <div ref={macdRef} />
            </div>

            {chartData?.srLevels?.length > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: C.bgPanel, border: `1px solid ${C.dimmer}`, borderRadius: 4 }}>
                <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, letterSpacing: '0.1em', marginBottom: 8 }}>SUPPORT & RESISTANCE</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {chartData.srLevels.map((l, i) => (
                    <span key={i} style={{
                      fontFamily: 'Share Tech Mono', fontSize: 11,
                      color: l.type === 'support' ? C.yes : C.no,
                    }}>
                      {l.type === 'support' ? 'S' : 'R'}: {l.price.toFixed(2)} ({l.touches}x)
                    </span>
                  ))}
                </div>
              </div>
            )}

            <SignalsPanel signals={stockSignals} C={C} D={D} />
            <ScorePanel score={stockScore} horizon={horizon} C={C} D={D} />
            <RiskCalculator data={chartData} C={C} D={D} isDesktop={isDesktop} candleSeriesRef={candleSeriesRef} />
            <AIAnalysisPanel
              symbol={symbol} data={chartData}
              score={stockScore} signals={stockSignals}
              rsData={stockRSData} fundamentals={stockFundamentals}
              horizon={horizon} C={C} D={D}
            />
          </div>
        )}
      </div>
    </div>
  );
}
