import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { MarketingFooter } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'DARE Terms of Service — the rules governing use of the DARE platform.',
  robots: { index: false },
};

const EFFECTIVE_DATE = '1 June 2026';
const COMPANY = 'DARE Technologies Ltd';
const CONTACT_EMAIL = 'info@daregamesapp.com';

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: {EFFECTIVE_DATE}
          </p>

          <div className="prose-dare mt-12 space-y-10 text-sm leading-7 text-muted-foreground">

            <section>
              <p>
                Please read these Terms of Service (&quot;Terms&quot;) carefully before using the
                DARE mobile application or website (together, the &quot;Platform&quot;) operated by{' '}
                <strong className="text-foreground">{COMPANY}</strong> (&quot;DARE&quot;,
                &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
              </p>
              <p className="mt-4">
                By creating an account or using any part of the Platform you agree to be bound by
                these Terms. If you do not agree, do not use the Platform.
              </p>
            </section>

            <Section title="1. Eligibility">
              <p>To use DARE you must:</p>
              <ul>
                <li>Be at least <strong className="text-foreground">18 years old</strong>.</li>
                <li>
                  Be a resident of a <strong className="text-foreground">supported country</strong>{' '}
                  (currently Nigeria and Kenya; other regions may be added or removed at any time).
                </li>
                <li>
                  Complete <strong className="text-foreground">identity verification (KYC)</strong>{' '}
                  before depositing funds or entering paid challenges.
                </li>
                <li>
                  Not be prohibited by law in your jurisdiction from participating in paid
                  skill-based challenge activities.
                </li>
              </ul>
              <p className="mt-4">
                We reserve the right to verify your eligibility at any time and to suspend accounts
                that do not meet these requirements.
              </p>
            </Section>

            <Section title="2. Account Registration">
              <p>
                You must provide accurate, complete, and current information during registration.
                You are responsible for maintaining the confidentiality of your login credentials
                and for all activity that occurs under your account.
              </p>
              <p className="mt-4">
                Each person may hold only one account. Creating multiple accounts to circumvent
                suspensions, limits, or verification requirements is prohibited.
              </p>
              <p className="mt-4">
                You must notify us immediately at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>{' '}
                if you suspect unauthorised access to your account.
              </p>
            </Section>

            <Section title="3. The DARE Platform">
              <p>
                DARE is a <strong className="text-foreground">skill-based challenges platform</strong>{' '}
                where users can issue and accept peer-to-peer (P2P) challenges across supported
                categories including sports, gaming, fitness, creative arts, intellectual challenges,
                and street skills. Skill-Based DAREs use two-sided stakes. Task-Based DAREs use a
                Darer-funded reward for a performer who completes the task. Users author the DARE
                rules; DARE does not create the challenge content as the DARE itself.
              </p>
              <p className="mt-4">
                Challenge outcomes are determined by player performance according to the{' '}
                <strong className="text-foreground">Predominance Test</strong> — a framework under
                which the result must be decided primarily by skill rather than chance. All challenge
                categories are audited against this standard before being made available on the
                Platform.
              </p>
              <p className="mt-4">
                DARE does not participate in challenges as a party and does not take a position on
                the outcome of any challenge. We act solely as a neutral platform facilitating
                agreements between users.
              </p>
            </Section>

            <Section title="4. Escrow and Funds">
              <p>
                When a DARE is funded, the applicable stake or reward is locked in a secure escrow
                account managed by DARE. Skill-Based DAREs lock both participants&apos; stakes.
                Task-Based DAREs lock only the Darer-funded reward. Participants cannot access
                escrowed funds until the DARE is settled, refunded, or voided under platform policy.
              </p>
              <p className="mt-4">
                Funds are released following verified settlement. Skill-Based DAREs pay the eligible
                winner. Task-Based DAREs pay the eligible performer after valid completion. In the
                event of a dispute, funds remain in escrow until a final determination is reached
                through the DARE Jury system (see Section 5).
              </p>
              <p className="mt-4">
                Deposits and withdrawals are processed via our approved payment partners (currently
                Paystack). Processing times and any applicable fees are displayed at the time of
                transaction. DARE does not charge a deposit fee; a platform service fee may be
                deducted from payouts as disclosed at the time of DARE creation.
              </p>
              <p className="mt-4">
                Minimum and maximum stake or reward amounts are set per challenge category and may
                be adjusted by DARE at any time with notice.
              </p>
            </Section>

            <Section title="5. Challenge Rules and Dispute Resolution">
              <Subsection title="5.1 Creating a Challenge">
                <p>
                  When you create a challenge you must specify: the category, the precise task or
                  condition of victory or completion, the stake or reward amount, the time limit for
                  completion, the resolution path, and the evidence standard required to prove the
                  outcome. Resolution paths may include Answer Key, Witnessed, or Evidence review.
                </p>
              </Subsection>
              <Subsection title="5.2 Accepting a Challenge">
                <p>
                  Accepting a challenge constitutes a binding agreement. Once accepted and escrow is
                  locked, neither party may withdraw without the applicable forfeit, refund, or
                  completion policy applying, except where DARE determines the challenge terms were
                  unclear or the challenge was created in bad faith.
                </p>
              </Subsection>
              <Subsection title="5.3 Evidence and Proof">
                <p>
                  Users must submit evidence of the outcome (video, photo, witness confirmation, or
                  other agreed format) or answers required by the DARE constitution within the
                  challenge time limit. Failure to submit valid proof within the deadline follows the
                  forfeit, refund, or review rules in the DARE constitution.
                </p>
              </Subsection>
              <Subsection title="5.4 The DARE Jury">
                <p>
                  Where the outcome is disputed, the case is referred to the{' '}
                  <strong className="text-foreground">DARE Jury</strong> — a panel of verified
                  community members who review evidence and return a blind majority verdict. Jury
                  decisions are final and binding. DARE reserves the right to overturn a jury verdict
                  only in cases of clear fraud or material procedural error.
                </p>
              </Subsection>
            </Section>

            <Section title="6. Responsible Gaming">
              <p>
                DARE is committed to responsible gaming. The following tools are available to all
                verified users:
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">Deposit limits</strong> — set daily, weekly, or
                  monthly caps on how much you can deposit.
                </li>
                <li>
                  <strong className="text-foreground">Stake and reward limits</strong> — cap the
                  maximum amount you can commit to a single DARE.
                </li>
                <li>
                  <strong className="text-foreground">Self-exclusion</strong> — suspend your account
                  from paid DARE participation for a chosen period (minimum 24 hours; maximum permanent).
                  Self-exclusion takes effect immediately and cannot be reversed before the chosen
                  period expires.
                </li>
                <li>
                  <strong className="text-foreground">Reality check reminders</strong> — optional
                  session-time notifications.
                </li>
              </ul>
              <p className="mt-4">
                If you are concerned about your gaming behaviour, contact{' '}
                <a href={`mailto:support@daregamesapp.com`} className="text-brand-primary hover:underline">
                  support@daregamesapp.com
                </a>{' '}
                or visit a recognised problem gambling support organisation in your country.
              </p>
            </Section>

            <Section title="7. Prohibited Conduct">
              <p>You must not:</p>
              <ul>
                <li>Use automated tools, bots, or scripts to create or influence challenges.</li>
                <li>Collude with another user to manipulate a challenge outcome.</li>
                <li>Submit fabricated, edited, or misleading evidence.</li>
                <li>
                  Use the Platform to launder money or engage in any activity that violates
                  applicable anti-money-laundering (AML) laws.
                </li>
                <li>Create challenges that are illegal under applicable law.</li>
                <li>
                  Harass, threaten, or abuse other users through the Platform&apos;s
                  communication features.
                </li>
                <li>Attempt to reverse-engineer, copy, or exploit the Platform.</li>
                <li>
                  Access accounts other than your own or circumvent security or access controls.
                </li>
              </ul>
              <p className="mt-4">
                Violation of these rules may result in account suspension, forfeiture of escrowed
                funds, and referral to law enforcement where applicable.
              </p>
            </Section>

            <Section title="8. Fees and Taxes">
              <p>
                DARE charges a platform service fee on eligible payouts. The current fee schedule is
                displayed within the app before you confirm a DARE. DARE reserves the right to
                update the fee schedule with 14 days&apos; notice.
              </p>
              <p className="mt-4">
                You are solely responsible for any taxes payable on your payouts under the laws of
                your country of residence. DARE does not withhold taxes on your behalf unless
                required to do so by law.
              </p>
            </Section>

            <Section title="9. Intellectual Property">
              <p>
                All content, design, code, and trademarks on the Platform are owned by or licensed
                to DARE. You may not reproduce, distribute, or create derivative works without our
                express written consent.
              </p>
              <p className="mt-4">
                By submitting content (including challenge evidence, profile photos, or comments)
                you grant DARE a non-exclusive, royalty-free, worldwide licence to use that content
                for the purposes of operating the Platform, including displaying it to the
                relevant parties in a dispute.
              </p>
            </Section>

            <Section title="10. Disclaimers and Limitation of Liability">
              <p>
                The Platform is provided &quot;as is&quot; without warranties of any kind. DARE does
                not guarantee uninterrupted availability of the Platform or the accuracy of any
                information displayed.
              </p>
              <p className="mt-4">
                To the maximum extent permitted by law, DARE&apos;s total liability to you for any
                claim arising from these Terms or your use of the Platform shall not exceed the
                greater of (a) the amount you deposited in the 30 days preceding the claim, or (b)
                ₦50,000 (fifty thousand naira).
              </p>
              <p className="mt-4">
                DARE is not liable for losses arising from: challenge outcomes, jury decisions,
                third-party payment processor failures, force majeure events, or your own violation
                of these Terms.
              </p>
            </Section>

            <Section title="11. Governing Law and Disputes">
              <p>
                These Terms are governed by the laws of the{' '}
                <strong className="text-foreground">Federal Republic of Nigeria</strong>. Any dispute
                that cannot be resolved informally shall be submitted to the exclusive jurisdiction
                of the courts of Lagos State, Nigeria.
              </p>
            </Section>

            <Section title="12. Changes to These Terms">
              <p>
                We may update these Terms at any time. We will notify you of material changes via
                in-app notification or email at least 14 days before they take effect. Continued use
                of the Platform after the effective date constitutes acceptance of the updated Terms.
              </p>
            </Section>

            <Section title="13. Contact">
              <p>
                For questions about these Terms, contact us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </Section>

          </div>

          <div className="mt-12 border-t border-white/8 pt-8 flex flex-wrap items-center justify-between gap-4">
            <Link href="/privacy" className="text-sm text-brand-primary hover:underline">
              Privacy Policy →
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
