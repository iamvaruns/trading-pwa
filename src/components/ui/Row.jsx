import { useTheme } from '../../context/ThemeContext';

export function Row({ label, value, sub, up, status }) {
  const { C, D } = useTheme();

  const dirColor = up === true ? C.yes : up === false ? C.no : C.dim;
  const arrow = up === true ? '↑' : up === false ? '↓' : '→';
  const statusMap = {
    healthy: C.yes, bullish: C.yes, low: C.yes,
    weakening: C.caution, elevated: C.caution, neutral: C.caution,
    'risk-off': C.no, bearish: C.no, high: C.no,
  };
  const sColor = statusMap[status] || C.dim;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: D.rowPad,
      borderBottom: `1px solid ${C.dimmer}`,
    }}>
      <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.dim }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {status && (
          <span style={{
            fontFamily: 'Share Tech Mono',
            fontSize: D.rowStatus,
            color: sColor,
            textTransform: 'uppercase',
          }}>{status}</span>
        )}
        <span style={{
          fontFamily: 'Share Tech Mono',
          fontSize: D.rowValue,
          color: C.text,
          fontWeight: 700,
        }}>{value}</span>
        {up !== undefined && (
          <span style={{ color: dirColor, fontSize: D.rowValue - 1, fontWeight: 700 }}>{arrow}</span>
        )}
        {sub && (
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim }}>{sub}</span>
        )}
      </div>
    </div>
  );
}
