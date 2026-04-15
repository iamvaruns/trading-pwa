import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { searchYahooTickers } from '../../api/yahoo';

function PriceCard({ item, onRemove, C, D, isDesktop }) {
  const [hovered, setHovered] = useState(false);
  if (item.price == null) return null;

  const up = item.change1d >= 0;
  const accentColor = up ? C.yes : C.no;
  const changePct = Math.abs(item.change1d || 0).toFixed(2);
  const priceStr = item.price >= 1000
    ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : item.price.toFixed(2);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: isDesktop ? '14px 16px 12px' : '12px 14px 10px',
        background: hovered ? `${C.dimmer}40` : C.bg,
        borderRadius: 6,
        border: `1px solid ${C.dimmer}`,
        borderLeft: `3px solid ${accentColor}`,
        transition: 'background 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? `0 0 12px ${accentColor}10` : 'none',
      }}
    >
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(item.yahoo); }}
          style={{
            position: 'absolute', top: 6, right: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Share Tech Mono', fontSize: 14,
            color: hovered ? C.no : `${C.dim}80`,
            padding: '0 4px', lineHeight: 1,
            transition: 'color 0.2s',
          }}
          title={`Remove ${item.label}`}
        >×</button>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <span style={{
          fontFamily: 'Share Tech Mono', fontSize: isDesktop ? D.rowValue : D.rowLabel,
          color: C.text, fontWeight: 700, letterSpacing: '0.06em',
        }}>{item.label}</span>
        <span style={{
          fontFamily: 'Share Tech Mono',
          fontSize: isDesktop ? D.rowStatus : D.rowStatus,
          color: accentColor,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 3,
          background: `${accentColor}14`,
          letterSpacing: '0.02em',
        }}>
          {up ? '▲' : '▼'} {changePct}%
        </span>
      </div>

      <div style={{
        fontFamily: 'Share Tech Mono',
        fontSize: isDesktop ? D.cardPrice - 4 : D.cardSymbol,
        color: C.text,
        fontWeight: 600,
        marginBottom: 4,
        letterSpacing: '0.03em',
      }}>{priceStr}</div>

      <div style={{
        fontFamily: 'Share Tech Mono',
        fontSize: isDesktop ? D.rowStatus : D.rowStatus - 1,
        color: C.dim,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{item.name}</div>
    </div>
  );
}

function AddTickerInput({ onAdd, existingYahoos, C, D, isDesktop }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const doSearch = useCallback((q) => {
    if (q.length < 1) { setResults([]); return; }
    setSearching(true);
    searchYahooTickers(q, 'all').then(r => {
      setResults(r.filter(item => !existingYahoos.has(item.symbol)));
      setSearching(false);
    });
  }, [existingYahoos]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val.trim()), 300);
  };

  const handleSelect = (item) => {
    onAdd({ yahoo: item.symbol, label: item.symbol.replace(/[=^-]/g, '').slice(0, 6).toUpperCase(), name: item.name });
    setQuery('');
    setResults([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      e.target.blur();
    }
    if (e.key === 'Enter' && query.trim()) {
      const upperQ = query.trim().toUpperCase();
      if (!existingYahoos.has(upperQ)) {
        onAdd({ yahoo: upperQ, label: upperQ.replace(/[=^-]/g, '').slice(0, 6), name: upperQ });
      }
      setQuery('');
      setResults([]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setResults([]);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const typeLabel = { EQUITY: 'Stock', ETF: 'ETF', INDEX: 'Index', FUTURE: 'Futures', CRYPTOCURRENCY: 'Crypto', MUTUALFUND: 'Fund' };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', marginTop: 12 }}>
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '8px 12px',
        background: C.bg,
        border: `1px solid ${focused ? C.blue : C.dimmer}`,
        borderRadius: 6,
        transition: 'border-color 0.2s',
      }}>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.dim }}>+</span>
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Add ticker (e.g. AAPL, BTC-USD, GC=F)"
          style={{
            flex: 1, background: 'none', border: 'none',
            fontFamily: 'Share Tech Mono', fontSize: isDesktop ? D.rowValue : D.rowLabel,
            color: C.text, outline: 'none',
          }}
        />
        {searching && (
          <span style={{
            fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim,
            animation: 'pulse 0.8s infinite',
          }}>...</span>
        )}
      </div>

      {results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          zIndex: 50,
          background: C.bgPanel,
          border: `1px solid ${C.blue}40`,
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          maxHeight: 240, overflowY: 'auto',
          boxShadow: `0 8px 24px ${C.bg}cc`,
        }}>
          {results.map(item => (
            <button
              key={item.symbol}
              onClick={() => handleSelect(item)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 14px',
                background: 'none', border: 'none', borderBottom: `1px solid ${C.dimmer}40`,
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${C.dimmer}60`}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div>
                <span style={{
                  fontFamily: 'Share Tech Mono', fontSize: D.rowLabel,
                  color: C.text, fontWeight: 700, marginRight: 10,
                }}>{item.symbol}</span>
                <span style={{
                  fontFamily: 'Share Tech Mono', fontSize: D.rowStatus,
                  color: C.dim,
                }}>{item.name}</span>
              </div>
              <span style={{
                fontFamily: 'Share Tech Mono', fontSize: D.rowStatus - 1,
                color: C.blue, padding: '1px 6px',
                border: `1px solid ${C.blue}40`, borderRadius: 3,
              }}>{typeLabel[item.type] || item.exchDisp}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MarketPricesPanel({ watchlist, onAdd, onRemove }) {
  const { C, D, isDesktop } = useTheme();

  const existingYahoos = new Set((watchlist || []).map(w => w.yahoo));

  return (
    <div style={{
      background: C.bgPanel, border: `1px solid ${C.dimmer}`,
      borderRadius: 4, overflow: 'visible',
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: D.panelHdrPad,
        borderBottom: `1px solid ${C.dimmer}`,
        transition: 'border-color 0.3s',
      }}>
        <span style={{
          fontFamily: 'Share Tech Mono', fontSize: D.panelTitle,
          color: C.dim, letterSpacing: '0.12em',
        }}>MARKET PRICES</span>
        <span style={{
          fontFamily: 'Share Tech Mono', fontSize: D.rowStatus,
          color: C.dim,
        }}>{(watchlist || []).filter(w => w.price != null).length} tickers</span>
      </div>

      <div style={{ padding: D.panelBodyPad }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
          gap: isDesktop ? 12 : 10,
        }}>
          {(watchlist || []).map(item => (
            <PriceCard
              key={item.yahoo || item.label}
              item={item}
              onRemove={onRemove}
              C={C} D={D} isDesktop={isDesktop}
            />
          ))}
        </div>

        <AddTickerInput
          onAdd={onAdd}
          existingYahoos={existingYahoos}
          C={C} D={D} isDesktop={isDesktop}
        />
      </div>
    </div>
  );
}
