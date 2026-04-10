import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

export function ScoreBar({ label, score, weight, color, info }) {
  const { C, D } = useTheme();
  const [open, setOpen] = useState(false);
  const tipRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (tipRef.current && !tipRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.scoreLabel, color: C.dim, position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {label} <span style={{ color: C.dimmer }}>x{weight}</span>
          {info && (
            <span ref={tipRef} style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
                style={{
                  background: 'none', border: `1px solid ${C.dim}`, color: C.dim,
                  width: 18, height: 18, borderRadius: '50%', padding: 0,
                  fontFamily: 'Share Tech Mono', fontSize: 10, lineHeight: 1,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label={`Info about ${label}`}
              >i</button>
              {open && (
                <div style={{
                  position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)',
                  background: C.bgPanel, border: `1px solid ${C.dim}`, borderRadius: 4,
                  padding: '8px 12px', width: 240, zIndex: 100,
                  fontFamily: 'Share Tech Mono', fontSize: D.scoreLabel - 1, color: C.textMid,
                  lineHeight: 1.6, boxShadow: `0 2px 12px rgba(0,0,0,0.4)`,
                }}>
                  {info}
                </div>
              )}
            </span>
          )}
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
