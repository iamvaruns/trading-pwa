import { useState } from 'react';
import { useTheme } from './context/ThemeContext';
import { DEFAULT_SETTINGS } from './constants';
import { DashboardScreen } from './screens/DashboardScreen';
import { ScreenerScreen } from './screens/ScreenerScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const TABS = [
  { id: 'dashboard', label: 'DASHBOARD', icon: '◉' },
  { id: 'screener',  label: 'SCREENER',  icon: '≡' },
  { id: 'settings',  label: 'SETTINGS',  icon: '⚙' },
];

export default function App() {
  const { C, D, isDesktop, themeName, layout, toggleTheme, toggleLayout } = useTheme();

  const [tab, setTab] = useState('dashboard');
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('app_settings') || '{}') }; }
    catch { return { ...DEFAULT_SETTINGS }; }
  });

  const safeBottom = 'env(safe-area-inset-bottom, 0px)';
  const hdrBtnStyle = {
    background: 'none', border: `1px solid ${C.dimmer}`, color: C.dim,
    padding: isDesktop ? '5px 12px' : '3px 8px', cursor: 'pointer',
    fontFamily: 'Share Tech Mono', fontSize: isDesktop ? 12 : 10,
    borderRadius: 3, transition: 'all 0.2s',
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: C.bg, fontFamily: 'Share Tech Mono', transition: 'background 0.3s',
    }}>
      {/* Header */}
      <div style={{
        background: C.bgPanel, borderBottom: `1px solid ${C.dimmer}`,
        padding: D.hdrPad, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'background 0.3s, border-color 0.3s',
      }}>
        <div>
          <div style={{ fontSize: D.hdrTitle, color: C.text, fontWeight: 700, letterSpacing: '0.1em' }}>
            ◈ SHOULD I BE TRADING?
          </div>
          <div style={{ fontSize: D.hdrSub, color: C.dim, marginTop: 2 }}>
            {settings.mode} MODE · BLOOMBERG TERMINAL
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? 10 : 6 }}>
          <button onClick={toggleTheme} style={hdrBtnStyle} title={themeName === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {themeName === 'dark' ? '☀' : '☽'}{isDesktop ? (themeName === 'dark' ? ' LIGHT' : ' DARK') : ''}
          </button>
          <button onClick={toggleLayout} style={hdrBtnStyle} title={isDesktop ? 'Switch to mobile layout' : 'Switch to desktop layout'}>
            {isDesktop ? '◧ MOBILE' : '⊞ DESKTOP'}
          </button>
          <div style={{ fontSize: D.hdrSub, color: C.dim, textAlign: 'right', marginLeft: 6 }}>
            <div style={{ color: C.yes }}>● LIVE</div>
            <div style={{ marginTop: 1 }}>YAHOO · FRED</div>
          </div>
        </div>
      </div>

      {/* Screens */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          display: tab === 'dashboard' ? 'block' : 'none',
        }}>
          <DashboardScreen settings={settings} />
        </div>
        <div style={{
          position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          display: tab === 'screener' ? 'block' : 'none',
        }}>
          <ScreenerScreen />
        </div>
        <div style={{
          position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          display: tab === 'settings' ? 'block' : 'none',
        }}>
          <SettingsScreen settings={settings} onSave={setSettings} />
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{
        background: C.bgPanel, borderTop: `1px solid ${C.dimmer}`,
        display: 'flex', flexShrink: 0,
        justifyContent: isDesktop ? 'center' : 'stretch',
        gap: isDesktop ? 4 : 0,
        paddingBottom: safeBottom,
        transition: 'background 0.3s, border-color 0.3s',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: isDesktop ? undefined : 1,
            width: isDesktop ? 180 : undefined,
            display: 'flex',
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: isDesktop ? 8 : 0,
            padding: D.navPad, background: 'none', border: 'none', cursor: 'pointer',
            borderTop: tab === t.id ? `2px solid ${C.blue}` : '2px solid transparent',
          }}>
            <span style={{ fontSize: D.navIcon, color: tab === t.id ? C.blue : C.dim, marginBottom: isDesktop ? 0 : 2 }}>{t.icon}</span>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: D.navLabel, color: tab === t.id ? C.blue : C.dim, letterSpacing: '0.08em' }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
