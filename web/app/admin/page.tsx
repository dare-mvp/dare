import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function getDashboardStats() {
  const admin = createAdminClient();

  const [withdrawals, kyc, disputes, frozen, activity] = await Promise.all([
    admin
      .from('withdrawal_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('kyc_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('jury_cases')
      .select('id', { count: 'exact', head: true })
      .in('status', ['filed', 'accepted_for_review', 'jury_assignment', 'jury_voting', 'escalated']),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('account_status', 'frozen'),
    admin
      .from('audit_logs')
      .select('id, action, actor_user_id, actor_type, target_type, target_id, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    pendingWithdrawals: withdrawals.count ?? 0,
    pendingKyc: kyc.count ?? 0,
    openDisputes: disputes.count ?? 0,
    frozenAccounts: frozen.count ?? 0,
    recentActivity: activity.data ?? [],
  };
}

const STAT_CARDS = [
  { key: 'pendingWithdrawals', label: 'Pending withdrawals', href: '/admin/withdrawals' },
  { key: 'pendingKyc', label: 'Pending KYC', href: '/admin/kyc' },
  { key: 'openDisputes', label: 'Open disputes', href: '/admin/jury' },
  { key: 'frozenAccounts', label: 'Frozen accounts', href: '/admin/users' },
] as const;

type ActivityRow = {
  id: string;
  action: string;
  actor_user_id: string | null;
  actor_type: string;
  target_type: string;
  target_id: string | null;
  created_at: string;
};

export default async function AdminDashboardPage() {
  await requireAdmin();
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <a key={card.key} href={card.href}>
            <Card className="border-white/8 bg-brand-surface transition-colors hover:border-brand-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-syne text-3xl font-extrabold text-foreground">
                  {stats[card.key]}
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <div className="rounded-xl border border-white/8 bg-brand-surface">
        <div className="border-b border-white/8 px-4 py-4 sm:px-6">
          <h2 className="font-syne text-lg font-extrabold text-foreground">Recent activity</h2>
        </div>
        {stats.recentActivity.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <>
            <div className="divide-y divide-white/5 md:hidden">
              {(stats.recentActivity as ActivityRow[]).map((row) => (
                <article key={row.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words text-sm font-medium text-foreground">
                      {row.action}
                    </p>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {timeAgo(row.created_at)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs text-muted-foreground">
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] uppercase tracking-widest">Actor</p>
                      <p className="truncate">
                        {row.actor_user_id ? row.actor_user_id.slice(0, 8) : 'system'}
                        <span className="ml-1 opacity-60">({row.actor_type})</span>
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] uppercase tracking-widest">Target</p>
                      <p className="truncate">
                        {row.target_type}
                        {row.target_id ? `:${row.target_id.slice(0, 8)}` : ''}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <table className="hidden w-full text-sm md:table">
              <thead className="border-b border-white/8 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Actor</th>
                  <th className="px-4 py-3 text-left font-medium">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(stats.recentActivity as ActivityRow[]).map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo(row.created_at)}
                    </td>
                    <td className="px-4 py-3 text-foreground">{row.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.actor_user_id ? `${row.actor_user_id.slice(0, 8)}` : 'system'}
                      <span className="ml-1 opacity-60">({row.actor_type})</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.target_type}
                      {row.target_id ? `:${row.target_id.slice(0, 8)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
