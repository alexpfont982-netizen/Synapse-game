import LegalPageLayout, {
  LegalSection,
} from '../../components/layout/LegalPageLayout'
import type { LegalPageProps } from './legalRoutes'

export default function TermsPage({ hasSession }: LegalPageProps) {
  const returnHref = hasSession ? '/dashboard' : '/'
  const returnLabel = hasSession ? 'Return to Dashboard' : 'Back to Access'

  return (
    <LegalPageLayout
      title="Terms"
      subtitle="Basic terms for using Synapse World Grid, its gameplay systems, marketplace surfaces and future monetization features."
      returnHref={returnHref}
      returnLabel={returnLabel}
    >
      <LegalSection title="Platform Use">
        <p>
          Synapse World Grid is provided as an evolving online platform. By using
          the app, you agree to use it lawfully, avoid abuse of the service and
          respect the intended gameplay, account and community systems.
        </p>
        <p>
          We may suspend or limit access if activity appears fraudulent,
          malicious, automated in unauthorized ways or harmful to the platform or
          other users.
        </p>
      </LegalSection>

      <LegalSection title="User Accounts">
        <p>
          You are responsible for maintaining the security of your account and
          credentials. You should provide accurate information when creating an
          account and keep your access methods protected.
        </p>
        <p>
          Synapse may update account requirements, authentication rules or access
          controls as the service matures.
        </p>
      </LegalSection>

      <LegalSection title="In-Game Economy and Wallet">
        <p>
          Wallet balances, in-game currencies, rewards, inventory items and other
          digital game assets are part of the Synapse gameplay economy. Unless the
          platform explicitly states otherwise, these values are gameplay-layer
          items and may have limited or no real-world monetary value.
        </p>
        <p>
          Economic rules, reward formulas, pricing, pool allocations, withdrawal
          requirements and availability of features may change over time as the
          game economy evolves.
        </p>
      </LegalSection>

      <LegalSection title="Marketplace and Listings">
        <p>
          Marketplace features may allow users to view, list, buy or trade
          eligible in-game items. Users are responsible for the content, pricing
          and legality of the listings they create within the allowed rules of the
          platform.
        </p>
        <p>
          Synapse may remove listings, pause transactions, limit categories or
          adjust marketplace rules when needed for security, balance or policy
          reasons.
        </p>
      </LegalSection>

      <LegalSection title="Analytics, Cookies and Ads">
        <p>
          The platform may use analytics, cookies and similar technologies to
          understand traffic, measure gameplay behavior, improve features and, in
          future versions, support advertising or monetization systems.
        </p>
        <p>
          Advertising services, including Google or similar providers, may be
          added later subject to privacy and cookie disclosures.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of Liability and Service Changes">
        <p>
          Synapse World Grid is offered on an evolving basis. Features may change,
          be delayed, become unavailable or be removed without prior notice. We do
          not guarantee uninterrupted access, permanent availability of any game
          mode or error-free operation.
        </p>
        <p>
          To the extent allowed by law, the project is not liable for indirect,
          incidental or consequential losses arising from use of the platform,
          gameplay economy or marketplace systems.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
