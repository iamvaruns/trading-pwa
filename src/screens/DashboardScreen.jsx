import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme, scoreColor } from '../context/ThemeContext';
import { loadDashboardData } from '../utils/data';
import { getAIAnalysis } from '../api/analysis';
import {
  scoreVolatility, scoreTrend, scoreBreadth,
  scoreMomentum, scoreMacro, computeMQS, getDecision,
} from '../utils/scoring';
import { Sk } from '../components/ui/Skeleton';
import { Panel } from '../components/ui/Panel';
import { Row } from '../components/ui/Row';
import { Gauge } from '../components/ui/Gauge';
import { Badge } from '../components/ui/Badge';
import { ScoreBar } from '../components/ui/ScoreBar';
import { SectorBar } from '../components/ui/SectorBar';
import { Tape } from '../components/ui/Tape';
import { Sparkline } from '../components/charts/Sparkline';
import { SPYChart } from '../components/charts/SPYChart';

function MQRulesPanel({ C, D }) {
  const [open, setOpen] = useState(false);
  const font = { fontFamily: 'Share Tech Mono' };
  const val = { ...font, fontSize: D.rowValue, color: C.textMid, lineHeight: 1.7 };
  const hdr = { ...font, fontSize: D.scoreLabel, color: C.text, fontWeight: 700, marginTop: 10, marginBottom: 4 };

  return (
    <div style={{ marginTop: 14 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: C.bgPanel, border: `1px solid ${C.dimmer}`, borderRadius: 4,
          padding: D.panelHdrPad, width: '100%', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span style={{ ...font, fontSize: D.panelTitle, color: C.dim, letterSpacing: '0.12em' }}>HOW MQ SCORE WORKS</span>
        <span style={{ ...font, fontSize: D.panelTitle, color: C.dim }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ background: C.bgPanel, border: `1px solid ${C.dimmer}`, borderTop: 'none', borderRadius: '0 0 4px 4px', padding: D.panelBodyPad }}>
          <div style={hdr}>CATEGORY WEIGHTS</div>
          <div style={val}>
            Volatility 25% + Momentum 25% + Trend 20% + Breadth 20% + Macro 10% = MQ Score
          </div>

          <div style={hdr}>EQUAL-WEIGHT CROSSCHECK</div>
          <div style={val}>
            EW = Trend x 0.40 + Momentum x 0.35 + Breadth x 0.25
          </div>

          <div style={hdr}>FINAL DECISION</div>
          <div style={val}>
            Combined = MQ x 0.75 + EW x 0.25
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {[
              { range: '75 – 100', label: 'TRADE', desc: 'Full size, press risk', col: C.yes },
              { range: '55 – 74', label: 'CAUTION', desc: 'Half size, A+ setups only', col: C.caution },
              { range: '0 – 54', label: 'STAND DOWN', desc: 'Preserve capital', col: C.no },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ ...font, fontSize: D.rowStatus, color: C.dim, minWidth: 60 }}>{r.range}</span>
                <span style={{ ...font, fontSize: D.rowLabel, color: r.col, fontWeight: 700 }}>{r.label}</span>
                <span style={{ ...font, fontSize: D.rowStatus, color: C.dim }}>— {r.desc}</span>
              </div>
            ))}
          </div>

          <div style={hdr}>STOCK VERDICTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {[
              { range: '70 – 100', label: 'BUY', col: C.yes },
              { range: '50 – 69', label: 'HOLD', col: C.caution },
              { range: '30 – 49', label: 'SELL', col: C.no },
              { range: '0 – 29', label: 'AVOID', col: C.no },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ ...font, fontSize: D.rowStatus, color: C.dim, minWidth: 60 }}>{r.range}</span>
                <span style={{ ...font, fontSize: D.rowLabel, color: r.col, fontWeight: 700 }}>{r.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardScreen({ settings }) {
  const { C, D, isDesktop } = useTheme();

  const [data, setData] = useState(null);
  const [scores, setScores] = useState(null);
  const [decision, setDecision] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('LIVE');
  const [secondsAgo, setSecondsAgo] = useState(0);
  const timerRef = useRef(null);
  const countRef = useRef(null);

  const refresh = useCallback(async () => {
    setStatus('UPDATING');
    setError(null);
    try {
      const d = await loadDashboardData();
      const sc = {
        volatility: scoreVolatility(d),
        trend: scoreTrend(d),
        breadth: scoreBreadth(d),
        momentum: scoreMomentum(d),
        macro: scoreMacro(d),
      };
      sc.total = computeMQS(sc);
      const ew = Math.round(sc.trend * 0.4 + sc.momentum * 0.35 + sc.breadth * 0.25);
      const dec = getDecision(sc.total, ew);
      setData(d);
      setScores(sc);
      setDecision(dec);
      setLoading(false);
      setStatus('LIVE');
      setSecondsAgo(0);

      setAnalysisLoading(true);
      const ai = await getAIAnalysis(d, sc, dec, settings.mode);
      setAnalysis(ai);
      setAnalysisLoading(false);
    } catch {
      setError('Failed to load market data. Check network connection.');
      setStatus('ERROR');
      setLoading(false);
    }
  }, [settings]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    timerRef.current = setInterval(refresh, settings.refreshInterval || 45000);
    return () => clearInterval(timerRef.current);
  }, [refresh, settings.refreshInterval]);

  useEffect(() => {
    countRef.current = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(countRef.current);
  }, [data]);

  const spy = data?.spy;
  const regime = spy
    ? (spy.price > spy.sma200 && spy.price > spy.sma50 ? 'UPTREND'
      : spy.price < spy.sma200 && spy.price < spy.sma50 ? 'DOWNTREND' : 'CHOP')
    : '—';
  const regColor = { UPTREND: C.yes, DOWNTREND: C.no, CHOP: C.caution }[regime] || C.dim;
  const dec = decision || 'NO';
  const subText = {
    YES: 'Full size · Press risk',
    CAUTION: 'Half size · A+ setups only',
    NO: 'Avoid · Preserve capital',
  }[dec];

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* Status bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: isDesktop ? '10px 32px' : '8px 14px',
        background: C.bgPanel, borderBottom: `1px solid ${C.dimmer}`, transition: 'background 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'Share Tech Mono', fontSize: D.statusFont,
            padding: '3px 9px',
            border: `1px solid ${status === 'LIVE' ? C.yes : status === 'ERROR' ? C.no : C.caution}`,
            color: status === 'LIVE' ? C.yes : status === 'ERROR' ? C.no : C.caution,
            animation: status === 'UPDATING' ? 'pulse 0.8s infinite' : 'none',
          }}>{status}</span>
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.statusFont, color: C.dim }}>
            {secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'Share Tech Mono', fontSize: D.statusFont,
            padding: '3px 10px', border: `1px solid ${regColor}30`, color: regColor,
          }}>{regime}</span>
          <button onClick={refresh} disabled={status === 'UPDATING'} style={{
            background: 'none', border: `1px solid ${C.dimmer}`, color: C.dim,
            padding: '4px 12px', cursor: 'pointer',
            fontFamily: 'Share Tech Mono', fontSize: D.statusFont, borderRadius: 3,
          }}>⟳ REFRESH</button>
        </div>
      </div>

      <Tape data={data} />

      {data?.fomcSoon && (
        <div style={{
          background: 'rgba(255,184,0,0.06)', border: `1px solid ${C.caution}`,
          borderRadius: 0, padding: isDesktop ? '10px 32px' : '7px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: D.rowLabel, color: C.caution, animation: 'pulse 1.5s infinite' }}>⚠</span>
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.caution }}>
            FOMC EVENT WITHIN 72H — Reduce position size
          </span>
        </div>
      )}

      {error && (
        <div style={{ margin: '12px 14px', padding: '10px 12px', background: 'rgba(255,59,92,0.06)', border: `1px solid ${C.no}`, borderRadius: 4 }}>
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.no }}>{error}</span>
        </div>
      )}

      <div style={{ padding: D.contentPad, maxWidth: D.contentMax, margin: D.contentMax ? '0 auto' : undefined }}>
        {/* HERO */}
        <div style={{
          background: C.bgPanel, border: `1px solid ${C.dimmer}`, borderRadius: 6,
          padding: isDesktop ? '32px 24px' : '20px 16px', marginBottom: 14, textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.statusFont, color: C.dim, letterSpacing: '0.14em', marginBottom: 16 }}>
            MARKET VIEW
          </div>
          <div style={{ display: 'flex', flexDirection: D.heroDir, alignItems: 'center', justifyContent: 'center', gap: D.heroGap }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {loading ? <Sk w={200} h={52} style={{ borderRadius: 4 }} /> : <Badge decision={dec} />}
              {!loading && (
                <div style={{
                  fontFamily: 'Share Tech Mono', fontSize: D.rowLabel,
                  color: dec === 'YES' ? C.yes : dec === 'CAUTION' ? C.caution : C.no, opacity: 0.8,
                }}>{subText}</div>
              )}
            </div>
            {loading
              ? <Sk w={D.gaugeSize} h={D.gaugeSize} style={{ borderRadius: '50%' }} />
              : <Gauge score={scores?.total || 0} decision={dec} size={D.gaugeSize} />}
          </div>
        </div>

        {/* SCORE BREAKDOWN */}
        {!loading && scores && (
          <Panel title="SCORE BREAKDOWN">
            <ScoreBar label="VOLATILITY" score={scores.volatility} weight="25%" color={scoreColor(scores.volatility, C)}
              info="Based on VIX level, 5-day VIX slope, and 1-year VIX percentile. Low VIX with falling slope = favorable trading conditions." />
            <ScoreBar label="MOMENTUM" score={scores.momentum} weight="25%" color={scoreColor(scores.momentum, C)}
              info="Measures sector breadth direction: how many of 11 sectors are positive today, plus the spread between top 3 and bottom 3 performers." />
            <ScoreBar label="TREND" score={scores.trend} weight="20%" color={scoreColor(scores.trend, C)}
              info="SPY position relative to its 20/50/200-day moving averages, RSI(14) strength, and QQQ confirmation above its 50-day MA." />
            <ScoreBar label="BREADTH" score={scores.breadth} weight="20%" color={scoreColor(scores.breadth, C)}
              info="Percentage of 11 sector ETFs trading above their 50-day and 200-day moving averages. Higher participation = healthier market." />
            <ScoreBar label="MACRO" score={scores.macro} weight="10%" color={scoreColor(scores.macro, C)}
              info="10-year Treasury yield level, DXY dollar index strength, and proximity to FOMC meetings. Lower yields and stable dollar = supportive." />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.dimmer}` }}>
              <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim }}>WEIGHTED TOTAL</span>
              <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowValue, color: scoreColor(scores.total, C), fontWeight: 700 }}>{scores.total}%</span>
            </div>
          </Panel>
        )}

        {/* MQ SCORE METHODOLOGY */}
        {!loading && scores && <MQRulesPanel C={C} D={D} />}

        {/* MARKET PRICES */}
        {!loading && data?.watchlist && (
          <div style={{ marginTop: 14 }}>
            <Panel title="MARKET PRICES">
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: isDesktop ? 14 : 10 }}>
                {data.watchlist.map(item => {
                  if (item.price == null) return null;
                  const up = item.change1d >= 0;
                  return (
                    <div key={item.label} style={{
                      padding: '8px 10px', background: C.bg, borderRadius: 4,
                      border: `1px solid ${C.dimmer}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.text, fontWeight: 700 }}>{item.label}</span>
                        <span style={{
                          fontFamily: 'Share Tech Mono', fontSize: D.rowStatus,
                          color: up ? C.yes : C.no, fontWeight: 700,
                        }}>
                          {up ? '▲' : '▼'} {Math.abs(item.change1d || 0).toFixed(2)}%
                        </span>
                      </div>
                      <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowValue, color: C.textMid }}>
                        {item.price >= 1000 ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item.price.toFixed(2)}
                      </div>
                      <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus - 2, color: C.dim, marginTop: 2 }}>
                        {item.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}

        {/* DATA PANELS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: D.gridCols, gap: D.gridGap, marginTop: 14 }}>
          <Panel title="VOLATILITY" score={scores?.volatility}>
            {loading ? <><Sk h={14} /><Sk h={14} style={{ marginTop: 8 }} /><Sk h={14} style={{ marginTop: 8 }} /></> : (
              <>
                <Row label="VIX" value={data?.vix?.price?.toFixed(2) || '--'} up={data?.vix?.price < 20} status={data?.vix?.price > 25 ? 'elevated' : data?.vix?.price < 15 ? 'low' : 'neutral'} />
                <Row label="VIX 5D" value={data?.vix?.slope5d > 0 ? `+${data?.vix?.slope5d?.toFixed(2)}` : data?.vix?.slope5d?.toFixed(2)} up={data?.vix?.slope5d < 0} status={data?.vix?.slope5d > 1 ? 'risk-off' : data?.vix?.slope5d < -0.5 ? 'healthy' : 'neutral'} />
                <Row label="1Y %ILE" value={`${data?.vix?.percentile1y || '--'}th`} up={data?.vix?.percentile1y < 50} status={data?.vix?.percentile1y > 75 ? 'risk-off' : data?.vix?.percentile1y < 35 ? 'healthy' : 'neutral'} />
              </>
            )}
          </Panel>

          <Panel title="TREND" score={scores?.trend}>
            {loading ? <><Sk h={14} /><Sk h={14} style={{ marginTop: 8 }} /><Sk h={14} style={{ marginTop: 8 }} /></> : (
              <>
                <Row label="vs MA200" value={spy?.price > spy?.sma200 ? 'ABOVE' : 'BELOW'} up={spy?.price > spy?.sma200} sub={spy?.sma200 ? spy.sma200.toFixed(0) : ''} status={spy?.price > spy?.sma200 ? 'healthy' : 'risk-off'} />
                <Row label="vs MA50" value={spy?.price > spy?.sma50 ? 'ABOVE' : 'BELOW'} up={spy?.price > spy?.sma50} status={spy?.price > spy?.sma50 ? 'healthy' : 'weakening'} />
                <Row label="RSI(14)" value={spy?.rsi14?.toFixed(0)} up={spy?.rsi14 > 50} status={spy?.rsi14 > 70 ? 'elevated' : spy?.rsi14 < 30 ? 'risk-off' : spy?.rsi14 > 55 ? 'healthy' : 'neutral'} />
              </>
            )}
          </Panel>

          <Panel title="BREADTH" score={scores?.breadth}>
            {loading ? <><Sk h={14} /><Sk h={14} style={{ marginTop: 8 }} /><Sk h={14} style={{ marginTop: 8 }} /></> : (
              <>
                <Row label="Sects >50d" value={`${(data?.sectors || []).filter(s => s.price > s.sma50).length}/11`} up={(data?.sectors || []).filter(s => s.price > s.sma50).length > 6} status={(data?.sectors || []).filter(s => s.price > s.sma50).length > 7 ? 'healthy' : 'weakening'} />
                <Row label="Sects >200d" value={`${(data?.sectors || []).filter(s => s.price > s.sma200).length}/11`} up={(data?.sectors || []).filter(s => s.price > s.sma200).length > 6} status={(data?.sectors || []).filter(s => s.price > s.sma200).length > 7 ? 'healthy' : 'weakening'} />
                <Row label="Sects +ve" value={`${(data?.sectors || []).filter(s => s.change1d > 0).length}/11`} up={(data?.sectors || []).filter(s => s.change1d > 0).length > 6} status={(data?.sectors || []).filter(s => s.change1d > 0).length > 7 ? 'bullish' : 'neutral'} />
              </>
            )}
          </Panel>

          <Panel title="MACRO" score={scores?.macro}>
            {loading ? <><Sk h={14} /><Sk h={14} style={{ marginTop: 8 }} /><Sk h={14} style={{ marginTop: 8 }} /></> : (
              <>
                <Row label="10Y Yield" value={data?.tnx?.price ? `${data.tnx.price.toFixed(2)}%` : '--'} up={data?.tnx?.price < 4.5} status={data?.tnx?.price > 4.8 ? 'risk-off' : data?.tnx?.price > 4.3 ? 'weakening' : 'neutral'} />
                <Row label="DXY" value={data?.dxy?.price?.toFixed(2) || '--'} up={data?.dxy?.price < 104} status={data?.dxy?.price > 107 ? 'risk-off' : 'neutral'} />
                <Row label="FOMC Risk" value={data?.fomcSoon ? 'WITHIN 72H' : 'CLEAR'} status={data?.fomcSoon ? 'risk-off' : 'healthy'} />
              </>
            )}
          </Panel>
        </div>

        {/* SECTOR HEATMAP */}
        <div style={{ marginTop: 14 }}>
          <Panel title="SECTOR HEATMAP — 11 ETFs">
            {loading ? <Sk h={260} /> : <SectorBar sectors={data?.sectors} />}
          </Panel>
        </div>

        {/* SPY CHART */}
        {!loading && spy?.ohlc?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Panel title="SPY PRICE CHART | MA20 MA50 MA200">
              <SPYChart symbol="SPY" initialData={spy} height={D.chartH} volHeight={isDesktop ? 70 : 50} />
              <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                {[['MA20', C.sma20, spy.sma20], ['MA50', C.sma50, spy.sma50], ['MA100', C.sma100, spy.sma100], ['MA200', C.sma200, spy.sma200]].map(([l, c, v]) => (
                  <span key={l} style={{ fontFamily: 'Share Tech Mono', fontSize: D.maLegend, color: c }}>● {l}: {v?.toFixed(2) || '--'}</span>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* QQQ CHART */}
        {!loading && data?.qqq?.ohlc?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Panel title="QQQ PRICE CHART | MA20 MA50 MA200">
              <SPYChart symbol="QQQ" initialData={data.qqq} height={D.chartH} volHeight={isDesktop ? 70 : 50} />
              <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                {[['MA20', C.sma20, data.qqq.sma20], ['MA50', C.sma50, data.qqq.sma50], ['MA100', C.sma100, data.qqq.sma100], ['MA200', C.sma200, data.qqq.sma200]].map(([l, c, v]) => (
                  <span key={l} style={{ fontFamily: 'Share Tech Mono', fontSize: D.maLegend, color: c }}>● {l}: {v?.toFixed(2) || '--'}</span>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* AI ANALYSIS */}
        <div style={{ marginTop: 14, marginBottom: 14 }}>
          <Panel title="TERMINAL ANALYSIS — AI LAYER">
            {loading || analysisLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Sk h={13} /><Sk h={13} w="90%" /><Sk h={13} w="75%" />
              </div>
            ) : (
              <div className="fade-in" style={{ fontFamily: 'Share Tech Mono', fontSize: D.aiFont, color: C.textMid, lineHeight: 1.85 }}>{analysis}</div>
            )}
          </Panel>
        </div>

        <div style={{ textAlign: 'center', padding: '10px 0', borderTop: `1px solid ${C.dimmer}` }}>
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.statusFont, color: C.dimmer }}>DATA: YAHOO FINANCE · FRED · NOT FINANCIAL ADVICE</span>
        </div>
      </div>
    </div>
  );
}
