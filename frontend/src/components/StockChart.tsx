import { useEffect, useRef, useCallback } from 'react';
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi, type CandlestickData, type Time, ColorType } from 'lightweight-charts';
import type { Candle } from '../types/stock';

interface StockChartProps {
  history: Candle[];
  ticker: string;
}

export function StockChart({ history, ticker }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lastTickerRef = useRef<string>('');
  const lastDataLenRef = useRef<number>(0);

  const formatCandle = useCallback((candle: Candle): CandlestickData<Time> => ({
    time: candle.time as Time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }), []);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1e2235' },
        textColor: '#8b8fa3',
      },
      grid: {
        vertLines: { color: '#2a2e3f' },
        horzLines: { color: '#2a2e3f' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: '#2a2e3f',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2a2e3f',
      },
      crosshair: {
        vertLine: { color: '#6366f1', width: 1, style: 3 },
        horzLine: { color: '#6366f1', width: 1, style: 3 },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });

    chartRef.current = chart;
    seriesRef.current = series;
    lastTickerRef.current = '';
    lastDataLenRef.current = 0;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || history.length === 0) return;

    try {
      if (ticker !== lastTickerRef.current) {
        const data = history.map(formatCandle);
        seriesRef.current.setData(data);
        lastTickerRef.current = ticker;
        lastDataLenRef.current = history.length;
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      } else if (history.length > lastDataLenRef.current) {
        const newCandle = history[history.length - 1];
        seriesRef.current.update(formatCandle(newCandle));
        lastDataLenRef.current = history.length;
      }
    } catch (e) {
      // Reset on error - full reload
      try {
        const data = history.map(formatCandle);
        seriesRef.current.setData(data);
        lastDataLenRef.current = history.length;
        lastTickerRef.current = ticker;
      } catch {
        // Ignore secondary errors
      }
    }
  }, [history, ticker, formatCandle]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full rounded-lg overflow-hidden"
    />
  );
}
