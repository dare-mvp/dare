import Link from 'next/link';
import { Suspense } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Button, buttonVariants } from '@/components/ui/button';
import { KycDrawer } from './kyc-drawer';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending', 'approved', 'rejected'] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
};

type KycRow = {
  id: string;
  status: string;
  kyc_tier_requested: string;
  submitted_at: string;
  user_id: string;
  documents: Record<string, unknown> | null;
  profiles: { username: string; kyc_tier: string | null }[] | null;
};

async function KycTable({
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

  const { data } = await admin
    .from('kyc_verifications')
    .select(
      'id, status, kyc_tier_requested, submitted_at, user_id, documents, profiles!inner(username, kyc_tier)',
    )
    .eq('status', status)
    .order('submitted_at', { ascending: false })
    .range(from, to);

  const rows = (data as KycRow[]) ?? [];

  const prevHref = `/admin/kyc?status=${status}&page=${page - 1}&pageSize=${pageSize}`;
  const nextHref = `/admin/kyc?status=${status}&page=${page + 1}&pageSize=${pageSize}`;
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
          <p className="text-sm text-muted-foreground">No KYC submissions in this status.</p>
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
            <th className="px-4 py-3 text-left font-medium">Current KYC tier</th>
            <th className="px-4 py-3 text-left font-medium">Tier requested</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Submitted</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-foreground">
                {row.profiles?.[0]?.username ?? row.user_id.slice(0, 8)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {row.profiles?.[0]?.kyc_tier ?? 'none'}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-foreground">
                {row.kyc_tier_requested}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium ${STATUS_BADGE[row.status] ?? ''}`}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {new Date(row.submitted_at).toLocaleDateString('en-NG')}
              </td>
              <td className="px-4 py-3">
                {row.status === 'pending' && (
                  <KycDrawer
                    id={row.id}
                    username={row.profiles?.[0]?.username ?? row.user_id}
                    currentTier={row.profiles?.[0]?.kyc_tier ?? null}
                    tierRequested={row.kyc_tier_requested}
                    submittedAt={row.submitted_at}
                    documents={row.documents}
                  />
                )}
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

export default async function KycPage({
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
            href={`/admin/kyc?status=${s}&page=1&pageSize=${pageSize}`}
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
          <KycTable status={status} page={page} pageSize={pageSize} />
        </Suspense>
      </div>
    </div>
  );
}
