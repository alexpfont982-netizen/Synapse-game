import { ChevronRight } from 'lucide-react'
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


    </aside>
  )
}