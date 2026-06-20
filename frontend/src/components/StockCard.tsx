import type { StockState } from '../types/stock';

interface StockCardProps {
  stock: StockState;
  isSelected: boolean;
  onClick: () => void;
}

export function StockCard({ stock, isSelected, onClick }: StockCardProps) {
  const isPositive = stock.change >= 0;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
        isSelected
          ? 'border-[#6366f1] bg-[#6366f1]/10 shadow-lg shadow-[#6366f1]/5'
          : 'border-[#2a2e3f] bg-[#1e2235] hover:border-[#3a3e5f] hover:bg-[#242840]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-white">{stock.ticker}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#2a2e3f] text-[#8b8fa3]">
            {stock.sector}
          </span>
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
        }`}>
          <span>{isPositive ? '▲' : '▼'}</span>
          <span>{Math.abs(stock.change_percent).toFixed(2)}%</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-[#8b8fa3] truncate max-w-[140px]">{stock.name}</p>
          <p className="text-xl font-semibold text-white mt-1">
            ${stock.price.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${
            isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
          }`}>
            {isPositive ? '+' : ''}{stock.change.toFixed(2)}
          </p>
          <p className="text-xs text-[#8b8fa3] mt-1">
            Vol: {formatVolume(stock.volume)}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M';
  if (vol >= 1_000) return (vol / 1_000).toFixed(1) + 'K';
  return vol.toString();
}
