'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowDownCircle, UserCheck, Users, Gavel } from 'lucide-react';
import { DareLogo } from '@/components/brand/dare-logo';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowDownCircle },
  { href: '/admin/kyc', label: 'KYC', icon: UserCheck },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/jury', label: 'Jury', icon: Gavel },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-white/8 bg-brand-surface">
      <div className="flex h-14 items-center border-b border-white/8 px-6">
        <DareLogo size="sm" />
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
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'border-l-2 border-brand-primary bg-brand-primary/10 pl-[10px] font-semibold text-brand-primary'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
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
