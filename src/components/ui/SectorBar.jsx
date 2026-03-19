import { useTheme } from '../../context/ThemeContext';
import { Sk } from './Skeleton';

export function SectorBar({ sectors }) {
  const { C, D } = useTheme();

  if (!sectors?.length) return <Sk h={200} />;
  const sorted = [...sectors].sort((a, b) => b.change1d - a.change1d);
  const max = Math.max(...sorted.map(s => Math.abs(s.change1d || 0)), 0.01);

  return (
    <div>
      {sorted.map((s, i) => {
        const pct = Math.abs(s.change1d || 0) / max;
        const pos = s.change1d >= 0;
        const col = pos ? C.yes : C.no;
        const isTop = i < 3;
        const isBot = i >= sorted.length - 3;
        return (
          <div key={s.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{
              fontFamily: 'Share Tech Mono', fontSize: D.sectorLabel,
              width: 42, textAlign: 'right',
              color: isTop ? C.yes : isBot ? C.no : C.dim,
              fontWeight: isTop || isBot ? 700 : 400,
            }}>{s.ticker}</span>
            <div style={{
              flex: 1, height: D.sectorBarH, background: C.dimmer,
              borderRadius: 1, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${pct * 100}%`,
                background: col,
                opacity: 0.65 + pct * 0.35,
                boxShadow: isTop || isBot ? `0 0 6px ${col}` : 'none',
              }} />
            </div>
            <span style={{
              fontFamily: 'Share Tech Mono', fontSize: D.sectorPct,
              color: pos ? C.yes : C.no, width: 52, textAlign: 'right',
            }}>{pos ? '+' : ''}{(s.change1d || 0).toFixed(2)}%</span>
          </div>
        );
      })}
    </div>
  );
}
