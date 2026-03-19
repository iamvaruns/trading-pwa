import { useTheme } from '../../context/ThemeContext';

export function ScoreBar({ label, score, weight, color }) {
  const { C, D } = useTheme();

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.scoreLabel, color: C.dim }}>
          {label} <span style={{ color: C.dimmer }}>x{weight}</span>
        </span>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.scoreVal, color: C.textMid }}>
          {Math.round(score)}%
        </span>
      </div>
      <div style={{ height: D.barH, background: C.dimmer, borderRadius: 2 }}>
        <div style={{
          height: '100%',
          width: `${score}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 1.2s ease',
          boxShadow: `0 0 4px ${color}80`,
        }} />
      </div>
    </div>
  );
}
