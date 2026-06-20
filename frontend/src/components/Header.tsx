interface HeaderProps {
  connected: boolean;
  lastUpdate: string;
}

export function Header({ connected, lastUpdate }: HeaderProps) {
  return (
    <header className="border-b border-[#2a2e3f] bg-[#1a1d29]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">StockPulse</h1>
            <p className="text-xs text-[#8b8fa3]">Real-time Market Data</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-xs text-[#8b8fa3] hidden sm:block">
              Last update: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connected ? 'bg-[#22c55e] animate-pulse' : 'bg-[#ef4444]'
            }`} />
            <span className="text-xs font-medium text-[#8b8fa3]">
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
