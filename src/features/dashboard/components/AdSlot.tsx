interface AdSlotProps {
  position: 'top-banner' | 'right-rail'
  size: '728x90' | '300x250' | 'responsive'
  label: string
}

export function AdSlot({ position, size, label }: AdSlotProps) {
  const isBanner = position === 'top-banner'

  return (
    <section
      aria-label={`${label} ${size}`}
      className={`surface-panel overflow-hidden rounded-[22px] border border-slate-400/12 ${
        isBanner ? 'min-h-[96px] px-4 py-3' : 'min-h-[250px] px-4 py-4'
      }`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(12,18,36,0.98),rgba(8,12,24,0.92))]" />
      <div className="absolute inset-[10px] rounded-[16px] border border-dashed border-cyan-400/18" />

      <div
        className={`relative z-10 flex h-full ${
          isBanner
            ? 'flex-col items-center justify-center gap-2 text-center'
            : 'flex-col items-center justify-center gap-3 text-center'
        }`}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/14 bg-cyan-400/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-100/90">
          Advertisement
        </div>

        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="mt-1 text-[12px] uppercase tracking-[0.24em] text-slate-500">
            {size}
          </p>
        </div>
      </div>
    </section>
  )
}
