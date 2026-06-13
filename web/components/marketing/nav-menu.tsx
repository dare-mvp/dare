'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Menu } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/#how-it-works', label: 'How it works', highlight: false },
  { href: '/#gameplay-preview', label: 'Gameplay', highlight: false },
  { href: '/#categories', label: 'Categories', highlight: false },
  { href: '/#faq', label: 'FAQ', highlight: false },
  { href: '/trust-safety', label: 'Trust & Safety', highlight: false },
  { href: '/blog', label: 'Blog', highlight: false },
  { href: '/challenge', label: 'I Dare You 🔥', highlight: true },
];

export function NavMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              item.highlight
                ? 'text-sm font-semibold text-brand-primary hover:opacity-80 transition-opacity'
                : 'text-sm text-muted-foreground hover:text-foreground transition-colors'
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Mobile hamburger — ml-auto pushes it to the far right of the header */}
      <button
        type="button"
        className="md:hidden ml-auto rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile menu overlay */}
      {open && (
        <div className="absolute inset-x-0 top-14 z-50 border-b border-white/8 bg-brand-bg/97 backdrop-blur-md md:hidden">
          <nav className="flex flex-col p-4 gap-1" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={
                  item.highlight
                    ? 'py-2.5 px-3 rounded-lg text-sm font-semibold text-brand-primary hover:bg-brand-primary/10 transition-colors'
                    : 'py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors'
                }
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-white/8 flex flex-col gap-2.5">
              <Link
                href="/#waitlist"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-primary text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Download APK
              </Link>
              <Link
                href="/#waitlist"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-sm font-semibold text-foreground transition-colors hover:bg-white/10"
              >
                iOS TestFlight
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
