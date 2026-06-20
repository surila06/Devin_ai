export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockInfo {
  name: string;
  price: number;
  sector: string;
  history: Candle[];
}

export interface StockUpdate {
  candle: Candle;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
}

export interface WSInitialMessage {
  type: 'initial';
  stocks: Record<string, StockInfo>;
}

export interface WSUpdateMessage {
  type: 'update';
  timestamp: string;
  data: Record<string, StockUpdate>;
}

export type WSMessage = WSInitialMessage | WSUpdateMessage;

export interface StockState {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  sector: string;
  history: Candle[];
}
