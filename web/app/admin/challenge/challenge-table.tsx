'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { updateClaimStatus } from './actions';
import { ChallengeMobileCards } from './mobile-cards';

export type ChallengeRow = {
  referral_code: string;
  email: string;
  tier_selected_at: string;
  referred_count: number;
  task_ref_complete: boolean;
  claim_status: string;
};

type Tier = 'standard' | 'champion';

const TIER_CONFIG: Record<Tier, { refRequired: number }> = {
  standard: { refRequired: 2 },
  champion: { refRequired: 3 },
};

const CLAIM_BADGE: Record<string, string> = {
  pending: 'bg-white/10 border-white/10 text-muted-foreground',
  approved: 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary',
  paid: 'bg-[#FBBF24]/10 border-[#FBBF24]/20 text-[#FBBF24]',
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

function ClaimActions({
  referralCode,
  tier,
  status,
}: {
  referralCode: string;
  tier: Tier;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function handleAction(newStatus: 'approved' | 'paid' | 'rejected') {
    setActiveAction(newStatus);
    setActionError(null);
    startTransition(async () => {
      const result = await updateClaimStatus(referralCode, tier, newStatus);
      if ('error' in result) {
        setActionError('Failed. Try again.');
      } else {
        router.refresh();
      }
      setActiveAction(null);
    });
  }

  if (status === 'paid') return null;

  const btn =
    'inline-flex h-8 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-colors disabled:opacity-50';

  return (
    <div className="flex flex-col gap-1">
      {actionError && <p className="font-mono text-[10px] text-red-400">{actionError}</p>}
      <div className="flex flex-wrap gap-1.5">
        {status === 'pending' && (
          <>
            <button
              type="button"
              onClick={() => handleAction('approved')}
              disabled={isPending}
              className={`${btn} bg-[#19C37D]/10 border-[#19C37D]/20 text-[#19C37D] hover:bg-[#19C37D]/20`}
            >
              {isPending && activeAction === 'approved' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
            </button>
            <button
              type="button"
              onClick={() => handleAction('rejected')}
              disabled={isPending}
              className={`${btn} bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20`}
            >
              {isPending && activeAction === 'rejected' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reject'}
            </button>
          </>
        )}
        {status === 'approved' && (
          <button
            type="button"
            onClick={() => handleAction('paid')}
            disabled={isPending}
            className={`${btn} bg-[#FBBF24]/10 border-[#FBBF24]/20 text-[#FBBF24] hover:bg-[#FBBF24]/20`}
          >
            {isPending && activeAction === 'paid' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Paid'}
          </button>
        )}
        {status === 'rejected' && (
          <button
            type="button"
            onClick={() => handleAction('approved')}
            disabled={isPending}
            className={`${btn} bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10`}
          >
            {isPending && activeAction === 'approved' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Re-open'}
          </button>
        )}
      </div>
    </div>
  );
}

const WIDTH_CLASSES: Record<number, string[]> = {
  2: ['w-0', 'w-1/2', 'w-full'],
  3: ['w-0', 'w-1/3', 'w-2/3', 'w-full'],
};

function ProgressBar({ count, required }: { count: number; required: number }) {
  const done = count >= required;
  const width = WIDTH_CLASSES[required]?.[Math.min(count, required)] ?? 'w-full';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${done ? 'bg-[#19C37D]' : 'bg-[#FBBF24]'} ${width}`} />
      </div>
      <span className="whitespace-nowrap font-mono text-xs text-foreground">
        {count} / {required}
      </span>
    </div>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold border capitalize ${
        tier === 'standard'
          ? 'bg-[#19C37D]/10 border-[#19C37D]/25 text-[#19C37D]'
          : 'bg-brand-primary/10 border-brand-primary/25 text-brand-primary'
      }`}
    >
      {tier}
    </span>
  );
}

function TaskBadge({ done }: { done: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium border ${
        done
          ? 'bg-[#19C37D]/10 border-[#19C37D]/20 text-[#19C37D]'
          : 'bg-[#FBBF24]/10 border-[#FBBF24]/20 text-[#FBBF24]'
      }`}
    >
      {done ? 'Done' : 'In progress'}
    </span>
  );
}

function ClaimBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium border capitalize ${CLAIM_BADGE[status] ?? CLAIM_BADGE.pending}`}>
      {status === 'paid' ? 'Paid' : status}
    </span>
  );
}

export function ChallengeTable({ rows, tier }: { rows: ChallengeRow[]; tier: Tier }) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const config = TIER_CONFIG[tier];

  function toggleReveal(code: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  if (rows.length === 0) {
    return <p className="px-6 py-12 text-center text-sm text-muted-foreground">No {tier} players yet.</p>;
  }

  return (
    <>
      <ChallengeMobileCards
        rows={rows}
        tier={tier}
        refRequired={config.refRequired}
        revealed={revealed}
        onToggleReveal={toggleReveal}
        renderActions={(row) => (
          <ClaimActions referralCode={row.referral_code} tier={tier} status={row.claim_status} />
        )}
      />

      <table className="hidden w-full text-sm md:table">
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
                <td className="px-4 py-3 whitespace-nowrap"><TierBadge tier={tier} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{isRevealed ? row.email : maskEmail(row.email)}</span>
                    <button
                      type="button"
                      onClick={() => toggleReveal(row.referral_code)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={isRevealed ? 'Hide email' : 'Reveal email'}
                    >
                      {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.referral_code}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {timeAgo(row.tier_selected_at)}
                </td>
                <td className="px-4 py-3">
                  <ProgressBar count={row.referred_count} required={config.refRequired} />
                </td>
                <td className="px-4 py-3">
                  <TaskBadge done={row.referred_count >= config.refRequired} />
                </td>
                <td className="px-4 py-3"><ClaimBadge status={row.claim_status} /></td>
                <td className="px-4 py-3">
                  <ClaimActions referralCode={row.referral_code} tier={tier} status={row.claim_status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
