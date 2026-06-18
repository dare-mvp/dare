'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { updateClaimStatus } from './actions';

export type ChallengeRow = {
  referral_code: string;
  email: string;
  tier_selected_at: string;
  referred_count: number;
  task_ref_complete: boolean;
  claim_status: string;
};

type Tier = 'standard' | 'champion';

const TIER_CONFIG: Record<Tier, { refRequired: number; color: string; reward: string }> = {
  standard: { refRequired: 2, color: '#19C37D', reward: '₦2,000' },
  champion: { refRequired: 3, color: '#FF5500',  reward: '₦3,000' },
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

function ClaimActions({ referralCode, tier, status }: { referralCode: string; tier: Tier; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  function handleAction(newStatus: 'approved' | 'paid' | 'rejected') {
    setActiveAction(newStatus);
    startTransition(async () => {
      await updateClaimStatus(referralCode, tier, newStatus);
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
          <button type="button" onClick={() => handleAction('approved')} disabled={isPending}
            className={`${btn} bg-[#19C37D]/10 border-[#19C37D]/20 text-[#19C37D] hover:bg-[#19C37D]/20`}>
            {isPending && activeAction === 'approved' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
          </button>
          <button type="button" onClick={() => handleAction('rejected')} disabled={isPending}
            className={`${btn} bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20`}>
            {isPending && activeAction === 'rejected' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reject'}
          </button>
        </>
      )}
      {status === 'approved' && (
        <button type="button" onClick={() => handleAction('paid')} disabled={isPending}
          className={`${btn} bg-[#FBBF24]/10 border-[#FBBF24]/20 text-[#FBBF24] hover:bg-[#FBBF24]/20`}>
          {isPending && activeAction === 'paid' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Paid'}
        </button>
      )}
      {status === 'rejected' && (
        <button type="button" onClick={() => handleAction('approved')} disabled={isPending}
          className={`${btn} bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10`}>
          {isPending && activeAction === 'approved' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Re-open'}
        </button>
      )}
    </div>
  );
}

// Tailwind fraction classes for 2-step (standard) and 3-step (champion) bars.
// Using a static lookup avoids inline styles while keeping correct proportions.
const WIDTH_CLASSES: Record<number, string[]> = {
  2: ['w-0', 'w-1/2', 'w-full'],
  3: ['w-0', 'w-1/3', 'w-2/3', 'w-full'],
};

function ProgressBar({ count, required }: { count: number; required: number }) {
  const done   = count >= required;
  const steps  = WIDTH_CLASSES[required] ?? ['w-0', 'w-full'];
  const idx    = Math.min(count, required);
  const width  = steps[idx] ?? 'w-full';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden shrink-0">
        <div className={`h-full rounded-full transition-all ${done ? 'bg-[#19C37D]' : 'bg-[#FBBF24]'} ${width}`} />
      </div>
      <span className="font-mono text-xs text-foreground whitespace-nowrap">
        {count} / {required}
      </span>
    </div>
  );
}

export function ChallengeTable({ rows, tier }: { rows: ChallengeRow[]; tier: Tier }) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const config = TIER_CONFIG[tier];

  function toggleReveal(code: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  if (rows.length === 0) {
    return <p className="px-6 py-12 text-center text-sm text-muted-foreground">No {tier} players yet.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-white/8 text-muted-foreground">
        <tr>
          <th className="px-4 py-3 text-left font-medium">Tier</th>
          <th className="px-4 py-3 text-left font-medium">Email</th>
          <th className="px-4 py-3 text-left font-medium">Code</th>
          <th className="px-4 py-3 text-left font-medium">Selected</th>
          <th className="px-4 py-3 text-left font-medium">Refs (need {config.refRequired})</th>
          <th className="px-4 py-3 text-left font-medium">Ref task</th>
          <th className="px-4 py-3 text-left font-medium">Claim</th>
          <th className="px-4 py-3 text-left font-medium">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {rows.map((row) => {
          const isRevealed = revealed.has(row.referral_code);
          return (
            <tr key={row.referral_code}>

              {/* Tier badge */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold border capitalize ${
                    tier === 'standard'
                      ? 'bg-[#19C37D]/10 border-[#19C37D]/25 text-[#19C37D]'
                      : 'bg-brand-primary/10 border-brand-primary/25 text-brand-primary'
                  }`}
                >
                  {tier}
                </span>
              </td>

              {/* Email + reveal */}
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
                    {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </td>

              {/* Referral code */}
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {row.referral_code}
              </td>

              {/* Selected time */}
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {timeAgo(row.tier_selected_at)}
              </td>

              {/* Referral progress */}
              <td className="px-4 py-3">
                <ProgressBar
                  count={row.referred_count}
                  required={config.refRequired}
                />
              </td>

              {/* Ref task status — derived from count vs per-tier threshold, not the DB boolean */}
              <td className="px-4 py-3">
                {row.referred_count >= config.refRequired ? (
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
                <ClaimActions referralCode={row.referral_code} tier={tier} status={row.claim_status} />
              </td>

            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
