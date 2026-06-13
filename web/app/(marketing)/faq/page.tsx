import type { Metadata } from 'next';
import { FaqSection } from '@/components/marketing/faq-section';
import { MarketingFooter } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers to common questions about Skill-Based DAREs, Task-Based rewards, Answer Key, Witnessed, Evidence, payouts, disputes, and trust score.',
  openGraph: {
    title: 'FAQ | DARE',
    description:
      'Answers to common questions about Skill-Based DAREs, Task-Based rewards, Answer Key, Witnessed, Evidence, payouts, disputes, and trust score.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default function FaqPage() {
  return (
    <>
      <main className="min-h-screen bg-brand-bg pt-16">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-syne text-5xl font-extrabold text-foreground sm:text-6xl">FAQ</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            The practical details before you create, accept, complete, or review a DARE.
          </p>
        </div>
        <FaqSection />
      </main>
      <MarketingFooter />
    </>
  );
}
