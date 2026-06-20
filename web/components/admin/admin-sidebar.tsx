'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowDownCircle, UserCheck, Users, Gavel, Trophy } from 'lucide-react';
import { DareLogo } from '@/components/brand/dare-logo';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowDownCircle },
  { href: '/admin/kyc', label: 'KYC', icon: UserCheck },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/jury', label: 'Jury', icon: Gavel },
  { href: '/admin/challenge', label: 'Challenge', icon: Trophy },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    isActive: item.exact ? pathname === item.href : pathname.startsWith(item.href),
  }));

  return (
    <>
      <aside className="hidden h-screen w-56 shrink-0 flex-col border-r border-white/8 bg-brand-surface lg:flex">
        <div className="flex h-14 items-center border-b border-white/8 px-6">
          <DareLogo size="sm" />
          <span className="ml-2 font-mono text-xs text-brand-primary">admin</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3" aria-label="Admin sections">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    item.isActive
                      ? 'border-l-2 border-brand-primary bg-brand-primary/10 pl-[10px] font-semibold text-brand-primary'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-brand-surface/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur lg:hidden"
        aria-label="Admin sections"
      >
        <ul className="grid grid-cols-6 gap-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={item.isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition-colors',
                  item.isActive
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
