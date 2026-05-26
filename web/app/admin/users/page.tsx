import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { UserSearch } from './user-search';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  frozen: 'bg-red-500/20 text-red-400',
  limited: 'bg-orange-500/20 text-orange-400',
  banned: 'bg-white/10 text-muted-foreground',
  closed: 'bg-white/10 text-muted-foreground',
};

type UserRow = {
  id: string;
  username: string;
  display_name: string | null;
  account_status: string;
  kyc_tier: string | null;
  trust_score: number | null;
  created_at: string;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const { q: rawQuery, page: rawPage, pageSize: rawPageSize } = await searchParams;
  const query = (rawQuery ?? '').trim();
  const page = Math.max(1, Number(rawPage ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(rawPageSize ?? DEFAULT_PAGE_SIZE)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  await requireAdmin();
  const admin = createAdminClient();

  let request = admin
    .from('profiles')
    .select('id, username, display_name, account_status, kyc_tier, trust_score, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query) {
    request = request.ilike('username', `%${query}%`);
  }

  const { data, count, error } = await request;
  if (error) throw error;

  const rows = (data as UserRow[]) ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const baseParams = new URLSearchParams();
  if (query) baseParams.set('q', query);
  baseParams.set('pageSize', String(pageSize));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams(baseParams);
    params.set('page', String(targetPage));
    return `/admin/users?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <UserSearch initialQuery={query} />

      <div className="overflow-hidden rounded-xl border border-white/8 bg-brand-surface">
        {rows.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/8 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Username</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">KYC tier</th>
                <th className="px-4 py-3 text-left font-medium">Trust score</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/3">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${row.id}`}
                      className="font-medium text-foreground hover:text-brand-primary"
                    >
                      {row.display_name ?? row.username}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">@{row.username}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium ${
                        STATUS_BADGE[row.account_status] ?? 'bg-white/10 text-muted-foreground'
                      }`}
                    >
                      {row.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.kyc_tier ?? 'none'}
                  </td>
                  <td className="px-4 py-3 text-foreground">{row.trust_score ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString('en-NG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        ) : (
          <Link href={pageHref(page - 1)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Previous
          </Link>
        )}
        <span>
          Page {page} of {totalPages}
        </span>
        {page >= totalPages ? (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        ) : (
          <Link href={pageHref(page + 1)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
