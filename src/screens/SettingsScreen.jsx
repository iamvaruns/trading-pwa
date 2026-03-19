import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Panel } from '../components/ui/Panel';

export function SettingsScreen({ settings, onSave }) {
  const { C, D, isDesktop, themeName, layout, setThemeName, setLayout } = useTheme();

  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  const save = () => {
    onSave(form);
    localStorage.setItem('app_settings', JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: D.contentPad, paddingBottom: 80, maxWidth: isDesktop ? 800 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
      <div style={{
        fontFamily: 'Share Tech Mono', fontSize: D.panelTitle, color: C.dim,
        letterSpacing: '0.12em', marginBottom: 20, paddingBottom: 10,
        borderBottom: `1px solid ${C.dimmer}`,
      }}>CONFIGURATION</div>

      <Panel title="DISPLAY">
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.dim, display: 'block', marginBottom: 8, letterSpacing: '0.1em' }}>THEME</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['dark', 'light'].map(t => (
              <button key={t} onClick={() => setThemeName(t)} style={{
                flex: 1, padding: isDesktop ? '12px' : '10px',
                background: themeName === t ? C.dimmer : 'transparent',
                border: `1px solid ${themeName === t ? C.blue : C.dimmer}`,
                color: themeName === t ? C.blue : C.dim, cursor: 'pointer',
                fontFamily: 'Share Tech Mono', fontSize: D.rowValue, borderRadius: 4,
              }}>{t === 'dark' ? '☽ DARK' : '☀ LIGHT'}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.dim, display: 'block', marginBottom: 8, letterSpacing: '0.1em' }}>LAYOUT</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['mobile', 'desktop'].map(l => (
              <button key={l} onClick={() => setLayout(l)} style={{
                flex: 1, padding: isDesktop ? '12px' : '10px',
                background: layout === l ? C.dimmer : 'transparent',
                border: `1px solid ${layout === l ? C.blue : C.dimmer}`,
                color: layout === l ? C.blue : C.dim, cursor: 'pointer',
                fontFamily: 'Share Tech Mono', fontSize: D.rowValue, borderRadius: 4,
              }}>{l === 'mobile' ? '◧ MOBILE' : '⊞ DESKTOP'}</button>
            ))}
          </div>
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim, marginTop: 8 }}>
            Desktop uses wider layout with 4-column grid and side-by-side panels
          </div>
        </div>
      </Panel>

      <div style={{ marginTop: 16 }}>
        <Panel title="TRADING MODE">
          <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
            {['SWING', 'DAY'].map(m => (
              <button key={m} onClick={() => setForm(p => ({ ...p, mode: m }))} style={{
                flex: 1, padding: isDesktop ? '12px' : '10px',
                background: form.mode === m ? C.dimmer : 'transparent',
                border: `1px solid ${form.mode === m ? C.blue : C.dimmer}`,
                color: form.mode === m ? C.blue : C.dim, cursor: 'pointer',
                fontFamily: 'Share Tech Mono', fontSize: D.rowValue, borderRadius: 4,
              }}>{m}</button>
            ))}
          </div>
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim, marginTop: 8 }}>
            Affects scoring thresholds and AI analysis tone
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: 16 }}>
        <Panel title="API KEYS">
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.textMid, lineHeight: 1.8 }}>
            <div style={{ color: C.yes, marginBottom: 6 }}>Keys are set server-side (secure)</div>
            <div>● <span style={{ color: C.dim }}>ANTHROPIC_API_KEY</span> — AI terminal analysis</div>
            <div>● <span style={{ color: C.dim }}>FRED_API_KEY</span> — Fed Funds macro data</div>
          </div>
          <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(0,136,204,0.06)', border: `1px solid ${C.blue}30`, borderRadius: 4 }}>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim, lineHeight: 1.7 }}>
              Local: set in .env file · Netlify: set in Site settings → Environment variables
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: 16 }}>
        <Panel title="REFRESH">
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.dim, display: 'block', marginBottom: 8 }}>AUTO-REFRESH INTERVAL</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[30, 45, 60, 120].map(s => (
                <button key={s} onClick={() => setForm(p => ({ ...p, refreshInterval: s * 1000 }))} style={{
                  flex: 1, padding: isDesktop ? '10px 6px' : '8px 4px',
                  background: form.refreshInterval === s * 1000 ? C.dimmer : 'transparent',
                  border: `1px solid ${form.refreshInterval === s * 1000 ? C.blue : C.dimmer}`,
                  color: form.refreshInterval === s * 1000 ? C.blue : C.dim, cursor: 'pointer',
                  fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, borderRadius: 4,
                }}>{s}s</button>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: 16 }}>
        <Panel title="DATA SOURCES">
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.textMid, lineHeight: 1.8 }}>
            <div>● <span style={{ color: C.yes }}>Yahoo Finance</span> — Prices, OHLCV, SMAs (via CORS proxy)</div>
            <div>● <span style={{ color: C.yes }}>FRED API</span> — Fed Funds rate (optional key)</div>
            <div>● <span style={{ color: C.caution }}>Breadth data</span> — Approximated from sector ETFs</div>
            <div>● <span style={{ color: C.caution }}>Put/Call ratio</span> — Derived from VIX regime</div>
          </div>
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(0,136,204,0.06)', border: `1px solid ${C.blue}30`, borderRadius: 4 }}>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowStatus, color: C.dim, lineHeight: 1.7 }}>
              For true breadth data (% above 200d MA), consider upgrading to Polygon.io or Nasdaq Data Link. For institutional accuracy, FactSet or Bloomberg Terminal APIs provide tick-level breadth.
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: 16 }}>
        <Panel title="INSTALL AS APP">
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: D.rowLabel, color: C.textMid, lineHeight: 1.9 }}>
            <div style={{ color: C.yes, marginBottom: 6 }}>Samsung S24 Ultra — Chrome:</div>
            <div>1. Open Chrome, tap menu</div>
            <div>2. Tap "Add to Home screen"</div>
            <div>3. Tap "Add" — app appears on home</div>
            <div style={{ color: C.yes, marginTop: 10, marginBottom: 6 }}>Samsung Internet:</div>
            <div>1. Tap menu — "Add page to"</div>
            <div>2. Select "Home screen"</div>
          </div>
        </Panel>
      </div>

      <button onClick={save} style={{
        width: '100%', marginTop: 20, padding: isDesktop ? '16px' : '14px',
        background: saved ? C.yes : C.blue,
        border: 'none', color: '#000',
        fontFamily: 'Share Tech Mono', fontSize: D.cardSymbol, fontWeight: 700,
        cursor: 'pointer', borderRadius: 6, transition: 'background 0.3s',
        boxShadow: `0 0 20px ${saved ? C.yes : C.blue}40`,
      }}>{saved ? '✓ SAVED' : 'SAVE SETTINGS'}</button>
    </div>
  );
}
