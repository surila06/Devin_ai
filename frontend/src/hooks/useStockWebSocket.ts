import { useEffect, useRef, useState, useCallback } from 'react';
import type { StockState, WSMessage } from '../types/stock';

export function useStockWebSocket() {
  const [stocks, setStocks] = useState<Record<string, StockState>>({});
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connect = useCallback(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${backendUrl}/ws/stocks`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const message: WSMessage = JSON.parse(event.data);

      if (message.type === 'initial') {
        const initialStocks: Record<string, StockState> = {};
        for (const [ticker, info] of Object.entries(message.stocks)) {
          const history = info.history;
          const firstPrice = history.length > 0 ? history[0].open : info.price;
          const change = info.price - firstPrice;
          const changePct = (change / firstPrice) * 100;

          initialStocks[ticker] = {
            ticker,
            name: info.name,
            price: info.price,
            change: parseFloat(change.toFixed(2)),
            change_percent: parseFloat(changePct.toFixed(2)),
            volume: history.length > 0 ? history[history.length - 1].volume : 0,
            sector: info.sector,
            history,
          };
        }
        setStocks(initialStocks);
        setLastUpdate(new Date().toISOString());
      } else if (message.type === 'update') {
        setStocks((prev) => {
          const updated = { ...prev };
          for (const [ticker, update] of Object.entries(message.data)) {
            if (updated[ticker]) {
              const newHistory = [...updated[ticker].history, update.candle];
              if (newHistory.length > 500) {
                newHistory.splice(0, newHistory.length - 500);
              }
              updated[ticker] = {
                ...updated[ticker],
                price: update.price,
                change: update.change,
                change_percent: update.change_percent,
                volume: update.volume,
                history: newHistory,
              };
            }
          }
          return updated;
        });
        setLastUpdate(message.timestamp);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { stocks, connected, lastUpdate };
}
