export const CHART_TIMEFRAMES = [
  { key: '1H', range: '1d', interval: '2m' },
  { key: '1D', range: '1d', interval: '5m' },
  { key: '1M', range: '1mo', interval: '60m' },
  { key: '1Y', range: '1y', interval: '1d' },
];

export const FOMC_DATES = [
  '2025-03-19', '2025-05-07', '2025-06-18', '2025-07-30',
  '2025-09-17', '2025-10-29', '2025-12-10',
  '2026-01-28', '2026-03-18', '2026-04-29', '2026-06-17',
  '2026-07-29', '2026-09-16', '2026-11-04', '2026-12-16',
];

export const DEFAULT_SETTINGS = {
  mode: 'SWING',
  refreshInterval: 45000,
};

export const DEFAULT_INDICATORS = {
  sma20: true,
  sma50: true,
  sma100: false,
  sma200: true,
  volume: true,
};
