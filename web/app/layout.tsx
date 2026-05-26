import type { Metadata } from 'next';
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const syne = Syne({ subsets: ['latin'], weight: ['800'], variable: '--font-syne-var' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans-var' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono-var' });

export const metadata: Metadata = {
  metadataBase: new URL('https://dareapp.com'),
  title: 'DARE — Challenge. Wager. Win.',
  description: 'DARE is a hyper-local P2P social wagering platform. Challenge friends, wager on your skills, and win.',
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
