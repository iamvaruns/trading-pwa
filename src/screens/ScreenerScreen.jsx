import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_SCREENER, DEFAULT_INDICATORS } from '../constants';
import { loadSPYData, loadStockDataWithScoring } from '../utils/data';
import { Sk } from '../components/ui/Skeleton';
import { StockCard } from '../components/screener/StockCard';
import { StockDetailView } from '../components/screener/StockDetailView';

const HORIZONS = [
  { key: 'SHORT', label: 'SHORT (1-2mo)' },
  { key: 'MEDIUM', label: 'MEDIUM (3-6mo)' },
  { key: 'LONG', label: 'LONG (1yr)' },
];

export function ScreenerScreen() {
  const { C, D, isDesktop } = useTheme();

  const [stocks, setStocks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('screener_stocks') || JSON.stringify(DEFAULT_SCREENER)); } catch { return [...DEFAULT_SCREENER]; }
  });
  const [indicators, setIndicators] = useState(() => {
    try { return JSON.parse(localStorage.getItem('screener_indicators') || JSON.stringify(DEFAULT_INDICATORS)); } catch { return { ...DEFAULT_INDICATORS }; }
  });
  const [horizon, setHorizon] = useState(() => {
    return localStorage.getItem('screener_horizon') || 'MEDIUM';
  });
  const [stockStore, setStockStore] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);

  const spyRef = useRef([]);
  const spyLoadedRef = useRef(false);

  useEffect(() => { localStorage.setItem('screener_stocks', JSON.stringify(stocks)); }, [stocks]);
  useEffect(() => { localStorage.setItem('screener_indicators', JSON.stringify(indicators)); }, [indicators]);
  useEffect(() => { localStorage.setItem('screener_horizon', horizon); }, [horizon]);

  useEffect(() => {
    if (!spyLoadedRef.current) {
      spyLoadedRef.current = true;
      loadSPYData().then(closes => { spyRef.current = closes; });
    }
  }, []);

  const fetchStock = useCallback(async (sym, h) => {
    const s = sym.toUpperCase().trim();
    setLoadingMap(m => ({ ...m, [s]: true }));
    try {
      const result = await loadStockDataWithScoring(s, spyRef.current, h || horizon);
      setStockStore(prev => ({ ...prev, [s]: result }));
    } catch {
      setStockStore(prev => ({ ...prev, [s]: { data: { symbol: s, error: true } } }));
    }
    setLoadingMap(m => ({ ...m, [s]: false }));
  }, [horizon]);

  useEffect(() => {
    stocks.forEach(s => { if (!stockStore[s]) fetchStock(s); });
  }, [stocks, fetchStock, stockStore]);

  const changeHorizon = (h) => {
    setHorizon(h);
    setStockStore({});
    stocks.forEach(s => fetchStock(s, h));
  };

  const addStock = () => {
    const sym = input.toUpperCase().trim();
    if (!sym) return;
    if (stocks.includes(sym)) {
      setError('Already in screener');
      setTimeout(() => setError(''), 2000);
      return;
    }
    setStocks(prev => [...prev, sym]);
    fetchStock(sym);
    setInput('');
    setError('');
  };

  const removeStock = (sym) => {
    setStocks(prev => prev.filter(s => s !== sym));
    setStockStore(prev => { const n = { ...prev }; delete n[sym]; return n; });
  };

  const toggleIndicator = (key) => setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  const refreshAll = () => { setStockStore({}); stocks.forEach(s => fetchStock(s)); };

  const indicatorBtns = [
    { key: 'sma20', label: 'SMA20', color: C.sma20 },
    { key: 'sma50', label: 'SMA50', color: C.sma50 },
    { key: 'sma100', label: 'SMA100', color: C.sma100 },
    { key: 'sma200', label: 'SMA200', color: C.sma200 },
    { key: 'volume', label: 'VOL', color: C.yes },
  ];

  if (selectedStock) {
    const store = stockStore[selectedStock];
    return (
      <StockDetailView
        symbol={selectedStock}
        onBack={() => setSelectedStock(null)}
        stockScore={store?.score}
        stockSignals={store?.signals}
        stockFundamentals={store?.fundamentals}
        stockRSData={store?.rsData}
        earningsDays={store?.earningsDays}
        horizon={horizon}
      />
    );
  }

  return (
    <div style={{ padding: '0 0 80px' }}>
      <div style={{
        background: C.bgPanel, borderBottom: `1px solid ${C.dimmer}`,
        padding: isDesktop ? '14px 32px' : '10px 14px', transition: 'background 0.3s',
      }}>
        <div style={{ maxWidth: D.contentMax, margin: D.contentMax ? '0 auto' : undefined }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && addStock()}
              placeholder="ADD TICKER (e.g. AAPL)"
              style={{
                flex: 1, background: C.bgPanel, border: `1px solid ${C.dimmer}`, color: C.text,
                padding: isDesktop ? '12px 16px' : '9px 12px',
                fontFamily: 'Share Tech Mono', fontSize: isDesktop ? 14 : 13, borderRadius: 4,
              }}
            />
            <button onClick={addStock} style={{
              background: C.blue, border: 'none', color: '#000',
              padding: isDesktop ? '12px 24px' : '9px 16px',
              fontFamily: 'Share Tech Mono', fontSize: isDesktop ? 13 : 12, fontWeight: 700,
              cursor: 'pointer', borderRadius: 4,
            }}>+ ADD</button>
            <button onClick={refreshAll} style={{
              background: 'none', border: `1px solid ${C.dimmer}`, color: C.dim,
              padding: isDesktop ? '12px 16px' : '9px 12px',
              fontFamily: 'Share Tech Mono', fontSize: isDesktop ? 12 : 11,
              cursor: 'pointer', borderRadius: 4,
            }}>&#x27F3; REFRESH</button>
          </div>
          {error && (
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.no, marginBottom: 8 }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {indicatorBtns.map(({ key, label, color }) => (
              <button key={key} onClick={() => toggleIndicator(key)} style={{
                background: indicators[key] ? `${color}18` : 'transparent',
                border: `1px solid ${indicators[key] ? color : C.dimmer}`,
                color: indicators[key] ? color : C.dim,
                padding: isDesktop ? '6px 14px' : '4px 10px',
                fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, cursor: 'pointer', borderRadius: 3,
                boxShadow: indicators[key] ? `0 0 6px ${color}40` : 'none',
              }}>{indicators[key] ? '\u25CF' : '\u25CB'} {label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {HORIZONS.map(h => (
              <button key={h.key} onClick={() => changeHorizon(h.key)} style={{
                background: horizon === h.key ? `${C.blue}20` : 'transparent',
                border: `1px solid ${horizon === h.key ? C.blue : C.dimmer}`,
                color: horizon === h.key ? C.blue : C.dim,
                padding: isDesktop ? '6px 14px' : '4px 10px',
                fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, cursor: 'pointer', borderRadius: 3,
              }}>{h.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: D.contentPad, maxWidth: D.contentMax, margin: D.contentMax ? '0 auto' : undefined }}>
        {stocks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.dim, fontFamily: 'Share Tech Mono', fontSize: D.rowValue }}>
            No stocks in screener. Add a ticker above.
          </div>
        )}
        <div style={isDesktop ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: D.gridGap } : {}}>
          {stocks.map(sym => {
            const store = stockStore[sym];
            const d = store?.data;
            if (loadingMap[sym] || !d) return (
              <div key={sym} style={{ marginBottom: 10 }}>
                <div style={{ background: C.bgPanel, border: `1px solid ${C.dimmer}`, borderRadius: 6, padding: D.cardPad }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.cardSymbol, color: C.text }}>{sym}</span>
                    <div style={{
                      width: 18, height: 18, border: `2px solid ${C.blue}`,
                      borderTopColor: 'transparent', borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                  </div>
                  <Sk h={14} /><Sk h={14} style={{ marginTop: 8 }} /><Sk h={14} style={{ marginTop: 8 }} />
                </div>
              </div>
            );
            if (d.error) return (
              <div key={sym} style={{
                marginBottom: 10, background: C.bgPanel, border: `1px solid ${C.no}20`,
                borderRadius: 6, padding: D.cardPad,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.cardSymbol, color: C.no }}>{sym}</span>
                  <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.dim, marginTop: 4 }}>Failed to load data</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => fetchStock(sym)} style={{
                    background: 'none', border: `1px solid ${C.dimmer}`, color: C.dim,
                    padding: '5px 12px', cursor: 'pointer',
                    fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, borderRadius: 3,
                  }}>RETRY</button>
                  <button onClick={() => removeStock(sym)} style={{
                    background: 'none', border: `1px solid ${C.dimmer}`, color: C.dim,
                    padding: '5px 12px', cursor: 'pointer',
                    fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, borderRadius: 3,
                  }}>&#x2715;</button>
                </div>
              </div>
            );
            return (
              <StockCard
                key={sym} data={d} indicators={indicators}
                onRemove={() => removeStock(sym)}
                onClick={() => setSelectedStock(sym)}
                score={store?.score}
                signals={store?.signals}
                rsData={store?.rsData}
                earningsDays={store?.earningsDays}
                horizon={horizon}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
