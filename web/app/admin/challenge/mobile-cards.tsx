'use client';

import type { ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { ChallengeRow } from './challenge-table';
import type { LegendRow } from './legend-table';

type Tier = 'standard' | 'champion';

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

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function ClaimBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium border capitalize ${CLAIM_BADGE[status] ?? CLAIM_BADGE.pending}`}>
      {status === 'paid' ? 'Paid' : status}
    </span>
  );
}

function TaskBadge({ done }: { done: boolean }) {
  return done ? (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium bg-[#19C37D]/10 border border-[#19C37D]/20 text-[#19C37D]">
      Done
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium bg-[#FBBF24]/10 border border-[#FBBF24]/20 text-[#FBBF24]">
      In progress
    </span>
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

function ChallengeProgress({ count, required }: { count: number; required: number }) {
  const done = count >= required;
  const widthClasses: Record<number, string[]> = {
    2: ['w-0', 'w-1/2', 'w-full'],
    3: ['w-0', 'w-1/3', 'w-2/3', 'w-full'],
  };
  const width = widthClasses[required]?.[Math.min(count, required)] ?? 'w-full';

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

function PriorTierBadges({ tiers }: { tiers: string | null }) {
  if (!tiers) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
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

function LegendProgress({ row }: { row: LegendRow }) {
  const width =
    row.legend_referred_count === 0 ? 'w-0' :
    row.legend_referred_count === 1 ? 'w-1/5' :
    row.legend_referred_count === 2 ? 'w-2/5' :
    row.legend_referred_count === 3 ? 'w-3/5' :
    row.legend_referred_count === 4 ? 'w-4/5' : 'w-full';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${row.task_a_complete ? 'bg-[#19C37D]' : 'bg-[#FBBF24]'} ${width}`} />
      </div>
      <span className="whitespace-nowrap font-mono text-xs text-foreground">
        {row.legend_referred_count} / 5
        <span className="ml-1 text-muted-foreground">({row.total_referred_count} total)</span>
      </span>
    </div>
  );
}

export function ChallengeMobileCards({
  rows,
  tier,
  refRequired,
  revealed,
  onToggleReveal,
  renderActions,
}: {
  rows: ChallengeRow[];
  tier: Tier;
  refRequired: number;
  revealed: Set<string>;
  onToggleReveal: (code: string) => void;
  renderActions: (row: ChallengeRow) => ReactNode;
}) {
  return (
    <div className="divide-y divide-white/5 md:hidden">
      {rows.map((row) => {
        const isRevealed = revealed.has(row.referral_code);
        const taskDone = row.referred_count >= refRequired;

        return (
          <article key={row.referral_code} className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <IdentityBlock
                code={row.referral_code}
                email={row.email}
                isRevealed={isRevealed}
                onToggleReveal={onToggleReveal}
              />
              <TierBadge tier={tier} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Selected"><p className="font-mono text-xs text-muted-foreground">{timeAgo(row.tier_selected_at)}</p></DetailItem>
              <DetailItem label="Claim"><ClaimBadge status={row.claim_status} /></DetailItem>
              <DetailItem label={`Refs need ${refRequired}`}><ChallengeProgress count={row.referred_count} required={refRequired} /></DetailItem>
              <DetailItem label="Ref task"><TaskBadge done={taskDone} /></DetailItem>
            </div>
            {renderActions(row)}
          </article>
        );
      })}
    </div>
  );
}

export function LegendMobileCards({
  rows,
  revealed,
  onToggleReveal,
  renderActions,
}: {
  rows: LegendRow[];
  revealed: Set<string>;
  onToggleReveal: (code: string) => void;
  renderActions: (row: LegendRow) => ReactNode;
}) {
  return (
    <div className="divide-y divide-white/5 md:hidden">
      {rows.map((row) => {
        const isRevealed = revealed.has(row.referral_code);

        return (
          <article key={row.referral_code} className="space-y-4 p-4">
            <IdentityBlock
              code={row.referral_code}
              email={row.email}
              isRevealed={isRevealed}
              onToggleReveal={onToggleReveal}
            />
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Prior tier"><PriorTierBadges tiers={row.prior_tiers} /></DetailItem>
              <DetailItem label="Selected"><p className="font-mono text-xs text-muted-foreground">{timeAgo(row.legend_selected_at)}</p></DetailItem>
              <DetailItem label="Task A refs"><LegendProgress row={row} /></DetailItem>
              <DetailItem label="Claim"><ClaimBadge status={row.claim_status} /></DetailItem>
              <DetailItem label="Task A"><TaskBadge done={row.task_a_complete} /></DetailItem>
            </div>
            {renderActions(row)}
          </article>
        );
      })}
    </div>
  );
}

function IdentityBlock({
  code,
  email,
  isRevealed,
  onToggleReveal,
}: {
  code: string;
  email: string;
  isRevealed: boolean;
  onToggleReveal: (code: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <p className="min-w-0 break-all text-sm font-medium text-foreground">
          {isRevealed ? email : maskEmail(email)}
        </p>
        <button
          type="button"
          onClick={() => onToggleReveal(code)}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={isRevealed ? 'Hide email' : 'Reveal email'}
        >
          {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{code}</p>
    </div>
  );
}
