import type { StockState } from '../types/stock';

interface MarketOverviewProps {
  stocks: Record<string, StockState>;
}

export function MarketOverview({ stocks }: MarketOverviewProps) {
  const stockList = Object.values(stocks);
  const gainers = stockList.filter((s) => s.change >= 0).length;
  const losers = stockList.length - gainers;
  const totalVolume = stockList.reduce((sum, s) => sum + s.volume, 0);
  const avgChange = stockList.length > 0
    ? stockList.reduce((sum, s) => sum + s.change_percent, 0) / stockList.length
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatCard label="Stocks Tracked" value={stockList.length.toString()} />
      <StatCard
        label="Gainers / Losers"
        value={`${gainers} / ${losers}`}
        valueColor={gainers >= losers ? 'text-[#22c55e]' : 'text-[#ef4444]'}
      />
      <StatCard
        label="Avg Change"
        value={`${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`}
        valueColor={avgChange >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}
      />
      <StatCard
        label="Total Volume"
        value={formatLargeNumber(totalVolume)}
      />
    </div>
  );
}

function StatCard({ label, value, valueColor = 'text-white' }: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="p-3 rounded-xl border border-[#2a2e3f] bg-[#1e2235]">
      <p className="text-xs text-[#8b8fa3] mb-1">{label}</p>
      <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}
