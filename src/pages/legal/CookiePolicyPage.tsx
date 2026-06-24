import LegalPageLayout, {
  LegalSection,
} from '../../components/layout/LegalPageLayout'
import type { LegalPageProps } from './legalRoutes'

export default function CookiePolicyPage({ hasSession }: LegalPageProps) {
  const returnHref = hasSession ? '/dashboard' : '/'
  const returnLabel = hasSession ? 'Return to Dashboard' : 'Back to Access'

  return (
    <LegalPageLayout
      title="Cookie Policy"
      subtitle="Base cookie disclosure prepared for future consent management and advertising integrations."
      returnHref={returnHref}
      returnLabel={returnLabel}
    >
      <LegalSection title="What Cookies Are">
        <p>
          Cookies are small data files stored on a device when a user visits a
          website or web application. Similar technologies can also include local
          storage, tags, pixels or identifiers used to remember settings and
          understand usage.
        </p>
      </LegalSection>

      <LegalSection title="Types of Cookies Synapse May Use">
        <p>
          Synapse World Grid may use necessary cookies to keep the app working,
          analytical cookies to measure visits and feature usage, and
          advertising-related cookies if promotional or monetization systems are
          added later.
        </p>
        <p>
          Necessary cookies may support login state, security, preferences or
          core navigation. Analytical cookies may support aggregate reporting on
          traffic, page views and product interactions.
        </p>
      </LegalSection>

      <LegalSection title="Third-Party Cookies">
        <p>
          Google or other third parties may use cookies or similar technologies
          for analytics, measurement and advertising when those services are
          enabled. This can include tools for audience measurement, campaign
          performance or ad delivery.
        </p>
      </LegalSection>

      <LegalSection title="Your Choices">
        <p>
          When a cookie consent banner is implemented, users should be able to
          accept or reject non-essential cookies such as analytics or advertising
          cookies.
        </p>
        <p>
          Until that consent layer is added, this page serves as the baseline
          disclosure so the project is ready for future implementation work.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
