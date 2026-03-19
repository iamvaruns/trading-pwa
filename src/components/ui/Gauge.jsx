import { useTheme } from '../../context/ThemeContext';

export function Gauge({ score, decision, size = 160 }) {
  const { C } = useTheme();

  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const col = decision === 'YES' ? C.yes : decision === 'CAUTION' ? C.caution : C.no;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.dimmer} strokeWidth={size * 0.065} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={size * 0.065}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{
            transition: 'stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)',
            filter: `drop-shadow(0 0 6px ${col})`,
          }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: size * 0.22, color: col, lineHeight: 1 }}>{score}</span>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: size * 0.07, color: C.dim, marginTop: 2 }}>MQ SCORE</span>
      </div>
    </div>
  );
}
