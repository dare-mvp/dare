import type { Metadata } from 'next';

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
  return <>{children}</>;
}
