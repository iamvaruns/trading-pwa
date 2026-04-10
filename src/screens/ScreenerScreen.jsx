import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_SCREENER, DEFAULT_INDICATORS } from '../constants';
import { loadSPYData, loadStockDataWithScoring } from '../utils/data';
import { searchYahooTickers } from '../api/yahoo';
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
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const spyRef = useRef([]);
  const spyLoadedRef = useRef(false);
  const searchTimerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => { localStorage.setItem('screener_stocks', JSON.stringify(stocks)); }, [stocks]);
  useEffect(() => { localStorage.setItem('screener_indicators', JSON.stringify(indicators)); }, [indicators]);
  useEffect(() => { localStorage.setItem('screener_horizon', horizon); }, [horizon]);

  useEffect(() => {
    if (!spyLoadedRef.current) {
      spyLoadedRef.current = true;
      loadSPYData().then(closes => { spyRef.current = closes; });
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = input.trim();
    if (q.length < 1) { setSearchResults([]); setShowDropdown(false); return; }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      const results = await searchYahooTickers(q);
      setSearchResults(results);
      setShowDropdown(results.length > 0);
      setSearchLoading(false);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [input]);

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

  const addStock = (symbolOverride) => {
    const sym = (symbolOverride || input).toUpperCase().trim();
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
    setShowDropdown(false);
    setSearchResults([]);
  };

  const removeStock = (sym) => {
    setStocks(prev => prev.filter(s => s !== sym));
    setStockStore(prev => { const n = { ...prev }; delete n[sym]; return n; });
  };

  const toggleIndicator = (key) => setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  const refreshAll = () => { setStockStore({}); stocks.forEach(s => fetchStock(s)); };

  const indicatorBtns = [
    { key: 'sma50', label: 'SMA50', color: C.sma50 },
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
            <div ref={dropdownRef} style={{ flex: 1, position: 'relative' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === 'Enter') { addStock(); }
                  if (e.key === 'Escape') { setShowDropdown(false); }
                }}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                placeholder="SEARCH BY NAME OR SYMBOL"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: C.bgPanel, border: `1px solid ${C.dimmer}`, color: C.text,
                  padding: isDesktop ? '12px 16px' : '9px 12px',
                  fontFamily: 'Share Tech Mono', fontSize: D.rowValue, borderRadius: 4,
                }}
              />
              {searchLoading && input.trim().length > 0 && (
                <div style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  width: 14, height: 14, border: `2px solid ${C.blue}`,
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
              )}
              {showDropdown && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: C.bgPanel, border: `1px solid ${C.dimmer}`, borderRadius: '0 0 4px 4px',
                  maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {searchResults.map(r => (
                    <div
                      key={r.symbol}
                      onClick={() => addStock(r.symbol)}
                      style={{
                        padding: isDesktop ? '10px 16px' : '8px 12px', cursor: 'pointer',
                        borderBottom: `1px solid ${C.dimmer}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${C.blue}12`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.blue, fontWeight: 700 }}>
                          {r.symbol}
                        </span>
                        <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim, marginLeft: 8 }}>
                          {r.name}
                        </span>
                      </div>
                      <span style={{
                        fontFamily: 'Share Tech Mono', fontSize: D.statusFont, color: C.dimmer,
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        {r.exchDisp}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => addStock()} style={{
              background: C.blue, border: 'none', color: '#000',
              padding: isDesktop ? '12px 24px' : '9px 16px',
              fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, fontWeight: 700,
              cursor: 'pointer', borderRadius: 4,
            }}>+ ADD</button>
            <button onClick={refreshAll} style={{
              background: 'none', border: `1px solid ${C.dimmer}`, color: C.dim,
              padding: isDesktop ? '12px 16px' : '9px 12px',
              fontFamily: 'Share Tech Mono', fontSize: D.rowStatus,
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
