'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/withdrawals', label: 'Withdrawals' },
  { href: '/admin/kyc', label: 'KYC Review' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/jury', label: 'Jury' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-white/8 bg-brand-surface">
      <div className="flex h-14 items-center border-b border-white/8 px-6">
        <span className="font-syne text-lg font-extrabold text-foreground">DARE</span>
        <span className="ml-2 font-mono text-xs text-brand-primary">admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-brand-primary/15 font-semibold text-brand-primary'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
