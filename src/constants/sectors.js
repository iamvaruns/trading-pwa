export const SECTORS = [
  { ticker: 'XLK', name: 'Technology' },
  { ticker: 'XLF', name: 'Financials' },
  { ticker: 'XLE', name: 'Energy' },
  { ticker: 'XLV', name: 'Health Care' },
  { ticker: 'XLI', name: 'Industrials' },
  { ticker: 'XLY', name: 'Cons. Disc.' },
  { ticker: 'XLP', name: 'Staples' },
  { ticker: 'XLU', name: 'Utilities' },
  { ticker: 'XLB', name: 'Materials' },
  { ticker: 'XLRE', name: 'Real Estate' },
  { ticker: 'XLC', name: 'Comm. Svcs' },
];

export const DEFAULT_SCREENER = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'TSLA', 'SPY', 'QQQ',
];

export const DASHBOARD_SYMBOLS = [
  'SPY', 'QQQ', '^VIX', '^TNX', '^DXY',
  ...SECTORS.map(s => s.ticker),
];
