import { BrainCircuit, ChevronRight } from 'lucide-react'
import type { NavItem } from '../types'

interface SidebarProps {
  items: NavItem[]
  activeItem: string
  onSelect: (item: NavItem) => void
}

interface SidebarItemProps {
  item: NavItem
  active: boolean
  onClick: () => void
}

function SidebarItem({ item, active, onClick }: SidebarItemProps) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group flex w-full items-center justify-between rounded-[20px] border px-3 py-2.5 text-left transition-all duration-200 ${
        active
          ? 'border-cyan-400/40 bg-cyan-400/12 text-white shadow-[0_0_24px_rgba(34,211,238,0.14)]'
          : 'border-white/6 bg-white/[0.025] text-slate-300 hover:border-violet-400/24 hover:bg-violet-400/[0.07] hover:text-white'
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-[18px] border ${
            active
              ? 'border-cyan-300/25 bg-cyan-400/12 text-cyan-100'
              : 'border-white/6 bg-white/[0.03] text-slate-400 group-hover:border-violet-400/25 group-hover:bg-violet-400/12 group-hover:text-violet-100'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="text-sm font-medium tracking-[0.02em]">{item.label}</span>
      </span>

      <ChevronRight
        className={`h-4 w-4 transition-transform duration-200 ${
          active
            ? 'text-cyan-100'
            : 'text-slate-500 group-hover:translate-x-0.5 group-hover:text-violet-200'
        }`}
      />
    </button>
  )
}

export function Sidebar({ items, activeItem, onSelect }: SidebarProps) {
  return (
    <aside className="surface-panel rounded-[24px] p-3 md:p-3.5">
      <div className="mb-3.5 flex items-start gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-cyan-400/20 bg-cyan-400/10 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.12)]">
          <BrainCircuit className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0">
          <p className="font-display text-[1rem] tracking-[0.14em] text-white">
            Synapse
          </p>
          <p className="mt-0.5 text-[12px] text-slate-400">World Grid</p>
        </div>
      </div>

      <nav className="space-y-1.5" aria-label="Navegacion principal del dashboard">
        {items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            active={item.id === activeItem}
            onClick={() => onSelect(item)}
          />
        ))}
      </nav>

      <div className="mt-3 flex items-center gap-2 rounded-[16px] border border-violet-400/16 bg-violet-500/[0.05] px-2.5 py-2 text-[11px] text-slate-300">
        <span className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.9)]" />
        <span className="uppercase tracking-[0.2em] text-violet-100/90">
          Mock data
        </span>
      </div>
    </aside>
  )
}
