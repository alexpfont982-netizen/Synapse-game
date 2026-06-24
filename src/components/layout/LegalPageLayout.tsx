import type { MouseEvent, ReactNode } from 'react'
import { navigateTo } from '../../utils/navigation'

interface LegalPageLayoutProps {
  title: string
  subtitle?: string
  lastUpdated?: string
  returnHref: string
  returnLabel: string
  children: ReactNode
}

interface LegalSectionProps {
  title: string
  children: ReactNode
}

function shouldHandleInAppNavigation(
  event: MouseEvent<HTMLAnchorElement>,
) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="surface-panel rounded-[24px] px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="font-display text-lg tracking-[0.12em] text-white sm:text-xl">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300">
        {children}
      </div>
    </section>
  )
}

export default function LegalPageLayout({
  title,
  subtitle,
  lastUpdated = 'Prepared for analytics, cookies and advertising compliance work.',
  returnHref,
  returnLabel,
  children,
}: LegalPageLayoutProps) {
  const handleReturnClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!shouldHandleInAppNavigation(event)) {
      return
    }

    event.preventDefault()
    navigateTo(returnHref)
  }

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="surface-panel rounded-[30px] px-5 py-6 sm:px-7 lg:px-10 lg:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-cyan-100">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
                Legal & Policy
              </span>
              <h1 className="mt-4 font-display text-3xl tracking-[0.12em] text-white sm:text-4xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  {subtitle}
                </p>
              )}
              <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                {lastUpdated}
              </p>
            </div>

            <a
              href={returnHref}
              onClick={handleReturnClick}
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/20 bg-slate-950/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100 transition hover:border-cyan-300/45 hover:text-cyan-200"
            >
              {returnLabel}
            </a>
          </div>
        </section>

        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}
