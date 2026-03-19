import { useTheme, scoreColor } from '../../context/ThemeContext';

export function Panel({ title, score, children, pad }) {
  const { C, D } = useTheme();

  return (
    <div style={{
      background: C.bgPanel,
      border: `1px solid ${C.dimmer}`,
      borderRadius: 4,
      overflow: 'hidden',
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: D.panelHdrPad,
        borderBottom: `1px solid ${C.dimmer}`,
        transition: 'border-color 0.3s',
      }}>
        <span style={{
          fontFamily: 'Share Tech Mono',
          fontSize: D.panelTitle,
          color: C.dim,
          letterSpacing: '0.12em',
        }}>{title}</span>
        {score !== undefined && (
          <span style={{
            fontFamily: 'Share Tech Mono',
            fontSize: D.panelTitle,
            color: scoreColor(score, C),
            fontWeight: 700,
          }}>{Math.round(score)}%</span>
        )}
      </div>
      <div style={{ padding: pad || D.panelBodyPad }}>{children}</div>
    </div>
  );
}
