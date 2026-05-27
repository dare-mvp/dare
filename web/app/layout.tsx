import type { Metadata } from 'next';
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from '@/components/analytics/google-tag-manager';
import './globals.css';

const syne = Syne({ subsets: ['latin'], weight: ['800'], variable: '--font-syne-var' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans-var' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono-var' });

export const metadata: Metadata = {
  metadataBase: new URL('https://daregamesapp.com'),
  applicationName: 'DARE',
  title: 'DARE - Challenge. Wager. Win.',
  description: 'DARE is a hyper-local P2P social wagering platform. Challenge friends, wager on your skills, and win.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: [{ url: '/favicon.ico' }, { url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'DARE',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'DARE - Challenge. Wager. Win.',
    description: 'Challenge friends to real-money skill competitions with proof-based settlement.',
    url: '/',
    siteName: 'DARE',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DARE' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DARE - Challenge. Wager. Win.',
    description: 'Challenge friends to real-money skill competitions with proof-based settlement.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GoogleTagManagerNoScript />
        {children}
        <GoogleTagManager />
      </body>
    </html>
  );
}
