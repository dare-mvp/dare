'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { updateLegendClaimStatus } from './actions';

export type LegendRow = {
  referral_code: string;
  email: string;
  legend_selected_at: string;
  legend_referred_count: number;
  total_referred_count: number;
  task_a_complete: boolean;
  prior_tiers: string | null;
  claim_status: string;
};

const CLAIM_BADGE: Record<string, string> = {
  pending:  'bg-white/10 border-white/10 text-muted-foreground',
  approved: 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary',
  paid:     'bg-[#FBBF24]/10 border-[#FBBF24]/20 text-[#FBBF24]',
  rejected: 'bg-red-500/10 border-red-500/20 text-red-400',
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

function PriorTierBadges({ tiers }: { tiers: string | null }) {
  if (!tiers) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {tiers.split(' + ').map((tier) => (
        <span
          key={tier}
          className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium border ${
            tier === 'champion'
              ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
              : 'bg-[#19C37D]/10 border-[#19C37D]/20 text-[#19C37D]'
          }`}
        >
          {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </span>
      ))}
    </div>
  );
}

function ClaimActions({ referralCode, status }: { referralCode: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  function handleAction(newStatus: 'approved' | 'paid' | 'rejected') {
    setActiveAction(newStatus);
    startTransition(async () => {
      await updateLegendClaimStatus(referralCode, newStatus);
      router.refresh();
      setActiveAction(null);
    });
  }

  if (status === 'paid') return null;

  const btn = 'h-7 px-2.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-50';

  return (
    <div className="flex gap-1.5">
      {status === 'pending' && (
        <>
          <button onClick={() => handleAction('approved')} disabled={isPending}
            className={`${btn} bg-[#19C37D]/10 border-[#19C37D]/20 text-[#19C37D] hover:bg-[#19C37D]/20`}>
            {isPending && activeAction === 'approved' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
          </button>
          <button onClick={() => handleAction('rejected')} disabled={isPending}
            className={`${btn} bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20`}>
            {isPending && activeAction === 'rejected' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reject'}
          </button>
        </>
      )}
      {status === 'approved' && (
        <button onClick={() => handleAction('paid')} disabled={isPending}
          className={`${btn} bg-[#FBBF24]/10 border-[#FBBF24]/20 text-[#FBBF24] hover:bg-[#FBBF24]/20`}>
          {isPending && activeAction === 'paid' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Paid'}
        </button>
      )}
      {status === 'rejected' && (
        <button onClick={() => handleAction('approved')} disabled={isPending}
          className={`${btn} bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10`}>
          {isPending && activeAction === 'approved' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Re-open'}
        </button>
      )}
    </div>
  );
}

export function LegendTable({ rows }: { rows: LegendRow[] }) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  function toggleReveal(code: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  if (rows.length === 0) {
    return <p className="px-6 py-12 text-center text-sm text-muted-foreground">No legend players yet.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-white/8 text-muted-foreground">
        <tr>
          <th className="px-4 py-3 text-left font-medium">Email</th>
          <th className="px-4 py-3 text-left font-medium">Code</th>
          <th className="px-4 py-3 text-left font-medium">Prior tier</th>
          <th className="px-4 py-3 text-left font-medium">Selected</th>
          <th className="px-4 py-3 text-left font-medium">Task A refs</th>
          <th className="px-4 py-3 text-left font-medium">Task A</th>
          <th className="px-4 py-3 text-left font-medium">Claim</th>
          <th className="px-4 py-3 text-left font-medium">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {rows.map((row) => {
          const isRevealed = revealed.has(row.referral_code);
          return (
            <tr key={row.referral_code}>

              {/* Email + reveal toggle */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-foreground">
                    {isRevealed ? row.email : maskEmail(row.email)}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleReveal(row.referral_code)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={isRevealed ? 'Hide email' : 'Reveal email'}
                  >
                    {isRevealed
                      ? <EyeOff className="h-3.5 w-3.5" />
                      : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </td>

              {/* Referral code */}
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {row.referral_code}
              </td>

              {/* Prior tier badges */}
              <td className="px-4 py-3">
                <PriorTierBadges tiers={row.prior_tiers} />
              </td>

              {/* Legend selected time */}
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {timeAgo(row.legend_selected_at)}
              </td>

              {/* Task A progress */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full ${row.task_a_complete ? 'bg-[#19C37D]' : 'bg-[#FBBF24]'}`}
                      style={{ width: `${Math.min(100, (row.legend_referred_count / 5) * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-foreground whitespace-nowrap">
                    {row.legend_referred_count} / 5
                    <span className="text-muted-foreground ml-1">({row.total_referred_count} total)</span>
                  </span>
                </div>
              </td>

              {/* Task A status */}
              <td className="px-4 py-3">
                {row.task_a_complete ? (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium bg-[#19C37D]/10 border border-[#19C37D]/20 text-[#19C37D]">
                    Done ✓
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium bg-[#FBBF24]/10 border border-[#FBBF24]/20 text-[#FBBF24]">
                    In progress
                  </span>
                )}
              </td>

              {/* Claim status */}
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium border capitalize ${CLAIM_BADGE[row.claim_status] ?? CLAIM_BADGE.pending}`}>
                  {row.claim_status === 'paid' ? 'Paid ✓' : row.claim_status}
                </span>
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <ClaimActions referralCode={row.referral_code} status={row.claim_status} />
              </td>

            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
