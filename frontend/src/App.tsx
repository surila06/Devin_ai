import { useState, useMemo } from 'react';
import { useStockWebSocket } from './hooks/useStockWebSocket';
import { Header } from './components/Header';
import { MarketOverview } from './components/MarketOverview';
import { StockCard } from './components/StockCard';
import { StockChart } from './components/StockChart';
import { SearchBar } from './components/SearchBar';

function App() {
  const { stocks, connected, lastUpdate } = useStockWebSocket();
  const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const stockList = Object.values(stocks);

  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return stockList;
    const query = searchQuery.toLowerCase();
    return stockList.filter(
      (stock) =>
        stock.ticker.toLowerCase().includes(query) ||
        stock.name.toLowerCase().includes(query) ||
        stock.sector.toLowerCase().includes(query)
    );
  }, [stockList, searchQuery]);

  const selectedStock = stocks[selectedTicker];

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <Header connected={connected} lastUpdate={lastUpdate} />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <MarketOverview stocks={stocks} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-[#8b8fa3] uppercase tracking-wider mb-3">
              Watchlist
            </h2>
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
              {filteredStocks.length > 0 ? (
                filteredStocks.map((stock) => (
                  <StockCard
                    key={stock.ticker}
                    stock={stock}
                    isSelected={stock.ticker === selectedTicker}
                    onClick={() => setSelectedTicker(stock.ticker)}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#8b8fa3] text-sm">No stocks matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Chart Area */}
          <div className="lg:col-span-2">
            {selectedStock ? (
              <div className="rounded-xl border border-[#2a2e3f] bg-[#1e2235] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">
                        {selectedStock.ticker}
                      </h2>
                      <span className="text-sm text-[#8b8fa3]">
                        {selectedStock.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-3xl font-bold text-white">
                        ${selectedStock.price.toFixed(2)}
                      </span>
                      <span className={`text-lg font-semibold ${
                        selectedStock.change >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                      }`}>
                        {selectedStock.change >= 0 ? '+' : ''}
                        {selectedStock.change.toFixed(2)} ({selectedStock.change_percent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#8b8fa3]">Volume</p>
                    <p className="text-lg font-semibold text-white">
                      {selectedStock.volume.toLocaleString()}
                    </p>
                  </div>
                </div>

                <StockChart
                  history={selectedStock.history}
                  ticker={selectedStock.ticker}
                />

                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#2a2e3f]">
                  <MiniStat label="Open" value={`$${selectedStock.history[selectedStock.history.length - 1]?.open.toFixed(2) ?? '-'}`} />
                  <MiniStat label="High" value={`$${selectedStock.history[selectedStock.history.length - 1]?.high.toFixed(2) ?? '-'}`} />
                  <MiniStat label="Low" value={`$${selectedStock.history[selectedStock.history.length - 1]?.low.toFixed(2) ?? '-'}`} />
                  <MiniStat label="Close" value={`$${selectedStock.price.toFixed(2)}`} />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#2a2e3f] bg-[#1e2235] p-10 flex items-center justify-center h-full">
                <p className="text-[#8b8fa3]">
                  {Object.keys(stocks).length === 0
                    ? 'Connecting to market data...'
                    : 'Select a stock to view chart'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#8b8fa3]">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export default App;
