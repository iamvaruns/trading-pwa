import { fetchYahoo, fetchYahooQuote } from '../api/yahoo';
import { fetchFRED } from '../api/fred';
import { SECTORS } from '../constants';
import { FOMC_DATES } from '../constants/timeframes';
import {
  processChart, calcSlope5d, detectSupportResistance,
  calcRelativeStrength, detectSignals, validClose,
} from './calculations';
import { scoreStock } from './scoring';

export async function loadDashboardData() {
  const results = {};
  const fetches = [
    fetchYahoo('SPY').then(r => { results.spy = processChart(r); }).catch(() => {}),
    fetchYahoo('QQQ').then(r => { results.qqq = processChart(r); }).catch(() => {}),
    fetchYahoo('^VIX').then(r => { results.vix = processChart(r); }).catch(() => {}),
    fetchYahoo('^TNX').then(r => { results.tnx = processChart(r); }).catch(() => {}),
    fetchYahoo('^DXY').then(r => { results.dxy = processChart(r); }).catch(() => {}),
    ...SECTORS.map(sec =>
      fetchYahoo(sec.ticker).then(r => {
        if (!results.sectors) results.sectors = [];
        results.sectors.push({ ...processChart(r), ticker: sec.ticker, name: sec.name });
      }).catch(() => {})
    ),
    fetchFRED('FEDFUNDS').then(v => { if (v) results.fedFunds = v[0]; }).catch(() => {}),
  ];
  await Promise.allSettled(fetches);

  if (results.vix) results.vix.slope5d = calcSlope5d(results.vix.closes);

  const now = new Date();
  results.fomcSoon = FOMC_DATES.some(d => {
    const diff = (new Date(d) - now) / (1000 * 60 * 60);
    return diff >= -24 && diff <= 72;
  });

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
  const [chartResult, fundamentals] = await Promise.allSettled([
    fetchYahoo(symbol, '1y', '1d'),
    fetchYahooQuote(symbol),
  ]);

  const data = processChart(
    chartResult.status === 'fulfilled' ? chartResult.value : (() => { throw new Error('Chart failed'); })()
  );
  data.symbol = symbol;

  data.srLevels = detectSupportResistance(
    data.allHighs, data.allLows, data.allCloses, data.allTimestamps
  );

  const fund = fundamentals.status === 'fulfilled' ? fundamentals.value : null;
  const stockCloses = validClose(data.allCloses);
  const rsData = spyCloses.length > 0 ? calcRelativeStrength(stockCloses, spyCloses) : null;
  const signals = detectSignals(data);
  const score = scoreStock(data, fund, rsData, horizon);

  let earningsDays = null;
  if (fund?.earningsDate) {
    const diff = (fund.earningsDate * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff > 0 && diff < 60) earningsDays = Math.ceil(diff);
  }

  return { data, fundamentals: fund, rsData, signals, score, earningsDays };
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
