import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Button, buttonVariants } from '@/components/ui/button';
import { Suspense } from 'react';
import { WithdrawalActions } from './withdrawal-actions';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'all'] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
};

type WithdrawalRow = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  requested_at: string;
  profiles: { username: string }[] | null;
};

async function WithdrawalsTable({
  status,
  page,
  pageSize,
}: {
  status: StatusFilter;
  page: number;
  pageSize: number;
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from('withdrawal_requests')
    .select(
      'id, status, amount, currency, bank_code, account_number, account_name, requested_at, profiles!inner(username)',
    )
    .order('requested_at', { ascending: false })
    .range(from, to);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data } = await query;
  const rows = (data as WithdrawalRow[]) ?? [];

  const prevHref = `/admin/withdrawals?status=${status}&page=${page - 1}&pageSize=${pageSize}`;
  const nextHref = `/admin/withdrawals?status=${status}&page=${page + 1}&pageSize=${pageSize}`;
  const hasMore = rows.length >= pageSize;

  const pagination = (
    <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
      {page <= 1 ? (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      ) : (
        <Link href={prevHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Previous
        </Link>
      )}
      <span>Page {page}</span>
      {hasMore ? (
        <Link href={nextHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Next
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      )}
    </div>
  );

  if (rows.length === 0) {
    return (
      <>
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No withdrawals in this status.</p>
        </div>
        {pagination}
      </>
    );
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead className="border-b border-white/8 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Username</th>
            <th className="px-4 py-3 text-left font-medium">Amount (NGN)</th>
            <th className="px-4 py-3 text-left font-medium">Bank code</th>
            <th className="px-4 py-3 text-left font-medium">Account number</th>
            <th className="px-4 py-3 text-left font-medium">Account name</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Requested</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-foreground">
                {row.profiles?.[0]?.username ?? '—'}
              </td>
              <td className="px-4 py-3 text-foreground">
                ₦{(row.amount / 100).toLocaleString('en-NG')}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.bank_code}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {row.account_number}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{row.account_name}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium ${STATUS_BADGE[row.status] ?? 'bg-white/10 text-muted-foreground'}`}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {new Date(row.requested_at).toLocaleDateString('en-NG')}
              </td>
              <td className="px-4 py-3">
                {row.status === 'pending' && <WithdrawalActions id={row.id} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pagination}
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 px-4 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg bg-white/5" />
      ))}
    </div>
  );
}

export default async function WithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; pageSize?: string }>;
}) {
  const { status: rawStatus, page: rawPage, pageSize: rawPageSize } = await searchParams;
  const status: StatusFilter = VALID_STATUSES.includes(rawStatus as StatusFilter)
    ? (rawStatus as StatusFilter)
    : 'pending';
  const page = Math.max(1, Number(rawPage ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(rawPageSize ?? DEFAULT_PAGE_SIZE)));

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg bg-brand-surface p-1 w-fit">
        {VALID_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/withdrawals?status=${s}&page=1&pageSize=${pageSize}`}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              status === s
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-white/8 bg-brand-surface overflow-hidden">
        <Suspense fallback={<TableSkeleton />}>
          <WithdrawalsTable status={status} page={page} pageSize={pageSize} />
        </Suspense>
      </div>
    </div>
  );
}
