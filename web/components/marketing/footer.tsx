import Link from 'next/link';

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/trust-safety', label: 'Trust & Safety' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/8 bg-brand-bg px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <span className="font-syne text-xl font-extrabold text-foreground">DARE</span>
            <p className="max-w-xs text-sm text-muted-foreground">
              The hyper-local P2P skill wagering platform for Africa.
            </p>
          </div>

          <nav className="flex flex-wrap gap-4">
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

        <div className="mt-10 border-t border-white/8 pt-6 text-xs text-muted-foreground">
          <p>
            DARE is a skill-based competition platform. Challenge outcomes are determined by player
            skill as assessed by the Predominance Test. This is not a gambling service. Participation
            is subject to applicable local laws. Persons under 18 may not participate.
          </p>
          <p className="mt-3">© {new Date().getFullYear()} DARE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
