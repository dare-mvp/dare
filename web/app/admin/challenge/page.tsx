import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { LegendTable, type LegendRow } from './legend-table';
import { ChallengeTable, type ChallengeRow } from './challenge-table';

export const dynamic = 'force-dynamic';

type Tab = 'standard' | 'champion' | 'legend';

const TABS: { id: Tab; label: string; reward: string }[] = [
  { id: 'standard', label: 'Standard', reward: '₦2,000' },
  { id: 'champion', label: 'Champion', reward: '₦3,000' },
  { id: 'legend',   label: 'Legend',   reward: '₦9,000' },
];

export default async function ChallengePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const activeTab: Tab = (params.tab as Tab) ?? 'standard';

  const admin = createAdminClient();

  // Fetch all three in parallel
  const [
    { data: standardData },
    { data: championData },
    { data: legendData },
  ] = await Promise.all([
    admin.from('standard_referral_progress').select('*').order('tier_selected_at', { ascending: false }),
    admin.from('champion_referral_progress').select('*').order('tier_selected_at', { ascending: false }),
    admin.from('legend_referral_progress').select('*').order('legend_selected_at', { ascending: false }),
  ]);

  const standardRows = (standardData as ChallengeRow[]) ?? [];
  const championRows = (championData as ChallengeRow[]) ?? [];
  const legendRows   = (legendData as LegendRow[])      ?? [];

  // Summary counts per tab
  const summaries = {
    standard: {
      total:    standardRows.length,
      taskDone: standardRows.filter((r) => r.task_ref_complete).length,
      approved: standardRows.filter((r) => r.claim_status === 'approved').length,
      paid:     standardRows.filter((r) => r.claim_status === 'paid').length,
      taskLabel: 'Ref task done (2+)',
    },
    champion: {
      total:    championRows.length,
      taskDone: championRows.filter((r) => r.task_ref_complete).length,
      approved: championRows.filter((r) => r.claim_status === 'approved').length,
      paid:     championRows.filter((r) => r.claim_status === 'paid').length,
      taskLabel: 'Ref task done (3+)',
    },
    legend: {
      total:    legendRows.length,
      taskDone: legendRows.filter((r) => r.task_a_complete).length,
      approved: legendRows.filter((r) => r.claim_status === 'approved').length,
      paid:     legendRows.filter((r) => r.claim_status === 'paid').length,
      taskLabel: 'Task A done (5+)',
    },
  };

  const s = summaries[activeTab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-syne text-2xl font-extrabold text-foreground">Challenge Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Referral progress and claim status for each tier.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-white/8 bg-brand-surface p-1 w-fit">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/admin/challenge?tab=${tab.id}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 font-mono text-xs opacity-60">{tab.reward}</span>
          </Link>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/8 bg-brand-surface px-5 py-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
            {TABS.find((t) => t.id === activeTab)?.label} players
          </p>
          <p className="mt-1 font-syne text-3xl font-extrabold text-[#FBBF24]">{s.total}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-brand-surface px-5 py-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">{s.taskLabel}</p>
          <p className="mt-1 font-syne text-3xl font-extrabold text-[#19C37D]">{s.taskDone}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-brand-surface px-5 py-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Awaiting payment</p>
          <p className="mt-1 font-syne text-3xl font-extrabold text-brand-primary">{s.approved}</p>
          <p className="mt-1 text-[10px] text-muted-foreground font-mono">approved, not yet paid</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-brand-surface px-5 py-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Paid out</p>
          <p className="mt-1 font-syne text-3xl font-extrabold text-[#19C37D]">{s.paid}</p>
          <p className="mt-1 text-[10px] text-muted-foreground font-mono">approved + paid</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 bg-brand-surface overflow-hidden">
        <div className="border-b border-white/8 px-6 py-4">
          <h2 className="font-syne text-base font-bold text-foreground">
            {TABS.find((t) => t.id === activeTab)?.label} player progress
          </h2>
        </div>
        <div className="overflow-x-auto">
          {activeTab === 'standard' && <ChallengeTable rows={standardRows} tier="standard" />}
          {activeTab === 'champion' && <ChallengeTable rows={championRows} tier="champion" />}
          {activeTab === 'legend'   && <LegendTable rows={legendRows} />}
        </div>
      </div>
    </div>
  );
}
