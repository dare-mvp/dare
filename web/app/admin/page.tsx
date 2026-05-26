import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

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
      .in('status', ['open', 'jury_voting', 'escalated']),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('account_status', 'frozen'),
    admin
      .from('audit_logs')
      .select('id, action, actor_id, created_at, metadata')
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

export default async function AdminDashboardPage() {
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
        <div className="border-b border-white/8 px-6 py-4">
          <h2 className="font-syne text-lg font-extrabold text-foreground">Recent activity</h2>
        </div>
        <div className="divide-y divide-white/5">
          {stats.recentActivity.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            stats.recentActivity.map((row: { id: string; action: string; actor_id: string | null; created_at: string }) => (
              <div key={row.id} className="flex items-center justify-between px-6 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{row.action}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.actor_id ? row.actor_id.slice(0, 8) : 'system'}
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleString('en-NG', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
