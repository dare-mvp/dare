import type { Metadata } from 'next';
import Link from 'next/link';
import { DareLogo } from '@/components/brand/dare-logo';
import { NavMenu } from '@/components/marketing/nav-menu';

export const metadata: Metadata = {
  title: {
    default: 'DARE - Skill Challenges and Task Rewards',
    template: '%s | DARE',
  },
  description:
    'DARE is a hyper-local platform for user-authored Skill-Based DAREs and Task-Based rewards with escrow-backed, proof-led settlement.',
  openGraph: {
    title: 'DARE - Skill Challenges and Task Rewards',
    description:
      'Create user-authored Skill-Based and Task-Based DAREs with Answer Key, Witnessed, or Evidence resolution.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DARE - Skill Challenges and Task Rewards',
    description: 'User-authored Skill-Based DAREs and Task-Based rewards with escrow-backed settlement.',
    images: ['/og-image.png'],
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/8 bg-brand-bg/90 backdrop-blur-md">
        <div className="relative mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" aria-label="DARE home" className="inline-flex items-center shrink-0">
            <DareLogo variant="mark" size="md" className="sm:hidden" />
            <DareLogo size="md" className="hidden sm:inline-flex" />
          </Link>

          {/* Desktop nav — grows to fill space */}
          <div className="flex-1 flex items-center">
            <NavMenu />
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link
              href="/#waitlist"
              className="inline-flex h-9 items-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Download APK
            </Link>
            <Link
              href="/#waitlist"
              className="inline-flex h-9 items-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-white/10"
            >
              iOS TestFlight
            </Link>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
