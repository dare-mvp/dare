import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { LegendTable, type LegendRow } from './legend-table';

export const dynamic = 'force-dynamic';

export default async function ChallengePage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: legendPlayers } = await admin
    .from('legend_referral_progress')
    .select('*')
    .order('legend_selected_at', { ascending: false });

  const rows = (legendPlayers as LegendRow[]) ?? [];
  const taskAComplete = rows.filter((r) => r.task_a_complete).length;
  const approved     = rows.filter((r) => r.claim_status === 'approved').length;
  const paid         = rows.filter((r) => r.claim_status === 'paid').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-syne text-2xl font-extrabold text-foreground">Challenge — Legend</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Legend players, Task A referral progress, and claim status.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/8 bg-brand-surface px-5 py-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Legend players</p>
          <p className="mt-1 font-syne text-3xl font-extrabold text-[#FBBF24]">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-brand-surface px-5 py-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Task A done (5+ refs)</p>
          <p className="mt-1 font-syne text-3xl font-extrabold text-[#19C37D]">{taskAComplete}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-brand-surface px-5 py-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Approved</p>
          <p className="mt-1 font-syne text-3xl font-extrabold text-brand-primary">{approved}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-brand-surface px-5 py-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Paid out</p>
          <p className="mt-1 font-syne text-3xl font-extrabold text-foreground">{paid}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 bg-brand-surface overflow-hidden">
        <div className="border-b border-white/8 px-6 py-4">
          <h2 className="font-syne text-base font-bold text-foreground">Legend player progress</h2>
        </div>
        <div className="overflow-x-auto">
          <LegendTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
