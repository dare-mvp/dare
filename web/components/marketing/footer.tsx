import Link from 'next/link';
import { Camera, Play, MessageCircle } from 'lucide-react';
import { DareLogo } from '@/components/brand/dare-logo';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/trust-safety', label: 'Trust & Safety' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
];

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms of service' },
  { href: '/privacy', label: 'Privacy policy' },
];

const SOCIAL_LINKS = [
  {
    href: 'https://www.instagram.com/dareappofficial',
    label: 'Instagram',
    handle: '@dareappofficial',
    Icon: Camera,
  },
  {
    href: 'https://www.youtube.com/@iDareUChallenge',
    label: 'YouTube',
    handle: '@iDareUChallenge',
    Icon: Play,
  },
  {
    href: 'https://whatsapp.com/channel/0029VbCZi4bLdQec56X6i81K',
    label: 'WhatsApp',
    handle: 'DARE Channel',
    Icon: MessageCircle,
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/8 bg-brand-bg px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 sm:grid-cols-4">
          <div className="space-y-2">
            <DareLogo size="md" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              User-authored Skill-Based competitions and Task-Based rewards with escrow-backed settlement.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Navigation
            </p>
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Legal
            </p>
            <nav className="flex flex-col gap-2">
              {LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Follow
            </p>
            <nav className="flex flex-col gap-2">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  aria-label={`Follow DARE on ${link.label}`}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <link.Icon aria-hidden="true" className="size-4" />
                  <span>{link.handle}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-white/8 pt-6 text-xs text-muted-foreground">
          <p>
            DARE is a skill-based challenges platform for user-authored DAREs. Outcomes settle
            through Answer Key, Witnessed, Evidence, or blinded review flows. Available to users 18
            and over in supported regions.
          </p>
          <p className="mt-3">&copy; {new Date().getFullYear()} DARE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
