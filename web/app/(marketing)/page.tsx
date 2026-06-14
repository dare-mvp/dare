import type { Metadata } from 'next';
import { HeroSection } from '@/components/marketing/hero-section';
import { StatsSection } from '@/components/marketing/stats-section';
import { GameplayPreviewSection } from '@/components/marketing/gameplay-preview-section';
import { HowItWorksSection } from '@/components/marketing/how-it-works-section';
import { CategoriesSection } from '@/components/marketing/categories-section';
import { TrustSafetySection } from '@/components/marketing/trust-safety-section';
import { DownloadSection } from '@/components/marketing/download-section';
import { WaitlistSection } from '@/components/marketing/waitlist-section';
import { FaqSection } from '@/components/marketing/faq-section';
import { BlogPreviewSection } from '@/components/marketing/blog-preview-section';
import { MarketingFooter } from '@/components/marketing/footer';
import {
  createMobileApplicationSchema,
  createSeoMetadata,
  createWebPageSchema,
  jsonLdScript,
  siteConfig,
} from '@/lib/seo';

const title = siteConfig.title;
const description =
  "DARE is Nigeria's skill-based challenge platform. Dare your friends and family to anything, complete tasks, and earn real money paid directly to your DARE wallet.";

export const metadata: Metadata = createSeoMetadata({
  title,
  description,
  path: '/',
  keywords: [
    'earn money app Nigeria',
    'skill challenges in Nigeria',
    'task rewards Nigeria',
    'escrow wallet app',
    'challenge friends app',
  ],
});

const appSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    createWebPageSchema({
      path: '/',
      name: title,
      description,
      type: 'WebPage',
    }),
    createMobileApplicationSchema(),
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(appSchema)}
      />
      <HeroSection />
      <StatsSection />
      <GameplayPreviewSection />
      <HowItWorksSection />
      <CategoriesSection />
      <TrustSafetySection />
      <DownloadSection />
      <WaitlistSection />
      <FaqSection preview />
      <BlogPreviewSection />
      <MarketingFooter />
    </>
  );
}
