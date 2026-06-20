import asyncio
import random
import time
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Set

import yfinance as yf
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="Stock Live Updates API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Comprehensive stock list covering multiple sectors
STOCK_TICKERS = {
    # Technology
    "AAPL": {"name": "Apple Inc.", "sector": "Technology"},
    "GOOGL": {"name": "Alphabet Inc.", "sector": "Technology"},
    "MSFT": {"name": "Microsoft Corp.", "sector": "Technology"},
    "NVDA": {"name": "NVIDIA Corp.", "sector": "Technology"},
    "META": {"name": "Meta Platforms", "sector": "Technology"},
    "AMZN": {"name": "Amazon.com Inc.", "sector": "Technology"},
    "TSM": {"name": "Taiwan Semiconductor", "sector": "Technology"},
    "AVGO": {"name": "Broadcom Inc.", "sector": "Technology"},
    "ORCL": {"name": "Oracle Corp.", "sector": "Technology"},
    "CRM": {"name": "Salesforce Inc.", "sector": "Technology"},
    "ADBE": {"name": "Adobe Inc.", "sector": "Technology"},
    "INTC": {"name": "Intel Corp.", "sector": "Technology"},
    "AMD": {"name": "AMD Inc.", "sector": "Technology"},
    "NFLX": {"name": "Netflix Inc.", "sector": "Technology"},
    "UBER": {"name": "Uber Technologies", "sector": "Technology"},
    # Finance
    "JPM": {"name": "JPMorgan Chase", "sector": "Finance"},
    "V": {"name": "Visa Inc.", "sector": "Finance"},
    "MA": {"name": "Mastercard Inc.", "sector": "Finance"},
    "BAC": {"name": "Bank of America", "sector": "Finance"},
    "GS": {"name": "Goldman Sachs", "sector": "Finance"},
    "MS": {"name": "Morgan Stanley", "sector": "Finance"},
    "WFC": {"name": "Wells Fargo", "sector": "Finance"},
    "AXP": {"name": "American Express", "sector": "Finance"},
    # Healthcare
    "JNJ": {"name": "Johnson & Johnson", "sector": "Healthcare"},
    "UNH": {"name": "UnitedHealth Group", "sector": "Healthcare"},
    "PFE": {"name": "Pfizer Inc.", "sector": "Healthcare"},
    "ABBV": {"name": "AbbVie Inc.", "sector": "Healthcare"},
    "MRK": {"name": "Merck & Co.", "sector": "Healthcare"},
    "LLY": {"name": "Eli Lilly", "sector": "Healthcare"},
    # Consumer
    "WMT": {"name": "Walmart Inc.", "sector": "Consumer"},
    "KO": {"name": "Coca-Cola Co.", "sector": "Consumer"},
    "PEP": {"name": "PepsiCo Inc.", "sector": "Consumer"},
    "MCD": {"name": "McDonald's Corp.", "sector": "Consumer"},
    "NKE": {"name": "Nike Inc.", "sector": "Consumer"},
    "SBUX": {"name": "Starbucks Corp.", "sector": "Consumer"},
    "COST": {"name": "Costco Wholesale", "sector": "Consumer"},
    # Automotive & Energy
    "TSLA": {"name": "Tesla Inc.", "sector": "Automotive"},
    "F": {"name": "Ford Motor Co.", "sector": "Automotive"},
    "GM": {"name": "General Motors", "sector": "Automotive"},
    "XOM": {"name": "ExxonMobil Corp.", "sector": "Energy"},
    "CVX": {"name": "Chevron Corp.", "sector": "Energy"},
    # Industrial & Telecom
    "BA": {"name": "Boeing Co.", "sector": "Industrial"},
    "CAT": {"name": "Caterpillar Inc.", "sector": "Industrial"},
    "DIS": {"name": "Walt Disney Co.", "sector": "Entertainment"},
    "T": {"name": "AT&T Inc.", "sector": "Telecom"},
    "VZ": {"name": "Verizon Comms.", "sector": "Telecom"},
    # Crypto & Fintech
    "COIN": {"name": "Coinbase Global", "sector": "Fintech"},
    "AFRM": {"name": "Affirm Holdings", "sector": "Fintech"},
    "PYPL": {"name": "PayPal Holdings", "sector": "Fintech"},
    "SOFI": {"name": "SoFi Technologies", "sector": "Fintech"},
}

# In-memory state
stock_data: Dict[str, dict] = {}
stock_history: Dict[str, List[dict]] = {ticker: [] for ticker in STOCK_TICKERS}
connected_clients: Set[WebSocket] = set()
data_ready = threading.Event()


def fetch_stock_data():
    """Fetch real stock data from Yahoo Finance."""
    global stock_data
    tickers_list = list(STOCK_TICKERS.keys())

    try:
        # Fetch current data for all tickers at once
        tickers_str = " ".join(tickers_list)
        data = yf.download(tickers_str, period="5d", interval="5m", group_by="ticker", progress=False)

        for ticker in tickers_list:
            try:
                if len(STOCK_TICKERS) > 1 and ticker in data.columns.get_level_values(0):
                    ticker_data = data[ticker].dropna()
                else:
                    ticker_data = data.dropna()

                if ticker_data.empty:
                    continue

                history = []
                for idx, row in ticker_data.iterrows():
                    ts = int(idx.timestamp())
                    candle = {
                        "time": ts,
                        "open": round(float(row["Open"]), 2),
                        "high": round(float(row["High"]), 2),
                        "low": round(float(row["Low"]), 2),
                        "close": round(float(row["Close"]), 2),
                        "volume": int(row["Volume"]),
                    }
                    history.append(candle)

                if history:
                    stock_history[ticker] = history[-200:]
                    last_candle = history[-1]
                    first_candle = history[0]
                    stock_data[ticker] = {
                        "name": STOCK_TICKERS[ticker]["name"],
                        "sector": STOCK_TICKERS[ticker]["sector"],
                        "price": last_candle["close"],
                        "change": round(last_candle["close"] - first_candle["open"], 2),
                        "change_percent": round(
                            ((last_candle["close"] - first_candle["open"]) / first_candle["open"]) * 100, 2
                        ),
                        "volume": last_candle["volume"],
                    }
            except Exception as e:
                print(f"Error processing {ticker}: {e}")
                continue

    except Exception as e:
        print(f"Error fetching data: {e}")

    data_ready.set()


def refresh_data_loop():
    """Background thread to periodically refresh stock data."""
    while True:
        fetch_stock_data()
        # Refresh every 60 seconds
        time.sleep(60)


# Start background data fetch
fetch_thread = threading.Thread(target=refresh_data_loop, daemon=True)
fetch_thread.start()


def simulate_tick(ticker: str) -> dict:
    """Generate a simulated price tick between real data refreshes."""
    if ticker not in stock_data or ticker not in stock_history:
        return {}

    current_price = stock_data[ticker]["price"]
    volatility = random.uniform(0.0005, 0.003)
    direction = random.choice([-1, 1])
    change_pct = direction * volatility

    open_price = current_price
    close_price = round(current_price * (1 + change_pct), 2)
    high_price = round(max(open_price, close_price) * (1 + random.uniform(0, 0.001)), 2)
    low_price = round(min(open_price, close_price) * (1 - random.uniform(0, 0.001)), 2)
    volume = random.randint(1000, 500000)

    stock_data[ticker]["price"] = close_price

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

    first_candle = stock_history[ticker][0]
    stock_data[ticker]["change"] = round(close_price - first_candle["open"], 2)
    stock_data[ticker]["change_percent"] = round(
        ((close_price - first_candle["open"]) / first_candle["open"]) * 100, 2
    )

    return candle


@app.get("/api/stocks")
async def get_stocks():
    data_ready.wait(timeout=30)
    result = []
    for ticker, info in stock_data.items():
        result.append({
            "ticker": ticker,
            "name": info["name"],
            "price": info["price"],
            "change": info["change"],
            "change_percent": info["change_percent"],
            "volume": info["volume"],
            "sector": info["sector"],
        })
    return sorted(result, key=lambda x: abs(x["change_percent"]), reverse=True)


@app.get("/api/stocks/{ticker}/history")
async def get_stock_history(ticker: str):
    ticker = ticker.upper()
    if ticker not in STOCK_TICKERS:
        return {"error": "Stock not found"}
    data_ready.wait(timeout=30)
    return {
        "ticker": ticker,
        "name": STOCK_TICKERS[ticker]["name"],
        "history": stock_history.get(ticker, []),
    }


@app.websocket("/ws/stocks")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)

    try:
        # Wait for initial data to be ready
        while not data_ready.is_set():
            await asyncio.sleep(0.5)

        # Send initial data
        await websocket.send_json({
            "type": "initial",
            "stocks": {
                ticker: {
                    "name": info["name"],
                    "price": info["price"],
                    "sector": info["sector"],
                    "history": stock_history.get(ticker, [])[-200:],
                }
                for ticker, info in stock_data.items()
            },
        })

        # Stream live updates
        while True:
            await asyncio.sleep(2)

            updates = {}
            for ticker in stock_data:
                candle = simulate_tick(ticker)
                if candle:
                    updates[ticker] = {
                        "candle": candle,
                        "price": stock_data[ticker]["price"],
                        "change": stock_data[ticker]["change"],
                        "change_percent": stock_data[ticker]["change_percent"],
                        "volume": candle["volume"],
                    }

            if updates:
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
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stocks_loaded": len(stock_data),
        "data_ready": data_ready.is_set(),
    }


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
