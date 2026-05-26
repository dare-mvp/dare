import Link from 'next/link';
import { Suspense } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Button, buttonVariants } from '@/components/ui/button';
import { JuryAssignButton } from './jury-assign-button';
import { JuryResolveDialog } from './jury-resolve-dialog';

export const dynamic = 'force-dynamic';

const VALID_TABS = ['open', 'escalated', 'resolved'] as const;
type TabFilter = (typeof VALID_TABS)[number];

const TAB_STATUSES: Record<TabFilter, string[]> = {
  open: ['filed', 'accepted_for_review', 'jury_assignment', 'jury_voting'],
  escalated: ['escalated'],
  resolved: ['verdict_reached', 'settlement_pending', 'closed', 'voided'],
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const STATUS_BADGE: Record<string, string> = {
  filed: 'bg-blue-500/20 text-blue-400',
  accepted_for_review: 'bg-blue-500/20 text-blue-400',
  jury_assignment: 'bg-yellow-500/20 text-yellow-400',
  jury_voting: 'bg-yellow-500/20 text-yellow-400',
  escalated: 'bg-red-500/20 text-red-400',
  verdict_reached: 'bg-green-500/20 text-green-400',
  settlement_pending: 'bg-green-500/20 text-green-400',
  closed: 'bg-white/10 text-muted-foreground',
  voided: 'bg-white/10 text-muted-foreground',
};

type JuryRow = {
  id: string;
  status: string;
  votes_needed: number | null;
  created_at: string;
  dares: { id: string }[] | null;
  jury_assignments: { id: string; status: string }[] | null;
  jury_votes: { id: string }[] | null;
};

async function JuryTable({
  tab,
  page,
  pageSize,
}: {
  tab: TabFilter;
  page: number;
  pageSize: number;
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data } = await admin
    .from('jury_cases')
    .select(
      'id, status, votes_needed, created_at, dares!inner(id), jury_assignments(id, status), jury_votes(id)',
    )
    .in('status', TAB_STATUSES[tab])
    .order('created_at', { ascending: false })
    .range(from, to);

  const rows = (data as JuryRow[]) ?? [];

  const prevHref = `/admin/jury?tab=${tab}&page=${page - 1}&pageSize=${pageSize}`;
  const nextHref = `/admin/jury?tab=${tab}&page=${page + 1}&pageSize=${pageSize}`;
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
          <p className="text-sm text-muted-foreground">No jury cases found.</p>
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
            <th className="px-4 py-3 text-left font-medium">Case ID</th>
            <th className="px-4 py-3 text-left font-medium">DARE ID</th>
            <th className="px-4 py-3 text-left font-medium">Votes cast / needed</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Created</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => {
            const votesCast = row.jury_votes?.length ?? 0;
            const dareId = row.dares?.[0]?.id ?? null;
            return (
              <tr key={row.id}>
                <td className="px-4 py-3 font-mono text-xs text-foreground">
                  {row.id.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {dareId ? `${dareId.slice(0, 8)}…` : '—'}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {votesCast} / {row.votes_needed ?? '?'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium ${STATUS_BADGE[row.status] ?? 'bg-white/10 text-muted-foreground'}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(row.created_at).toLocaleDateString('en-NG')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {tab === 'open' && <JuryAssignButton caseId={row.id} />}
                    {tab === 'escalated' && <JuryResolveDialog caseId={row.id} />}
                  </div>
                </td>
              </tr>
            );
          })}
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

export default async function JuryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; pageSize?: string }>;
}) {
  const { tab: rawTab, page: rawPage, pageSize: rawPageSize } = await searchParams;
  const tab: TabFilter = VALID_TABS.includes(rawTab as TabFilter)
    ? (rawTab as TabFilter)
    : 'open';
  const page = Math.max(1, Number(rawPage ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(rawPageSize ?? DEFAULT_PAGE_SIZE)));

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg bg-brand-surface p-1 w-fit">
        {VALID_TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/jury?tab=${t}&page=1&pageSize=${pageSize}`}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-white/8 bg-brand-surface overflow-hidden">
        <Suspense fallback={<TableSkeleton />}>
          <JuryTable tab={tab} page={page} pageSize={pageSize} />
        </Suspense>
      </div>
    </div>
  );
}
