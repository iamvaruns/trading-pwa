import { useTheme } from '../../context/ThemeContext';

export function Sparkline({ closes = [], width = 100, height = 36, showSMA = {} }) {
  const { C } = useTheme();

  if (closes.length < 2) {
    return <div style={{ width, height, background: C.dimmer, borderRadius: 3 }} />;
  }

  const clean = closes.slice(-60);
  const allVals = [...clean];
  const smaPeriods = [20, 50];
  const smaLines = {};

  smaPeriods.forEach(p => {
    if (showSMA?.[p] && clean.length >= p) {
      const line = clean.map((_, i, arr) => {
        if (i < p - 1) return null;
        const sl = arr.slice(i - p + 1, i + 1);
        return sl.reduce((a, b) => a + b, 0) / p;
      }).filter(v => v != null);
      smaLines[p] = line;
      allVals.push(...line);
    }
  });

  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const toX = i => (i / (clean.length - 1)) * width;
  const toY = v => height - ((v - min) / range) * height * 0.9 - height * 0.05;
  const path = clean.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const isUp = clean[clean.length - 1] >= clean[0];
  const color = isUp ? C.yes : C.no;
  const smaColors = { 20: C.sma20, 50: C.sma50, 100: C.sma100, 200: C.sma200 };

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg${width}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path + ` L${toX(clean.length - 1)},${height} L0,${height} Z`} fill={`url(#sg${width})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {Object.entries(smaLines).map(([p, vals]) => {
        const offset = clean.length - vals.length;
        const sp = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i + offset).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
        return <path key={p} d={sp} fill="none" stroke={smaColors[p]} strokeWidth="1" strokeOpacity="0.8" />;
      })}
    </svg>
  );
}
