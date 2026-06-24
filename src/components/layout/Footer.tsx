import type { MouseEvent } from 'react'
import { navigateTo } from '../../utils/navigation'
import './Footer.css'

const footerLinks = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Cookie Policy', href: '/cookies' },
  { label: 'Contact', href: '/contact' },
  { label: 'Support', href: '/support' },
] as const

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

export default function Footer() {
  const handleLinkClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!shouldHandleInAppNavigation(event)) {
      return
    }

    event.preventDefault()
    navigateTo(href)
  }

  return (
    <footer className="synapse-footer" role="contentinfo">
      <div className="synapse-footer__inner">
        <div className="synapse-footer__brand">
          <span className="synapse-footer__title">
            SYNAPSE WORLD GRID &copy; 2026
          </span>
        </div>

        <nav className="synapse-footer__nav" aria-label="Footer">
          {footerLinks.map((link, index) => (
            <span key={link.label} className="synapse-footer__link-group">
              {index > 0 && (
                <span className="synapse-footer__separator" aria-hidden="true">
                  &middot;
                </span>
              )}
              <a
                className="synapse-footer__link"
                href={link.href}
                onClick={(event) => handleLinkClick(event, link.href)}
              >
                {link.label}
              </a>
            </span>
          ))}
        </nav>

        <div className="synapse-footer__meta">
          <span className="synapse-footer__status">
            <span className="synapse-footer__status-dot" aria-hidden="true" />
            Status: Online
          </span>
          <span className="synapse-footer__version">Alpha 0.1.0</span>
        </div>
      </div>
    </footer>
  )
}
