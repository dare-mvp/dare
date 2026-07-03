import Link from 'next/link';
import { Search } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TalentTable, type TalentRow } from './talent-table';

export const dynamic = 'force-dynamic';

type StatusFilter = 'all' | 'pending' | 'approved' | 'paid' | 'rejected';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'pending',  label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'paid',     label: 'Paid' },
  { id: 'rejected', label: 'Rejected' },
];

const VALID_FILTERS = new Set<StatusFilter>(['all', 'pending', 'approved', 'paid', 'rejected']);

function sanitizeSearch(value: string | undefined) {
  return (value ?? '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

function talentHref(tab: StatusFilter, q: string) {
  const params = new URLSearchParams({ tab });
  if (q) params.set('q', q);
  return `/admin/talent?${params.toString()}`;
}

export default async function TalentAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const rawTab = params.tab as StatusFilter;
  const activeTab: StatusFilter = VALID_FILTERS.has(rawTab) ? rawTab : 'all';
  const search = sanitizeSearch(params.q);

  const admin = createAdminClient();
  let query = admin
    .from('talent_challenge_progress')
    .select('*')
    .order('joined_at', { ascending: false });

  if (activeTab !== 'all') {
    query = query.eq('claim_status', activeTab);
  }
  if (search) {
    query = query.ilike('referral_code', `%${search}%`);
  }

  const { data } = await query;
  const rows = (data as TalentRow[]) ?? [];

  // Summary counts
  const total     = rows.length;
  const withClaim = rows.filter((r) => r.challenger_video_url).length;
  const approved  = rows.filter((r) => r.claim_status === 'approved').length;
  const paid      = rows.filter((r) => r.claim_status === 'paid').length;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-syne text-xl font-extrabold text-foreground sm:text-2xl">
          Talent Challenge Tracker
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Participant progress and claim status for the Show Me Your Talent challenge.
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-white/8 bg-brand-surface p-1 sm:inline-flex sm:w-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={talentHref(tab.id, search)}
            className={`rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form
        action="/admin/talent"
        className="flex flex-col gap-2 rounded-xl border border-white/8 bg-brand-surface p-3 sm:flex-row sm:items-center"
      >
        <input type="hidden" name="tab" value={activeTab} />
        <label className="sr-only" htmlFor="talent-search">Search by referral code</label>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="talent-search"
            name="q"
            defaultValue={search}
            placeholder="Search referral code"
            autoComplete="off"
            inputMode="search"
            className="h-10 rounded-lg border-white/10 bg-background/60 pl-9 font-mono text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button type="submit" className="h-10">Search</Button>
          {search && (
            <Link
              href={`/admin/talent?tab=${activeTab}`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-white/8 bg-brand-surface px-4 py-4 sm:px-5">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Participants</p>
          <p className="mt-1 font-syne text-2xl font-extrabold text-[#FBBF24] sm:text-3xl">{total}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-brand-surface px-4 py-4 sm:px-5">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Claims received</p>
          <p className="mt-1 font-syne text-2xl font-extrabold text-brand-primary sm:text-3xl">{withClaim}</p>
          <p className="mt-1 text-[10px] text-muted-foreground font-mono">video links submitted</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-brand-surface px-4 py-4 sm:px-5">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Awaiting payment</p>
          <p className="mt-1 font-syne text-2xl font-extrabold text-brand-primary sm:text-3xl">{approved}</p>
          <p className="mt-1 text-[10px] text-muted-foreground font-mono">approved, not yet paid</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-brand-surface px-4 py-4 sm:px-5">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Paid out</p>
          <p className="mt-1 font-syne text-2xl font-extrabold text-[#19C37D] sm:text-3xl">{paid}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/8 bg-brand-surface">
        <div className="border-b border-white/8 px-4 py-4 sm:px-6">
          <h2 className="font-syne text-base font-bold text-foreground">
            {activeTab === 'all' ? 'All participants' : `${activeTab.charAt(0).toUpperCase()}${activeTab.slice(1)} claims`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <TalentTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
