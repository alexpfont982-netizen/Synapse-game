import type { ReactNode } from 'react'
import Footer from '../../../components/layout/Footer'

interface DashboardLayoutProps {
  sidebar: ReactNode
  topBar: ReactNode
  aside: ReactNode
  children: ReactNode
}

export function DashboardLayout({
  sidebar,
  topBar,
  aside,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="flex-1 px-3 py-3 sm:px-4 lg:px-5 xl:px-6 xl:py-4">
        <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[196px_minmax(0,1fr)_240px] lg:gap-12">
          <div className="lg:sticky lg:top-4 lg:self-start">{sidebar}</div>

          <main className="min-w-0 w-full space-y-3 md:space-y-4">
            {topBar}
            {children}
          </main>

          <div className="lg:sticky lg:top-4 lg:self-start lg:justify-self-end">
            {aside}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
