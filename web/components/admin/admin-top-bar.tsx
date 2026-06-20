'use client';

import { usePathname } from 'next/navigation';
import { signOut } from '@/app/admin/actions';

const ADMIN_TITLES: Array<[RegExp, string]> = [
  [/^\/admin$/, 'Dashboard'],
  [/^\/admin\/withdrawals/, 'Withdrawals'],
  [/^\/admin\/kyc/, 'KYC Review'],
  [/^\/admin\/users\/[^/]+$/, 'User Detail'],
  [/^\/admin\/users/, 'Users'],
  [/^\/admin\/jury/, 'Jury Oversight'],
  [/^\/admin\/challenge/, 'Challenge Tracker'],
];

export function AdminTopBar({ email }: { email: string }) {
  const pathname = usePathname();
  const title = ADMIN_TITLES.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'Admin';

  return (
    <header className="sticky top-0 z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/8 bg-brand-surface/95 px-4 backdrop-blur sm:px-6 lg:static lg:bg-brand-surface">
      <h1 className="min-w-0 truncate font-syne text-base font-extrabold text-foreground sm:text-lg">
        {title}
      </h1>
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        <span className="hidden max-w-[14rem] truncate text-sm text-muted-foreground sm:inline">
          {email}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-white/10 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
