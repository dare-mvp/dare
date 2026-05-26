import { HeroSection } from '@/components/marketing/hero-section';
import { HowItWorksSection } from '@/components/marketing/how-it-works-section';
import { TrustSafetySection } from '@/components/marketing/trust-safety-section';
import { FaqSection } from '@/components/marketing/faq-section';
import { BlogPreviewSection } from '@/components/marketing/blog-preview-section';
import { WaitlistSection } from '@/components/marketing/waitlist-section';
import { MarketingFooter } from '@/components/marketing/footer';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <TrustSafetySection />
      <FaqSection />
      <BlogPreviewSection />
      <WaitlistSection />
      <MarketingFooter />
    </>
  );
}
