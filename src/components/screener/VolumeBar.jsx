import { useTheme } from '../../context/ThemeContext';

export function VolumeBar({ volume, avgVol, visible }) {
  const { C, D } = useTheme();

  if (!visible || !volume || !avgVol) return null;
  const ratio = volume / avgVol;
  const pct = Math.min(ratio * 50, 100);
  const color = ratio > 1.5 ? C.yes : ratio > 0.75 ? C.caution : C.no;
  const fmt = v => v >= 1e9 ? (v / 1e9).toFixed(1) + 'B'
    : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M'
    : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim }}>VOL {fmt(volume)}</span>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim }}>20d avg {fmt(Math.round(avgVol))}</span>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color }}>{ratio.toFixed(2)}x</span>
      </div>
      <div style={{ height: D.barH, background: C.dimmer, borderRadius: 2 }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          boxShadow: ratio > 1.5 ? `0 0 4px ${color}` : 'none',
        }} />
      </div>
    </div>
  );
}
