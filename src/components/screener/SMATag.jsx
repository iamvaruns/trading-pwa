import { useTheme } from '../../context/ThemeContext';

export function SMATag({ label, price, sma, color, visible }) {
  const { C, D } = useTheme();

  if (!visible || sma == null) return null;
  const pct = ((price - sma) / sma) * 100;
  const pos = pct >= 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: `1px solid ${C.dimmer}` }}>
      <div style={{ width: 3, height: D.rowValue, background: color, borderRadius: 1, flexShrink: 0 }} />
      <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.dim, width: 60 }}>{label}</span>
      <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.text }}>{sma.toFixed(2)}</span>
      <span style={{
        fontFamily: 'Share Tech Mono', fontSize: D.rowStatus,
        color: pos ? C.yes : C.no, marginLeft: 'auto',
      }}>{pos ? '+' : ''}{pct.toFixed(1)}%</span>
    </div>
  );
}
