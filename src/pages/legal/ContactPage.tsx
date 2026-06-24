import LegalPageLayout, {
  LegalSection,
} from '../../components/layout/LegalPageLayout'
import type { LegalPageProps } from './legalRoutes'

export default function ContactPage({ hasSession }: LegalPageProps) {
  const returnHref = hasSession ? '/dashboard' : '/'
  const returnLabel = hasSession ? 'Return to Dashboard' : 'Back to Access'

  return (
    <LegalPageLayout
      title="Contact"
      subtitle="A simple contact surface for players, testers and future partners."
      returnHref={returnHref}
      returnLabel={returnLabel}
    >
      <LegalSection title="Get in Touch">
        <p>
          Users can contact the Synapse World Grid team with questions about the
          platform, privacy, support requests or general feedback.
        </p>
        <p>
          Contact placeholder: <a className="text-cyan-300 transition hover:text-cyan-200" href="mailto:support@synapseworldgrid.com">support@synapseworldgrid.com</a>
        </p>
      </LegalSection>

      <LegalSection title="Current Scope">
        <p>
          This page is intentionally lightweight for now. No backend form or
          message processing workflow has been added in this pass.
        </p>
        <p>
          If a formal support or business contact flow is needed later, this page
          is ready to host it without changing the overall navigation structure.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
