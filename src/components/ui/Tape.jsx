import { useTheme } from '../../context/ThemeContext';

export function Tape({ data }) {
  const { C, D } = useTheme();

  if (!data) return null;
  const items = [
    { l: 'SPY', v: data.spy?.price?.toFixed(2), c: data.spy?.change1d },
    { l: 'QQQ', v: data.qqq?.price?.toFixed(2), c: data.qqq?.change1d },
    { l: 'VIX', v: data.vix?.price?.toFixed(2), c: data.vix?.slope5d },
    { l: 'TNX', v: data.tnx?.price ? data.tnx.price.toFixed(2) + '%' : '--', c: data.tnx?.change1d },
    { l: 'DXY', v: data.dxy?.price?.toFixed(2), c: data.dxy?.change1d },
    ...(data.sectors || []).slice(0, 6).map(s => ({
      l: s.ticker, v: (s.change1d || 0).toFixed(2) + '%', c: s.change1d,
    })),
  ];

  const doubled = [...items, ...items].map((x, i) => (
    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: D.tickerGap }}>
      <span style={{ color: C.textMid, fontSize: D.tickerFont, fontWeight: 700, letterSpacing: '0.04em' }}>{x.l}</span>
      <span style={{ color: C.text, fontSize: D.tickerFont, fontWeight: 400 }}>{x.v || '--'}</span>
      {x.c != null && (
        <span style={{ fontSize: D.tickerFont, fontWeight: 700, color: x.c >= 0 ? C.yes : C.no }}>
          {x.c >= 0 ? '▲' : '▼'} {Math.abs(x.c).toFixed(2)}
        </span>
      )}
    </span>
  ));

  return (
    <div style={{
      overflow: 'hidden', height: D.tickerH,
      display: 'flex', alignItems: 'center',
      borderBottom: `1px solid ${C.dimmer}`,
      background: C.bgPanel, transition: 'background 0.3s',
    }}>
      <div style={{
        display: 'inline-flex', whiteSpace: 'nowrap',
        animation: 'ticker 50s linear infinite',
        fontFamily: 'Share Tech Mono',
      }}>{doubled}</div>
    </div>
  );
}
