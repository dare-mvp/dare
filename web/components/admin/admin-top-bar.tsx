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
];

export function AdminTopBar({ email }: { email: string }) {
  const pathname = usePathname();
  const title = ADMIN_TITLES.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'Admin';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/8 bg-brand-surface px-6">
      <h1 className="font-syne text-lg font-extrabold text-foreground">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{email}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
