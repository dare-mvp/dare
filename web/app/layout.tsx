import type { Metadata } from 'next';
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from '@/components/analytics/google-tag-manager';
import {
  SITE_URL,
  createOrganizationSchema,
  createSeoMetadata,
  createWebsiteSchema,
  jsonLdScript,
  siteConfig,
} from '@/lib/seo';
import './globals.css';

const syne = Syne({ subsets: ['latin'], weight: ['800'], variable: '--font-syne-var' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans-var' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono-var' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: siteConfig.name,
  ...createSeoMetadata({
    title: siteConfig.title,
    description: siteConfig.description,
    path: '/',
    keywords: ['DARE Nigeria', 'DARE Kenya', 'skill challenge platform Africa'],
  }),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  verification: {
    google: 'cosXzfZONY6R5Owc42cztN1KIzdbXw8I_ijAK66bcpA',
  },
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
    title: siteConfig.name,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const graphSchema = {
    '@context': 'https://schema.org',
    '@graph': [createOrganizationSchema(), createWebsiteSchema()],
  };

  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body className="min-h-full flex flex-col">
        <GoogleTagManagerNoScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(graphSchema)}
        />
        {children}
        <GoogleTagManager />
      </body>
    </html>
  );
}
