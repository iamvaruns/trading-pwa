import { fetchYahoo, fetchYahooQuote } from '../api/yahoo';
import { fetchFRED } from '../api/fred';
import { fetchSentiment } from '../api/finnhub';
import { SECTORS } from '../constants';
import { FOMC_DATES } from '../constants/timeframes';
import {
  processChart, calcSlope5d, detectSupportResistance,
  calcRelativeStrength, detectSignals, validClose,
} from './calculations';
import { scoreStock } from './scoring';

export async function loadDashboardData() {
  const results = {};
  const failedSources = [];
  const fetches = [
    fetchYahoo('SPY').then(r => { results.spy = processChart(r); }).catch(() => { failedSources.push('SPY'); }),
    fetchYahoo('QQQ').then(r => { results.qqq = processChart(r); }).catch(() => { failedSources.push('QQQ'); }),
    fetchYahoo('^VIX').then(r => { results.vix = processChart(r); }).catch(() => { failedSources.push('VIX'); }),
    fetchYahoo('^TNX').then(r => { results.tnx = processChart(r); }).catch(() => { failedSources.push('TNX'); }),
    fetchYahoo('^DXY').then(r => { results.dxy = processChart(r); }).catch(() => { failedSources.push('DXY'); }),
    ...SECTORS.map(sec =>
      fetchYahoo(sec.ticker).then(r => {
        if (!results.sectors) results.sectors = [];
        results.sectors.push({ ...processChart(r), ticker: sec.ticker, name: sec.name });
      }).catch(() => { failedSources.push(sec.ticker); })
    ),
    fetchFRED('FEDFUNDS').then(v => { if (v) results.fedFunds = v[0]; }).catch(() => { failedSources.push('FRED'); }),
    fetchSentiment('SPY').then(s => { if (s) results.sentimentData = s; }).catch(() => { failedSources.push('SENTIMENT'); }),
  ];

  const WATCHLIST_EXTRA = [
    { yahoo: 'ES=F',   label: 'ES',     name: 'E-Mini S&P Futures' },
    { yahoo: '^BSESN', label: 'SENSEX', name: 'S&P BSE Sensex' },
    { yahoo: '^NSEI',  label: 'NIFTY',  name: 'Nifty 50' },
    { yahoo: 'GC=F',   label: 'GC',     name: 'Gold Futures' },
    { yahoo: '^GSPC',  label: 'SPX',    name: 'S&P 500' },
    { yahoo: 'NQ=F',   label: 'NQ',     name: 'Nasdaq Futures' },
    { yahoo: 'CL=F',   label: 'CL',     name: 'Crude Oil Futures' },
    { yahoo: 'BTC-USD', label: 'BTC',   name: 'Bitcoin' },
    { yahoo: 'ETH-USD', label: 'ETH',   name: 'Ethereum' },
  ];

  const watchlistResults = {};
  const wlFetches = WATCHLIST_EXTRA.map(item =>
    fetchYahoo(item.yahoo, '5d', '1d').then(r => {
      const d = processChart(r);
      watchlistResults[item.yahoo] = { label: item.label, name: item.name, price: d.price, change1d: d.change1d };
    }).catch(() => {})
  );

  await Promise.allSettled([...fetches, ...wlFetches]);

  if (results.vix) results.vix.slope5d = calcSlope5d(results.vix.closes);

  results.watchlist = [
    { label: 'ES',     name: 'E-Mini S&P Futures', price: watchlistResults['ES=F']?.price,    change1d: watchlistResults['ES=F']?.change1d },
    { label: 'SPX',    name: 'S&P 500',            price: watchlistResults['^GSPC']?.price,   change1d: watchlistResults['^GSPC']?.change1d },
    { label: 'SPY',    name: 'SPDR S&P 500',       price: results.spy?.price,                 change1d: results.spy?.change1d },
    { label: 'NQ',     name: 'Nasdaq Futures',      price: watchlistResults['NQ=F']?.price,    change1d: watchlistResults['NQ=F']?.change1d },
    { label: 'QQQ',    name: 'Invesco QQQ',         price: results.qqq?.price,                 change1d: results.qqq?.change1d },
    { label: 'VIX',    name: 'S&P 500 Volatility',  price: results.vix?.price,                 change1d: results.vix?.change1d },
    { label: 'SENSEX', name: 'S&P BSE Sensex',      price: watchlistResults['^BSESN']?.price,  change1d: watchlistResults['^BSESN']?.change1d },
    { label: 'NIFTY',  name: 'Nifty 50',            price: watchlistResults['^NSEI']?.price,   change1d: watchlistResults['^NSEI']?.change1d },
    { label: 'GC',     name: 'Gold Futures',         price: watchlistResults['GC=F']?.price,    change1d: watchlistResults['GC=F']?.change1d },
    { label: 'CL',     name: 'Crude Oil Futures',    price: watchlistResults['CL=F']?.price,    change1d: watchlistResults['CL=F']?.change1d },
    { label: 'BTC',    name: 'Bitcoin',              price: watchlistResults['BTC-USD']?.price,  change1d: watchlistResults['BTC-USD']?.change1d },
    { label: 'ETH',    name: 'Ethereum',             price: watchlistResults['ETH-USD']?.price,  change1d: watchlistResults['ETH-USD']?.change1d },
  ];

  const now = new Date();
  results.fomcSoon = FOMC_DATES.some(d => {
    const diff = (new Date(d) - now) / (1000 * 60 * 60);
    return diff >= -24 && diff <= 72;
  });

  results.failedSources = failedSources;
  return results;
}

export async function loadStockData(symbol) {
  const result = await fetchYahoo(symbol, '1y');
  return processChart(result);
}

export async function loadSPYData() {
  try {
    const result = await fetchYahoo('SPY', '1y', '1d');
    const data = processChart(result);
    return validClose(data.allCloses);
  } catch {
    return [];
  }
}

export async function loadStockDataWithScoring(symbol, spyCloses, horizon) {
  const [chartResult, fundamentals, sentimentResult] = await Promise.allSettled([
    fetchYahoo(symbol, '1y', '1d'),
    fetchYahooQuote(symbol),
    fetchSentiment(symbol),
  ]);

  const data = processChart(
    chartResult.status === 'fulfilled' ? chartResult.value : (() => { throw new Error('Chart failed'); })()
  );
  data.symbol = symbol;

  data.srLevels = detectSupportResistance(
    data.allHighs, data.allLows, data.allCloses, data.allTimestamps
  );

  const fund = fundamentals.status === 'fulfilled' ? fundamentals.value : null;
  const sentimentData = sentimentResult.status === 'fulfilled' ? sentimentResult.value : null;
  const stockCloses = validClose(data.allCloses);
  const rsData = spyCloses.length > 0 ? calcRelativeStrength(stockCloses, spyCloses) : null;
  const signals = detectSignals(data);
  const score = scoreStock(data, fund, rsData, horizon, sentimentData);

  let earningsDays = null;
  if (fund?.earningsDate) {
    const diff = (fund.earningsDate * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff > 0 && diff < 60) earningsDays = Math.ceil(diff);
  }

  return { data, fundamentals: fund, rsData, signals, score, earningsDays, sentimentData };
}

export async function loadStockDataForChart(symbol, range, interval, filterLastHour) {
  const result = await fetchYahoo(symbol, range, interval);
  const data = processChart(result);
  if (filterLastHour && data.ohlc.length > 30) {
    const cutoff = data.ohlc.length - 30;
    data.ohlc = data.ohlc.slice(cutoff);
    data.volumeSeries = data.volumeSeries.slice(cutoff);
    data.allCloses = data.allCloses.slice(cutoff);
    data.allTimestamps = data.allTimestamps.slice(cutoff);
    data.allHighs = data.allHighs.slice(cutoff);
    data.allLows = data.allLows.slice(cutoff);
  }
  data.srLevels = detectSupportResistance(
    data.allHighs, data.allLows, data.allCloses, data.allTimestamps
  );
  return data;
}
