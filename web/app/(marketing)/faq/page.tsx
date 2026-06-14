import type { Metadata } from 'next';
import { FaqSection } from '@/components/marketing/faq-section';
import { MarketingFooter } from '@/components/marketing/footer';
import { faqItems } from '@/lib/faq-data';
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createSeoMetadata,
  createWebPageSchema,
  jsonLdScript,
} from '@/lib/seo';

const path = '/faq';
const title = 'FAQ - DARE Skill Challenges, Payouts, Disputes, and Wallets';
const description =
  'Answers to common questions about DARE, including skill-based challenges, task rewards, payouts, disputes, jury review, KYC, and wallet settlement.';

export const metadata: Metadata = createSeoMetadata({
  title,
  description,
  path,
  keywords: [
    'DARE FAQ',
    'DARE payouts',
    'DARE disputes',
    'skill challenge payouts',
    'DARE wallet questions',
  ],
});

export default function FaqPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createWebPageSchema({
        path,
        name: title,
        description,
        type: 'WebPage',
      }),
      {
        '@type': 'FAQPage',
        '@id': `${absoluteUrl(path)}#faq`,
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(faqSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(createBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'FAQ', path },
        ]))}
      />
      <main className="min-h-screen bg-brand-bg pt-16">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-syne text-5xl font-extrabold text-foreground sm:text-6xl">FAQ</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Answers to common questions about DARE, payouts, disputes, and trust score.
          </p>
        </div>
        <FaqSection />
      </main>
      <MarketingFooter />
    </>
  );
}
