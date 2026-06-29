import type { ReactNode } from 'react'
import Footer from '../../../components/layout/Footer'

interface DashboardLayoutProps {
  sidebar: ReactNode
  topBar: ReactNode
  aside: ReactNode
  children: ReactNode
  header?: ReactNode
}

export function DashboardLayout({
  sidebar,
  topBar,
  aside,
  children,
  header,
}: DashboardLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden" style={{ minWidth: '800px' }}>
      {header}
      <div className="flex-1 px-2 py-2">
        <div
          className="grid w-full grid-cols-1 gap-2"
          style={{
            gridTemplateColumns: 'clamp(140px, 13%, 196px) minmax(0, 1fr) clamp(260px, 22%, 420px)',
            gap: 'clamp(4px, 0.5%, 12px)',
          }}
        >
          {/* Sidebar */}
          <div className="sticky top-2 self-start">
            {sidebar}
          </div>

          {/* Main content */}
          <main className="min-w-0 w-full space-y-2">
            {topBar}
            {children}
          </main>

          {/* Aside / Benchmark */}
          <div className="sticky top-2 self-start w-full">
            {aside}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}