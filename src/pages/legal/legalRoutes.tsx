import type { ReactElement } from 'react'
import { normalizePathname } from '../../utils/navigation'
import ContactPage from './ContactPage'
import CookiePolicyPage from './CookiePolicyPage'
import PrivacyPolicyPage from './PrivacyPolicyPage'
import SupportPage from './SupportPage'
import TermsPage from './TermsPage'

export interface LegalPageProps {
  hasSession: boolean
}

export const LEGAL_ROUTE_PATHS = [
  '/terms',
  '/privacy',
  '/cookies',
  '/contact',
  '/support',
] as const

export type LegalRoutePath = (typeof LEGAL_ROUTE_PATHS)[number]

export function isLegalRoute(pathname: string): pathname is LegalRoutePath {
  const normalizedPath = normalizePathname(pathname)
  return LEGAL_ROUTE_PATHS.includes(normalizedPath as LegalRoutePath)
}

export function renderLegalRoute(
  pathname: string,
  hasSession: boolean,
): ReactElement | null {
  const normalizedPath = normalizePathname(pathname)

  switch (normalizedPath) {
    case '/terms':
      return <TermsPage hasSession={hasSession} />
    case '/privacy':
      return <PrivacyPolicyPage hasSession={hasSession} />
    case '/cookies':
      return <CookiePolicyPage hasSession={hasSession} />
    case '/contact':
      return <ContactPage hasSession={hasSession} />
    case '/support':
      return <SupportPage hasSession={hasSession} />
    default:
      return null
  }
}
