import LegalPageLayout, {
  LegalSection,
} from '../../components/layout/LegalPageLayout'
import type { LegalPageProps } from './legalRoutes'

export default function PrivacyPolicyPage({ hasSession }: LegalPageProps) {
  const returnHref = hasSession ? '/dashboard' : '/'
  const returnLabel = hasSession ? 'Return to Dashboard' : 'Back to Access'

  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="Base privacy language for future analytics, cookie consent and ad-related integrations."
      returnHref={returnHref}
      returnLabel={returnLabel}
    >
      <LegalSection title="What Synapse May Collect">
        <p>
          Synapse World Grid may collect account information, gameplay activity,
          wallet-related usage data, support requests and other information needed
          to operate the platform.
        </p>
        <p>
          We may also collect usage and measurement data such as visits, pages
          viewed, clicks, feature events, session timing, general in-app
          behavior, device type, browser, operating environment and approximate
          country or region.
        </p>
      </LegalSection>

      <LegalSection title="Analytics and Measurement Tools">
        <p>
          The project may use Google Analytics or similar analytics and
          measurement tools to understand traffic, player journeys, feature usage
          and general performance of the platform.
        </p>
        <p>
          These tools may measure visits, page views, events, device information,
          browser information, approximate location data and overall behavior
          inside Synapse World Grid.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and Similar Identifiers">
        <p>
          Synapse may use cookies, local storage or similar identifiers to keep
          the platform functional, remember settings, measure usage and support
          future analytics or advertising integrations.
        </p>
        <p>
          More specific information about these technologies is described in the
          Cookie Policy and may be expanded when a consent banner is implemented.
        </p>
      </LegalSection>

      <LegalSection title="How Data May Be Used">
        <p>
          Collected information may be used to operate the service, improve
          product quality, diagnose issues, protect account security, measure
          feature adoption, support game economy monitoring and respond to user
          inquiries.
        </p>
        <p>
          If advertising tools are added in the future, measurement data may also
          be used to understand campaign or ad performance in a privacy-aware
          manner.
        </p>
      </LegalSection>

      <LegalSection title="Data Sharing and Selling">
        <p>
          Synapse World Grid should not sell personal information of users. We
          may share limited data with service providers that help run hosting,
          authentication, analytics, infrastructure or moderation functions, only
          as reasonably needed to operate the platform.
        </p>
      </LegalSection>

      <LegalSection title="Privacy Questions">
        <p>
          Users may contact the project with privacy-related questions,
          correction requests or concerns about data usage.
        </p>
        <p>
          Contact placeholder: <a className="text-cyan-300 transition hover:text-cyan-200" href="mailto:support@synapseworldgrid.com">support@synapseworldgrid.com</a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
