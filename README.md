# StockPulse - Real-Time Stock Market Dashboard

A modern, real-time stock market dashboard with live candlestick charts and WebSocket-powered updates.

![Tech Stack](https://img.shields.io/badge/React-19-blue) ![Tech Stack](https://img.shields.io/badge/FastAPI-0.115-green) ![Tech Stack](https://img.shields.io/badge/TypeScript-5.8-blue) ![Tech Stack](https://img.shields.io/badge/TailwindCSS-4-purple)

## Features

- **Live Candlestick Charts** — Professional-grade TradingView Lightweight Charts
- **Real-Time Updates** — WebSocket-powered streaming with 1.5s intervals
- **8 Stock Tickers** — AAPL, GOOGL, MSFT, AMZN, TSLA, NVDA, META, JPM
- **Market Overview** — Gainers/losers, average change, total volume
- **Dark Theme UI** — Modern, responsive design with smooth animations
- **Auto-Reconnect** — Automatic WebSocket reconnection on disconnect

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | TailwindCSS 4 |
| Charts | TradingView Lightweight Charts |
| Backend | FastAPI + WebSocket |
| Real-time | WebSocket with JSON streaming |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- npm 10+

### Backend

```bash
cd backend
pip install -e .
python main.py
```

The API server starts at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173` with hot-reload.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stocks` | List all stocks with current prices |
| GET | `/api/stocks/{ticker}/history` | Get price history for a ticker |
| WS | `/ws/stocks` | WebSocket for real-time updates |
| GET | `/api/health` | Health check |

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   React App     │◄──────────────────► │   FastAPI        │
│                 │                      │   Server         │
│ - Lightweight   │     REST API         │                 │
│   Charts        │◄───────────────────►│ - Stock Engine   │
│ - TailwindCSS   │                      │ - WS Manager    │
└─────────────────┘                      └─────────────────┘
```

## Production Build

```bash
cd frontend
npm run build
```

Serve the built files from `frontend/dist/` and point to the backend API.
