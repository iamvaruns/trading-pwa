import { useTheme } from '../../context/ThemeContext';

export function Badge({ decision }) {
  const { C, D } = useTheme();

  const cfg = {
    YES:     { col: C.yes,     label: '● TRADE',        bg: 'rgba(0,255,136,0.07)' },
    CAUTION: { col: C.caution, label: '◐ CAUTION',      bg: 'rgba(255,184,0,0.07)' },
    NO:      { col: C.no,      label: '○ STAND DOWN',   bg: 'rgba(255,59,92,0.07)' },
  }[decision] || { col: C.dim, label: '— LOADING', bg: 'transparent' };

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', padding: D.badgePad,
      border: `2px solid ${cfg.col}`, background: cfg.bg,
      boxShadow: `0 0 24px ${cfg.col}40`,
      fontFamily: 'Share Tech Mono', fontSize: D.badgeFont, color: cfg.col,
      letterSpacing: '0.12em', borderRadius: 3,
      animation: 'glow 3s ease-in-out infinite',
    }}>{cfg.label}</div>
  );
}
