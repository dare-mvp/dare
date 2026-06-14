import type { Metadata } from 'next';
import { TrustSafetySection } from '@/components/marketing/trust-safety-section';
import { MarketingFooter } from '@/components/marketing/footer';
import {
  createBreadcrumbSchema,
  createSeoMetadata,
  createWebPageSchema,
  jsonLdScript,
} from '@/lib/seo';

const path = '/trust-safety';
const title = 'Trust & Safety - DARE Escrow, KYC, Evidence, and Jury Review';
const description =
  'How DARE protects skill challenges and task rewards with escrow, identity checks, private evidence, Live Court, responsible gaming controls, and jury review.';

export const metadata: Metadata = createSeoMetadata({
  title,
  description,
  path,
  keywords: [
    'DARE trust and safety',
    'escrow skill challenges',
    'KYC challenge app',
    'private evidence review',
    'responsible gaming Nigeria',
  ],
});

export default function TrustSafetyPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createWebPageSchema({
        path,
        name: title,
        description,
        type: 'AboutPage',
      }),
      {
        '@type': 'ItemList',
        name: 'DARE trust and safety controls',
        itemListElement: [
          'Escrow-backed funds',
          'KYC and account risk checks',
          'Private evidence and Live Court recordings',
          'Responsible gaming limits',
          'Jury and admin dispute review',
        ].map((name, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(pageSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(createBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Trust & Safety', path },
        ]))}
      />
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
