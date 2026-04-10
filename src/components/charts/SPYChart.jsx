import { useRef, useEffect, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { useTheme } from '../../context/ThemeContext';
import { calcSMASeries } from '../../utils/calculations';
import { loadStockDataForChart } from '../../utils/data';
import { CHART_TIMEFRAMES } from '../../constants/timeframes';
import { Sk } from '../ui/Skeleton';

export function SPYChart({ symbol, initialData, height = 240, volHeight = 60 }) {
  const { C, D, isDesktop } = useTheme();
  const wrapperRef = useRef(null);
  const mainRef = useRef(null);
  const volRef = useRef(null);
  const chartsRef = useRef([]);
  const syncingRef = useRef(false);

  const [timeframe, setTimeframe] = useState('1Y');
  const [chartData, setChartData] = useState(initialData);
  const [tfLoading, setTfLoading] = useState(false);

  useEffect(() => {
    if (timeframe === '1Y' && initialData) {
      setChartData(initialData);
      return;
    }
    let cancelled = false;
    setTfLoading(true);
    const tf = CHART_TIMEFRAMES.find(t => t.key === timeframe);
    if (!tf) return;
    const isLastHour = timeframe === '1H';
    loadStockDataForChart(symbol, tf.range, tf.interval, isLastHour)
      .then(data => { if (!cancelled) { setChartData(data); setTfLoading(false); } })
      .catch(() => { if (!cancelled) setTfLoading(false); });
    return () => { cancelled = true; };
  }, [timeframe, symbol, initialData]);

  useEffect(() => {
    if (!chartData?.ohlc?.length || !mainRef.current || !volRef.current) return;

    chartsRef.current.forEach(c => { try { c.remove(); } catch { /* already removed */ } });
    chartsRef.current = [];
    mainRef.current.innerHTML = '';
    volRef.current.innerHTML = '';

    const pad = isDesktop ? 28 : 20;
    const chartW = (wrapperRef.current?.clientWidth || 600) - pad;
    const isIntraday = timeframe === '1H' || timeframe === '1D' || timeframe === '4H';

    const touchOpts = isDesktop
      ? { handleScroll: { vertTouchDrag: false }, handleScale: {} }
      : {
          handleScroll: { vertTouchDrag: false, horzTouchDrag: false },
          handleScale: { pinch: false },
        };

    const mkOpts = (h) => ({
      width: chartW,
      height: h,
      layout: { background: { type: 'solid', color: C.bg }, textColor: C.dim, fontFamily: 'Share Tech Mono', fontSize: 10 },
      grid: { vertLines: { color: C.dimmer }, horzLines: { color: C.dimmer } },
      crosshair: { mode: CrosshairMode.Normal },
      ...touchOpts,
      rightPriceScale: { borderColor: C.dimmer },
      timeScale: { borderColor: C.dimmer, timeVisible: isIntraday, secondsVisible: false },
    });

    const mainChart = createChart(mainRef.current, mkOpts(height));
    const candleSeries = mainChart.addCandlestickSeries({
      upColor: C.yes, downColor: C.no,
      borderUpColor: C.yes, borderDownColor: C.no,
      wickUpColor: C.yes, wickDownColor: C.no,
    });
    candleSeries.setData(chartData.ohlc);

    const smaColors = { 20: C.sma20, 50: C.sma50, 100: C.sma100, 200: C.sma200 };
    [20, 50, 200].forEach(p => {
      const smaData = calcSMASeries(chartData.allCloses, chartData.allTimestamps, p);
      if (smaData.length > 0) {
        const s = mainChart.addLineSeries({ color: smaColors[p], lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        s.setData(smaData);
      }
    });

    const volChart = createChart(volRef.current, {
      ...mkOpts(volHeight),
      rightPriceScale: { borderColor: C.dimmer, scaleMargins: { top: 0.1, bottom: 0 } },
    });
    const volSeries = volChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false });
    const volData = chartData.volumeSeries.map((v, i) => {
      const candle = chartData.ohlc[i];
      const isUp = candle && candle.close >= candle.open;
      return { ...v, color: isUp ? C.yes + '50' : C.no + '50' };
    });
    volSeries.setData(volData);

    const allCharts = [mainChart, volChart];
    chartsRef.current = allCharts;

    allCharts.forEach((chart, idx) => {
      chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (syncingRef.current || !range) return;
        syncingRef.current = true;
        allCharts.forEach((other, oidx) => {
          if (idx !== oidx) try { other.timeScale().setVisibleLogicalRange(range); } catch { /* ignore */ }
        });
        syncingRef.current = false;
      });
    });

    allCharts.forEach(c => c.timeScale().fitContent());

    const ro = new ResizeObserver(() => {
      const w = wrapperRef.current?.clientWidth;
      if (w) allCharts.forEach(c => { try { c.applyOptions({ width: w - pad }); } catch { /* ignore */ } });
    });
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    return () => {
      ro.disconnect();
      allCharts.forEach(c => { try { c.remove(); } catch { /* ignore */ } });
      chartsRef.current = [];
    };
  }, [chartData, height, volHeight, isDesktop, C, timeframe]);

  return (
    <div ref={wrapperRef}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {CHART_TIMEFRAMES.map(tf => (
          <button
            key={tf.key}
            onClick={() => setTimeframe(tf.key)}
            style={{
              background: timeframe === tf.key ? C.blue + '20' : 'transparent',
              border: `1px solid ${timeframe === tf.key ? C.blue : C.dimmer}`,
              color: timeframe === tf.key ? C.blue : C.dim,
              padding: isDesktop ? '5px 14px' : '4px 10px',
              fontFamily: 'Share Tech Mono', fontSize: isDesktop ? 12 : 11,
              cursor: 'pointer', borderRadius: 3,
            }}
          >{tf.key}</button>
        ))}
      </div>
      {tfLoading ? (
        <Sk h={height + volHeight + 20} />
      ) : (
        <>
          <div ref={mainRef} />
          <div style={{ borderTop: `1px solid ${C.dimmer}`, margin: '4px 0' }} />
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C.dim, letterSpacing: '0.1em', marginBottom: 2 }}>VOLUME</div>
          <div ref={volRef} />
        </>
      )}
    </div>
  );
}
