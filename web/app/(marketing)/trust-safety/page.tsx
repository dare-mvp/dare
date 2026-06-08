import type { Metadata } from 'next';
import { TrustSafetySection } from '@/components/marketing/trust-safety-section';
import { MarketingFooter } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'Trust & Safety',
  description:
    'How DARE protects user-authored Skill-Based and Task-Based DAREs through escrow, proof-led settlement, identity verification, and responsible gaming controls.',
  openGraph: {
    title: 'Trust & Safety | DARE',
    description:
      'How DARE protects user-authored Skill-Based and Task-Based DAREs through escrow, proof-led settlement, identity verification, and responsible gaming controls.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default function TrustSafetyPage() {
  return (
    <>
      <main className="min-h-screen bg-brand-bg pt-16">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-syne text-5xl font-extrabold text-foreground sm:text-6xl">
            Trust &amp; Safety
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Real money DAREs need clear rules, protected funds, private evidence, and settlement
            paths users can understand before escrow locks.
          </p>
        </div>
        <TrustSafetySection />
      </main>
      <MarketingFooter />
    </>
  );
}
