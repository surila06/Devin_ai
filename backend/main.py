import asyncio
import json
import os
import random
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI(title="Stock Live Updates API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STOCKS: Dict[str, dict] = {
    "AAPL": {"name": "Apple Inc.", "price": 195.50, "sector": "Technology"},
    "GOOGL": {"name": "Alphabet Inc.", "price": 141.80, "sector": "Technology"},
    "MSFT": {"name": "Microsoft Corp.", "price": 378.90, "sector": "Technology"},
    "AMZN": {"name": "Amazon.com Inc.", "price": 178.25, "sector": "Consumer"},
    "TSLA": {"name": "Tesla Inc.", "price": 248.50, "sector": "Automotive"},
    "NVDA": {"name": "NVIDIA Corp.", "price": 495.20, "sector": "Technology"},
    "META": {"name": "Meta Platforms", "price": 356.70, "sector": "Technology"},
    "JPM": {"name": "JPMorgan Chase", "price": 172.40, "sector": "Finance"},
}

stock_history: Dict[str, List[dict]] = {ticker: [] for ticker in STOCKS}
connected_clients: Set[WebSocket] = set()


class StockUpdate(BaseModel):
    ticker: str
    name: str
    price: float
    change: float
    change_percent: float
    volume: int
    high: float
    low: float
    open: float
    timestamp: str
    sector: str


def generate_candle(ticker: str, base_price: float) -> dict:
    volatility = random.uniform(0.001, 0.015)
    direction = random.choice([-1, 1])
    change_pct = direction * volatility * random.uniform(0.5, 2.0)

    open_price = base_price
    close_price = base_price * (1 + change_pct)
    high_price = max(open_price, close_price) * (1 + random.uniform(0, 0.005))
    low_price = min(open_price, close_price) * (1 - random.uniform(0, 0.005))
    volume = random.randint(10000, 5000000)

    close_price = round(close_price, 2)
    high_price = round(high_price, 2)
    low_price = round(low_price, 2)

    STOCKS[ticker]["price"] = close_price

    candle = {
        "time": int(time.time()),
        "open": open_price,
        "high": high_price,
        "low": low_price,
        "close": close_price,
        "volume": volume,
    }

    stock_history[ticker].append(candle)
    if len(stock_history[ticker]) > 500:
        stock_history[ticker] = stock_history[ticker][-500:]

    return candle


def generate_initial_history(ticker: str, base_price: float, num_candles: int = 100) -> List[dict]:
    history = []
    current_price = base_price * random.uniform(0.85, 0.95)
    current_time = int(time.time()) - (num_candles * 60)

    for i in range(num_candles):
        volatility = random.uniform(0.001, 0.012)
        direction = random.choice([-1, 1])
        change_pct = direction * volatility

        open_price = round(current_price, 2)
        close_price = round(current_price * (1 + change_pct), 2)
        high_price = round(max(open_price, close_price) * (1 + random.uniform(0, 0.004)), 2)
        low_price = round(min(open_price, close_price) * (1 - random.uniform(0, 0.004)), 2)
        volume = random.randint(10000, 5000000)

        candle = {
            "time": current_time + (i * 60),
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": volume,
        }
        history.append(candle)
        current_price = close_price

    STOCKS[ticker]["price"] = current_price
    stock_history[ticker] = history
    return history


for ticker, info in STOCKS.items():
    generate_initial_history(ticker, info["price"])


@app.get("/api/stocks")
async def get_stocks():
    result = []
    for ticker, info in STOCKS.items():
        history = stock_history[ticker]
        if len(history) >= 2:
            change = info["price"] - history[0]["open"]
            change_percent = (change / history[0]["open"]) * 100
        else:
            change = 0
            change_percent = 0

        result.append({
            "ticker": ticker,
            "name": info["name"],
            "price": info["price"],
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
            "sector": info["sector"],
        })
    return result


@app.get("/api/stocks/{ticker}/history")
async def get_stock_history(ticker: str):
    ticker = ticker.upper()
    if ticker not in STOCKS:
        return {"error": "Stock not found"}
    return {
        "ticker": ticker,
        "name": STOCKS[ticker]["name"],
        "history": stock_history[ticker],
    }


@app.websocket("/ws/stocks")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)

    try:
        await websocket.send_json({
            "type": "initial",
            "stocks": {
                ticker: {
                    "name": info["name"],
                    "price": info["price"],
                    "sector": info["sector"],
                    "history": stock_history[ticker][-100:],
                }
                for ticker, info in STOCKS.items()
            },
        })

        while True:
            await asyncio.sleep(1.5)

            updates = {}
            for ticker, info in STOCKS.items():
                candle = generate_candle(ticker, info["price"])
                prev_close = stock_history[ticker][-2]["close"] if len(stock_history[ticker]) >= 2 else info["price"]
                change = candle["close"] - prev_close
                change_percent = (change / prev_close) * 100

                updates[ticker] = {
                    "candle": candle,
                    "price": candle["close"],
                    "change": round(change, 2),
                    "change_percent": round(change_percent, 2),
                    "volume": candle["volume"],
                }

            await websocket.send_json({
                "type": "update",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": updates,
            })

    except WebSocketDisconnect:
        connected_clients.discard(websocket)
    except Exception:
        connected_clients.discard(websocket)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# Serve frontend static files
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
