import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { MarketingFooter } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'DARE Privacy Policy — how we collect, use, and protect your personal data.',
  robots: { index: false },
};

const EFFECTIVE_DATE = '1 June 2026';
const COMPANY = 'DARE Technologies Ltd';
const CONTACT_EMAIL = 'privacy@darechallenge.app';
const DPO_EMAIL = 'dpo@darechallenge.app';

export default function PrivacyPage() {
  return (
    <>
      <main className="min-h-screen bg-brand-bg">
        <div className="mx-auto max-w-3xl px-6 py-16">

          {/* Draft banner */}
          <div className="mb-10 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/8 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="text-sm font-semibold text-yellow-300">Draft — pending legal review</p>
              <p className="mt-0.5 text-xs text-yellow-300/70">
                This is a working draft. The final version will be supplied by our legal team before
                public launch. Do not rely on this document for legal advice.
              </p>
            </div>
          </div>

          <p className="font-mono text-xs uppercase text-brand-primary">Legal</p>
          <h1 className="mt-2 font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: {EFFECTIVE_DATE}
          </p>

          <div className="mt-12 space-y-10 text-sm leading-7 text-muted-foreground">

            <section>
              <p>
                <strong className="text-foreground">{COMPANY}</strong> (&quot;DARE&quot;,
                &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your
                personal data. This Privacy Policy explains what data we collect, why we collect it,
                how we use it, and your rights under applicable data protection law, including the{' '}
                <strong className="text-foreground">
                  Nigeria Data Protection Act 2023 (NDPA)
                </strong>{' '}
                and the{' '}
                <strong className="text-foreground">
                  Kenya Data Protection Act 2019 (KDPA)
                </strong>
                .
              </p>
              <p className="mt-4">
                By using the DARE Platform you confirm that you have read and understood this Policy.
              </p>
            </section>

            <Section title="1. Data We Collect">
              <Subsection title="1.1 Account and Registration Data">
                <p>
                  When you create an account: name, email address, phone number, username, date of
                  birth, and country of residence.
                </p>
              </Subsection>
              <Subsection title="1.2 Identity Verification (KYC) Data">
                <p>
                  To comply with our regulatory obligations we collect: government-issued ID
                  (passport, national ID, or driver&apos;s licence), a live selfie, and proof of
                  address where required. This data is processed by our third-party KYC provider
                  and stored in accordance with their security standards.
                </p>
              </Subsection>
              <Subsection title="1.3 Financial Data">
                <p>
                  Deposit and withdrawal transaction records, payment method details (managed by
                  our payment processor — we do not store full card numbers), and wallet balances.
                  All financial data is processed in compliance with PCI DSS standards via our
                  payment partner.
                </p>
              </Subsection>
              <Subsection title="1.4 Challenge and Activity Data">
                <p>
                  Challenges you create or accept, evidence you submit, jury votes you cast, your
                  win/loss record, and in-app communications related to a challenge.
                </p>
              </Subsection>
              <Subsection title="1.5 Device and Technical Data">
                <p>
                  IP address, device type, operating system, app version, session timestamps, crash
                  reports, and analytics events (e.g. features used, screens viewed). We use this
                  data solely to operate, debug, and improve the Platform.
                </p>
              </Subsection>
              <Subsection title="1.6 Communications">
                <p>
                  Messages you send to our support team, feedback submissions, and waitlist
                  sign-ups. If you opt in to SMS alerts, your phone number is used for that purpose
                  only.
                </p>
              </Subsection>
            </Section>

            <Section title="2. How We Use Your Data">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="py-2 pr-4 text-left font-semibold text-foreground">Purpose</th>
                    <th className="py-2 text-left font-semibold text-foreground">Legal basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ['Create and manage your account', 'Contract performance'],
                    ['Verify your identity and age (KYC)', 'Legal obligation'],
                    ['Process deposits, withdrawals, and escrow', 'Contract performance'],
                    ['Facilitate challenges and settle disputes', 'Contract performance'],
                    ['Detect fraud, collusion, and AML violations', 'Legal obligation / Legitimate interest'],
                    ['Send transactional notifications (challenge updates, settlement)', 'Contract performance'],
                    ['Send marketing communications (with consent)', 'Consent'],
                    ['Improve Platform features and fix bugs', 'Legitimate interest'],
                    ['Comply with regulatory reporting requirements', 'Legal obligation'],
                  ].map(([purpose, basis]) => (
                    <tr key={purpose}>
                      <td className="py-2 pr-4 text-muted-foreground">{purpose}</td>
                      <td className="py-2 text-muted-foreground">{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="3. Data Sharing">
              <p>We do not sell your personal data. We share it only with:</p>
              <ul>
                <li>
                  <strong className="text-foreground">Payment processors</strong> (e.g. Paystack) —
                  to process transactions.
                </li>
                <li>
                  <strong className="text-foreground">KYC providers</strong> — to verify your
                  identity as required by law.
                </li>
                <li>
                  <strong className="text-foreground">Cloud infrastructure providers</strong> (e.g.
                  Supabase / AWS) — to host and operate the Platform.
                </li>
                <li>
                  <strong className="text-foreground">Analytics providers</strong> — for aggregated,
                  anonymised usage analytics, including Google Analytics where enabled.
                </li>
                <li>
                  <strong className="text-foreground">Regulatory authorities</strong> — where
                  disclosure is required by law (e.g. EFCC, CBN, or their Kenyan equivalents).
                </li>
                <li>
                  <strong className="text-foreground">Other challenge parties</strong> — your
                  username and challenge evidence are shared with the other participant and, in
                  disputes, with the Jury.
                </li>
              </ul>
              <p className="mt-4">
                All third-party processors are contractually bound to handle your data only as
                directed by DARE and in accordance with applicable data protection law.
              </p>
            </Section>

            <Section title="4. Data Retention">
              <p>We retain your data for as long as your account is active and for a minimum of:</p>
              <ul>
                <li>
                  <strong className="text-foreground">KYC and financial records</strong> — 7 years
                  after account closure, as required by AML regulations.
                </li>
                <li>
                  <strong className="text-foreground">Challenge records</strong> — 3 years after
                  settlement.
                </li>
                <li>
                  <strong className="text-foreground">Support communications</strong> — 2 years.
                </li>
                <li>
                  <strong className="text-foreground">Marketing preferences and waitlist data</strong>{' '}
                  — until you withdraw consent or request deletion.
                </li>
              </ul>
              <p className="mt-4">
                Where retention is required by law we cannot delete data earlier even if you request
                it; we will inform you if this applies.
              </p>
            </Section>

            <Section title="5. Your Rights">
              <p>
                Under the NDPA and KDPA you have the right to:
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">Access</strong> — request a copy of the
                  personal data we hold about you.
                </li>
                <li>
                  <strong className="text-foreground">Rectification</strong> — ask us to correct
                  inaccurate data.
                </li>
                <li>
                  <strong className="text-foreground">Erasure</strong> — request deletion of data
                  we are not legally required to retain.
                </li>
                <li>
                  <strong className="text-foreground">Restriction</strong> — ask us to limit
                  processing in certain circumstances.
                </li>
                <li>
                  <strong className="text-foreground">Portability</strong> — receive your account
                  data in a machine-readable format.
                </li>
                <li>
                  <strong className="text-foreground">Objection</strong> — object to processing
                  based on legitimate interest.
                </li>
                <li>
                  <strong className="text-foreground">Withdraw consent</strong> — withdraw any
                  consent-based processing (e.g. marketing emails) at any time.
                </li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, email{' '}
                <a href={`mailto:${DPO_EMAIL}`} className="text-brand-primary hover:underline">
                  {DPO_EMAIL}
                </a>
                . We will respond within 30 days. We may need to verify your identity before
                processing your request.
              </p>
            </Section>

            <Section title="6. Cookies and Tracking">
              <p>
                The DARE web Platform uses essential cookies for session management and security.
                We do not use advertising cookies, and all ad-related tracking signals (ad storage,
                ad user data, ad personalisation) are permanently blocked.
              </p>
              <p className="mt-4">
                We use <strong className="text-foreground">Google Analytics (via Google Tag Manager)</strong>{' '}
                to understand aggregate website usage — pages viewed, traffic sources, device type,
                and general engagement. Analytics measurement defaults to{' '}
                <strong className="text-foreground">denied</strong> until you explicitly accept via
                the consent banner shown on your first visit. You can change your preference at any
                time by clearing your browser&apos;s local storage for this site.
              </p>
              <p className="mt-4">
                You can also opt out globally using{' '}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline"
                >
                  Google&apos;s Analytics opt-out browser add-on
                </a>
                . Disabling essential cookies may prevent you from logging in or using certain
                platform features.
              </p>
            </Section>

            <Section title="7. Data Security">
              <p>
                We apply industry-standard security measures including: TLS encryption in transit,
                AES-256 encryption at rest for sensitive fields, row-level access controls on our
                database, regular security audits, and staff access restricted to minimum necessary
                data.
              </p>
              <p className="mt-4">
                If we become aware of a data breach that is likely to result in risk to your rights
                or freedoms, we will notify affected users and the relevant data protection authority
                within 72 hours of becoming aware.
              </p>
            </Section>

            <Section title="8. Children">
              <p>
                The Platform is not intended for persons under 18. We do not knowingly collect data
                from minors. If you believe a minor has created an account, contact us immediately
                at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>{' '}
                and we will delete the account.
              </p>
            </Section>

            <Section title="9. International Transfers">
              <p>
                Your data is primarily stored and processed in the European Union (Supabase
                infrastructure). Where data is transferred outside your country, we ensure
                appropriate safeguards are in place in accordance with NDPA and KDPA requirements,
                including standard contractual clauses with our processors.
              </p>
            </Section>

            <Section title="10. Changes to This Policy">
              <p>
                We may update this Policy to reflect changes in our practices or applicable law.
                Material changes will be communicated via in-app notification or email at least 14
                days before they take effect. The &quot;Last updated&quot; date at the top of this
                page reflects the most recent revision.
              </p>
            </Section>

            <Section title="11. Contact and Data Protection Officer">
              <p>
                For privacy questions or to exercise your rights:
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">General privacy enquiries:</strong>{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-primary hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">Data Protection Officer:</strong>{' '}
                  <a href={`mailto:${DPO_EMAIL}`} className="text-brand-primary hover:underline">
                    {DPO_EMAIL}
                  </a>
                </li>
              </ul>
              <p className="mt-4">
                You also have the right to lodge a complaint with the{' '}
                <strong className="text-foreground">
                  Nigeria Data Protection Commission (NDPC)
                </strong>{' '}
                or the{' '}
                <strong className="text-foreground">
                  Office of the Data Protection Commissioner (ODPC), Kenya
                </strong>
                .
              </p>
            </Section>

          </div>

          <div className="mt-12 border-t border-white/8 pt-8 flex flex-wrap items-center justify-between gap-4">
            <Link href="/terms" className="text-sm text-brand-primary hover:underline">
              Terms of Service →
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-syne text-lg font-extrabold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 space-y-2">
      <h3 className="font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}
