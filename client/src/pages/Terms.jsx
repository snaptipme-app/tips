import { Link } from 'react-router-dom';

const BG = '#1a1a1a';
const CARD = '#222222';
const GREEN = '#00C896';
const TEXT = 'rgba(255,255,255,0.85)';
const MUTED = 'rgba(255,255,255,0.55)';
const BORDER = 'rgba(255,255,255,0.08)';

const EFFECTIVE_DATE = 'April 29, 2026';

export default function Terms() {
  return (
    <div style={{ minHeight: '100dvh', background: BG, color: TEXT, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' }}>
        <Link to="/" style={{ color: GREEN, fontSize: 14, textDecoration: 'none' }}>← Back to SnapTip</Link>

        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginTop: 24, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: MUTED, marginBottom: 40, fontSize: 14 }}>Effective {EFFECTIVE_DATE}</p>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32, lineHeight: 1.7, fontSize: 15 }}>
          <p>
            These Terms of Service ("Terms") govern your use of SnapTip (the "Service"). By
            creating an account or sending a tip, you agree to these Terms. If you do not agree,
            do not use the Service.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>1. Eligibility</h2>
          <p>You must be at least 16 years old and legally able to enter into a contract.</p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>2. Accounts</h2>
          <ul style={{ paddingLeft: 22 }}>
            <li>You are responsible for the accuracy of the information you provide.</li>
            <li>You are responsible for keeping your credentials confidential.</li>
            <li>You may not impersonate others or create accounts on behalf of someone without authorization.</li>
          </ul>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>3. The tipping service</h2>
          <p>
            Tippers ("tourists") send voluntary gratuities to recipients ("employees") via the
            Service. SnapTip facilitates the transfer and may charge a platform fee disclosed
            before payment. Tips are non-refundable except where required by law.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>4. Withdrawals</h2>
          <p>
            Recipients may request withdrawals from their accumulated balance. Withdrawals are
            subject to identity verification, applicable fees, and minimum thresholds. SnapTip
            may delay or decline a withdrawal where there are reasonable grounds to suspect fraud,
            money laundering, or other unlawful activity.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>5. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul style={{ paddingLeft: 22 }}>
            <li>Use the Service for unlawful, fraudulent, or abusive purposes.</li>
            <li>Attempt to circumvent security, rate limits, or access controls.</li>
            <li>Reverse engineer, scrape, or load-test the Service without written permission.</li>
            <li>Upload content that infringes the rights of others, is defamatory, or violates law.</li>
          </ul>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>6. Suspension and termination</h2>
          <p>
            We may suspend or terminate accounts that violate these Terms or where we are
            required to do so by law. You may delete your account at any time from Settings;
            certain financial records may be retained as required by tax and AML regulations.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>7. Fees</h2>
          <p>
            Platform fees and payment-processor fees are disclosed at the time of a transaction.
            Fee schedules may change with notice; continued use after the change constitutes
            acceptance.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>8. Intellectual property</h2>
          <p>
            The SnapTip name, logo, and software are owned by SnapTip and its licensors. These
            Terms do not grant you any right to use our trademarks.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>9. Disclaimers</h2>
          <p>
            The Service is provided "as is" without warranties of any kind. We do not guarantee
            uninterrupted service, error-free operation, or specific outcomes.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>10. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, SnapTip's aggregate liability for any claim
            arising out of or relating to the Service is limited to the greater of (a) the total
            fees you paid us in the 12 months preceding the claim, or (b) USD 100.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>11. Indemnity</h2>
          <p>
            You agree to indemnify and hold harmless SnapTip from any claim arising out of your
            misuse of the Service or breach of these Terms.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>12. Governing law and disputes</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which SnapTip is
            established, without regard to conflict-of-law principles. Disputes will be resolved
            in the competent courts of that jurisdiction, except where mandatory consumer
            protection law gives you a different forum.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>13. Changes</h2>
          <p>
            We may update these Terms. Material changes will be posted here with a new effective
            date and, where required, notified to registered users by email.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>14. Contact</h2>
          <p>Questions about these Terms: <strong>support@snaptip.me</strong>.</p>
        </div>

        <p style={{ textAlign: 'center', color: MUTED, fontSize: 13, marginTop: 32 }}>
          See also: <Link to="/privacy" style={{ color: GREEN }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
