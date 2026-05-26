import type { Metadata } from 'next';
import Link from 'next/link';
import { DareLogo } from '@/components/brand/dare-logo';

export const metadata: Metadata = {
  title: {
    default: 'DARE — Challenge. Wager. Win.',
    template: '%s | DARE',
  },
  description: 'DARE is a hyper-local P2P social wagering platform. Challenge friends, wager on your skills, and win.',
  openGraph: {
    title: 'DARE — Challenge. Wager. Win.',
    description: 'DARE is a hyper-local P2P social wagering platform. Challenge friends, wager on your skills, and win.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DARE — Challenge. Wager. Win.',
    description: 'DARE is a hyper-local P2P social wagering platform.',
    images: ['/og-image.png'],
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/8 bg-brand-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="DARE home" className="inline-flex items-center">
            <DareLogo variant="mark" size="md" className="sm:hidden" />
            <DareLogo size="md" className="hidden sm:inline-flex" />
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="#apk-download"
              aria-label="Download Android APK"
              className="inline-flex h-9 items-center rounded-lg bg-brand-primary px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:px-4"
            >
              <span className="sm:hidden">APK</span>
              <span className="hidden sm:inline">Download APK</span>
            </a>
            <a
              href="#testflight"
              aria-label="Open iOS TestFlight"
              className="inline-flex h-9 items-center rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/10 sm:px-4"
            >
              <span className="sm:hidden">iOS</span>
              <span className="hidden sm:inline">iOS TestFlight</span>
            </a>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
