interface TopResourceBarProps {
  performanceScore: number;
  balance: number
}

export function TopResourceBar({
  performanceScore,
  balance,
}: TopResourceBarProps) {
  return (
    <div className="flex w-full items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
        <span className="text-sm font-bold tracking-widest text-white">
          SYNAPSE CLUSTER
        </span>
      </div>

      <div className="flex gap-6">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            AI PERFORMANCE
          </span>
          <div className="font-mono text-lg font-bold text-cyan-400">
            {performanceScore ? performanceScore.toLocaleString() : 0} PTS
          </div>
        </div>

        <div className="w-px self-stretch bg-slate-800" />

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            NCR BALANCE
          </span>
          <div className="font-mono text-lg font-bold text-emerald-400">
            {balance.toLocaleString()}{' '}
            <span className="text-xs text-emerald-700">NCR</span>
          </div>
        </div>
      </div>
    </div>
  );
}
