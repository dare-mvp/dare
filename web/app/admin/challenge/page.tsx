import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type LegendRow = {
  referral_code: string;
  email: string;
  legend_selected_at: string;
  legend_referred_count: number;
  task_a_complete: boolean;
};

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 3)}***@${domain}`;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function ChallengePage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: legendPlayers } = await admin
    .from('legend_referral_progress')
    .select('*')
    .order('legend_selected_at', { ascending: false });

  const rows = (legendPlayers as LegendRow[]) ?? [];
  const taskAComplete = rows.filter((r) => r.task_a_complete).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-syne text-2xl font-extrabold text-foreground">Challenge — Legend</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Legend players and their Task A progress (referrals made after selecting Legend).
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-brand-surface px-5 py-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Legend players</p>
          <p className="mt-1 font-syne text-3xl font-extrabold text-[#FBBF24]">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-brand-surface px-5 py-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Task A complete (5+ refs)</p>
          <p className="mt-1 font-syne text-3xl font-extrabold text-[#19C37D]">{taskAComplete}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-brand-surface px-5 py-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">In progress</p>
          <p className="mt-1 font-syne text-3xl font-extrabold text-foreground">{rows.length - taskAComplete}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 bg-brand-surface overflow-hidden">
        <div className="border-b border-white/8 px-6 py-4">
          <h2 className="font-syne text-base font-bold text-foreground">Legend player progress</h2>
        </div>

        {rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">No legend players yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/8 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Referral code</th>
                <th className="px-4 py-3 text-left font-medium">Legend selected</th>
                <th className="px-4 py-3 text-left font-medium">Task A — Refs after Legend</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr key={row.referral_code}>
                  <td className="px-4 py-3 text-foreground">{maskEmail(row.email)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.referral_code}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(row.legend_selected_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            row.task_a_complete ? 'bg-[#19C37D]' : 'bg-[#FBBF24]'
                          }`}
                          style={{ width: `${Math.min(100, (row.legend_referred_count / 5) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-foreground">
                        {row.legend_referred_count} / 5
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.task_a_complete ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium bg-[#19C37D]/10 border border-[#19C37D]/20 text-[#19C37D]">
                        Task A done
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium bg-[#FBBF24]/10 border border-[#FBBF24]/20 text-[#FBBF24]">
                        In progress
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
