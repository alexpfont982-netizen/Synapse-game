import LegalPageLayout, {
  LegalSection,
} from '../../components/layout/LegalPageLayout'
import type { LegalPageProps } from './legalRoutes'

export default function SupportPage({ hasSession }: LegalPageProps) {
  const returnHref = hasSession ? '/dashboard' : '/'
  const returnLabel = hasSession ? 'Return to Dashboard' : 'Back to Access'

  return (
    <LegalPageLayout
      title="Support"
      subtitle="Basic support structure for account, wallet and marketplace questions."
      returnHref={returnHref}
      returnLabel={returnLabel}
    >
      <LegalSection title="Frequently Asked Questions">
        <p>
          <strong className="text-slate-100">Account issues:</strong> If you
          cannot access your account or profile data looks incomplete, contact the
          team with your username, the issue you saw and any relevant timestamps.
        </p>
        <p>
          <strong className="text-slate-100">Wallet issues:</strong> If balances,
          payout history or withdrawal validation appear incorrect, include the
          currency involved and a short description of what the wallet screen is
          showing.
        </p>
        <p>
          <strong className="text-slate-100">Marketplace issues:</strong> If a
          listing, purchase flow or price display looks wrong, note the item,
          action attempted and what outcome you expected.
        </p>
      </LegalSection>

      <LegalSection title="Before Contacting Support">
        <p>
          Helpful details include your account email, browser, device type,
          approximate time of the issue and any screenshots or reproduction steps
          that can help the team investigate.
        </p>
      </LegalSection>

      <LegalSection title="Support Contact">
        <p>
          Support placeholder: <a className="text-cyan-300 transition hover:text-cyan-200" href="mailto:support@synapseworldgrid.com">support@synapseworldgrid.com</a>
        </p>
        <p>
          A more advanced support center, ticketing flow or help widget can be
          added later without replacing this route.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
