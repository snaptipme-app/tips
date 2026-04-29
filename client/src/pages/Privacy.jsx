import { Link } from 'react-router-dom';

const BG = '#080818';
const CARD = '#0d1117';
const GREEN = '#00C896';
const TEXT = 'rgba(255,255,255,0.85)';
const MUTED = 'rgba(255,255,255,0.55)';
const BORDER = 'rgba(255,255,255,0.08)';

const EFFECTIVE_DATE = 'April 29, 2026';

export default function Privacy() {
  return (
    <div style={{ minHeight: '100dvh', background: BG, color: TEXT, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' }}>
        <Link to="/" style={{ color: GREEN, fontSize: 14, textDecoration: 'none' }}>← Back to SnapTip</Link>

        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginTop: 24, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: MUTED, marginBottom: 40, fontSize: 14 }}>Effective {EFFECTIVE_DATE}</p>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32, lineHeight: 1.7, fontSize: 15 }}>
          <p>
            SnapTip ("we", "us", "our") provides a digital tipping platform for service workers
            and tourists. This Privacy Policy explains what personal data we collect, why we
            collect it, how we use it, and the rights you have under the GDPR (EU/UK), CCPA
            (California), and analogous data-protection laws.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>1. Data we collect</h2>
          <ul style={{ paddingLeft: 22 }}>
            <li><strong>Account data:</strong> name, email, username, password (hashed with bcrypt), country, currency, profile photo, job title.</li>
            <li><strong>Tipping data:</strong> tip amount, currency, payment method, tourist email (when provided), timestamps.</li>
            <li><strong>Withdrawal data:</strong> bank/wallet identifiers (encrypted at rest with pgcrypto), method, contact phone.</li>
            <li><strong>Technical data:</strong> IP address (hashed in audit logs), user agent, login timestamps, push notification token.</li>
            <li><strong>Cookies:</strong> a single httpOnly authentication cookie. We do not use third-party advertising or analytics cookies.</li>
          </ul>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>2. Why we process your data</h2>
          <ul style={{ paddingLeft: 22 }}>
            <li>To operate the tipping service (legal basis: contract).</li>
            <li>To prevent fraud, abuse, and unauthorized access (legal basis: legitimate interest).</li>
            <li>To comply with tax, accounting, and anti-money-laundering obligations (legal basis: legal obligation).</li>
            <li>To send transactional emails (verification codes, withdrawal confirmations) — never marketing without explicit opt-in.</li>
          </ul>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>3. Who we share data with</h2>
          <p>
            We do not sell personal data. We share only with processors strictly required to run
            the service:
          </p>
          <ul style={{ paddingLeft: 22 }}>
            <li><strong>Payment processors</strong> (e.g. Stripe, when enabled) — to settle tips.</li>
            <li><strong>Email service</strong> (Brevo SMTP) — to deliver verification and notification emails.</li>
            <li><strong>Cloud hosting</strong> — VPS provider serving the application and database.</li>
            <li><strong>Cloudflare</strong> — DDoS protection, WAF, and CDN at the network edge.</li>
            <li><strong>Lawful authorities</strong> — if compelled by valid legal process.</li>
          </ul>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>4. How long we keep data</h2>
          <ul style={{ paddingLeft: 22 }}>
            <li>Active account data: while the account is active.</li>
            <li>Deleted accounts: soft-deleted for 30 days (recoverable), then permanently purged.</li>
            <li>Financial records (payments, withdrawals): up to 7 years to comply with tax/accounting laws.</li>
            <li>Audit logs: 12 months for security investigation.</li>
          </ul>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>5. Your rights</h2>
          <p>You have the right to:</p>
          <ul style={{ paddingLeft: 22 }}>
            <li><strong>Access / portability:</strong> download a JSON copy of your data via the app or by emailing us.</li>
            <li><strong>Rectification:</strong> correct inaccurate data from your profile.</li>
            <li><strong>Erasure:</strong> delete your account from Settings — this triggers a 30-day soft-delete then permanent purge. Some financial records may be retained for legal compliance.</li>
            <li><strong>Object / restrict processing.</strong></li>
            <li><strong>Lodge a complaint</strong> with your local data-protection authority.</li>
          </ul>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>6. Security</h2>
          <p>
            We use TLS 1.2+ in transit, bcrypt-hashed passwords, pgcrypto field-level encryption
            for sensitive identifiers (e.g. IBAN/RIB), Cloudflare WAF, rate limiting, and audit
            logging. No system is perfectly secure — please report suspected vulnerabilities to
            <strong> security@snaptip.me</strong>.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>7. International transfers</h2>
          <p>
            Data may be processed in jurisdictions different from yours. Where data leaves the
            EU/UK, we rely on Standard Contractual Clauses or equivalent safeguards.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>8. Children</h2>
          <p>SnapTip is not directed at children under 16. We do not knowingly collect their data.</p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>9. Changes to this policy</h2>
          <p>
            We will post material changes here with a new effective date and, where required,
            notify registered users by email.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, marginTop: 32, marginBottom: 12 }}>10. Contact</h2>
          <p>
            Privacy questions or rights requests: <strong>privacy@snaptip.me</strong>.
            <br />Security disclosures: <strong>security@snaptip.me</strong>.
          </p>
        </div>

        <p style={{ textAlign: 'center', color: MUTED, fontSize: 13, marginTop: 32 }}>
          See also: <Link to="/terms" style={{ color: GREEN }}>Terms of Service</Link>
        </p>
      </div>
    </div>
  );
}
