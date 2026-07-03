'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ExternalLink } from 'lucide-react';
import { submitTalentClaim, updateTalentClaimStatus } from './actions';

export type TalentRow = {
  referral_code: string;
  email: string;
  joined_at: string;
  referred_count: number;
  ref_task_complete: boolean;
  claim_status: string;
  challenger_video_url: string | null;
  response_video_url: string | null;
  claim_submitted_at: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  reviewer_notes: string | null;
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

function ProgressBar({ count }: { count: number }) {
  const done = count >= 3;
  const widths = ['w-0', 'w-1/3', 'w-2/3', 'w-full'];
  const width = widths[Math.min(count, 3)];
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${done ? 'bg-[#19C37D]' : 'bg-[#FBBF24]'} ${width}`} />
      </div>
      <span className="whitespace-nowrap font-mono text-xs text-foreground">{count} / 3</span>
    </div>
  );
}

function ClaimBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium border capitalize ${CLAIM_BADGE[status] ?? CLAIM_BADGE.pending}`}
    >
      {status}
    </span>
  );
}

function VideoLink({ url, label }: { url: string; label: string }) {
  if (!url) return <span className="font-mono text-[10px] text-muted-foreground">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[10px] text-brand-primary hover:underline"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

// ── Log Claim form ────────────────────────────────────────────────────────────

function LogClaimForm({ referralCode, onDone }: { referralCode: string; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const challengerUrl = (form.elements.namedItem('challenger_url') as HTMLInputElement).value.trim();
    const responseUrl   = (form.elements.namedItem('response_url')   as HTMLInputElement).value.trim();

    if (!challengerUrl || !responseUrl) {
      setError('Both video URLs are required.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await submitTalentClaim(referralCode, challengerUrl, responseUrl);
      if ('error' in result) {
        const msg = result.error === 'already_submitted'
          ? 'A claim is already logged for this code.'
          : `Error: ${result.error}. Check the URLs and try again.`;
        setError(msg);
      } else {
        router.refresh();
        onDone();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-xl border border-white/10 bg-brand-bg p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Log DM claim</p>
      <input
        name="challenger_url"
        type="url"
        placeholder="Challenger video URL"
        required
        disabled={isPending}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <input
        name="response_url"
        type="url"
        placeholder="Friend's response video URL"
        required
        disabled={isPending}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-8 items-center justify-center rounded-md border border-[#19C37D]/20 bg-[#19C37D]/10 px-3 text-xs font-medium text-[#19C37D] hover:bg-[#19C37D]/20 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Submit claim'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Status actions ────────────────────────────────────────────────────────────

function StatusActions({
  referralCode,
  status,
  existingNotes,
}: {
  referralCode: string;
  status: string;
  existingNotes: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(existingNotes ?? '');

  function handleAction(newStatus: 'approved' | 'paid' | 'rejected') {
    setActiveAction(newStatus);
    setError(null);
    startTransition(async () => {
      const result = await updateTalentClaimStatus(referralCode, newStatus, notes);
      if ('error' in result) {
        const msg = result.error === 'task_incomplete'
          ? 'Cannot approve — fewer than 3 referrals.'
          : 'Failed. Try again.';
        setError(msg);
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
    <div className="flex flex-col gap-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Reviewer notes (optional)"
        rows={2}
        className="w-full rounded-lg border border-white/10 bg-brand-bg px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
      />
      {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}
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

// ── Table ─────────────────────────────────────────────────────────────────────

export function TalentTable({ rows }: { rows: TalentRow[] }) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [logClaimFor, setLogClaimFor] = useState<string | null>(null);

  function toggleReveal(code: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  if (rows.length === 0) {
    return (
      <p className="px-6 py-12 text-center text-sm text-muted-foreground">No talent participants yet.</p>
    );
  }

  const hasClaim = (row: TalentRow) => !!row.challenger_video_url;

  return (
    <>
      {/* ── Mobile cards ──────────────────────────────────────────── */}
      <div className="divide-y divide-white/5 md:hidden">
        {rows.map((row) => {
          const isRevealed = revealed.has(row.referral_code);
          const claimed = hasClaim(row);

          return (
            <div key={row.referral_code} className="space-y-3 px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-foreground">
                      {isRevealed ? row.email : maskEmail(row.email)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleReveal(row.referral_code)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label={isRevealed ? 'Hide email' : 'Reveal email'}
                    >
                      {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{row.referral_code}</p>
                </div>
                <ClaimBadge status={row.claim_status} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="mb-1 font-mono text-[10px] text-muted-foreground">Referrals</p>
                  <ProgressBar count={row.referred_count} />
                </div>
                <div>
                  <p className="mb-1 font-mono text-[10px] text-muted-foreground">Joined</p>
                  <p className="font-mono text-xs text-muted-foreground">{timeAgo(row.joined_at)}</p>
                </div>
              </div>

              {claimed && (
                <div className="flex gap-4">
                  <VideoLink url={row.challenger_video_url ?? ''} label="Talent" />
                  <VideoLink url={row.response_video_url ?? ''} label="Response" />
                </div>
              )}

              {row.reviewer_notes && (
                <p className="text-[10px] text-muted-foreground italic">{row.reviewer_notes}</p>
              )}

              {claimed ? (
                <StatusActions referralCode={row.referral_code} status={row.claim_status} existingNotes={row.reviewer_notes} />
              ) : (
                logClaimFor === row.referral_code ? (
                  <LogClaimForm referralCode={row.referral_code} onDone={() => setLogClaimFor(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setLogClaimFor(row.referral_code)}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    Log DM claim
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ──────────────────────────────────────────── */}
      <table className="hidden w-full text-sm md:table">
        <thead className="border-b border-white/8 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Email</th>
            <th className="px-4 py-3 text-left font-medium">Code</th>
            <th className="px-4 py-3 text-left font-medium">Joined</th>
            <th className="px-4 py-3 text-left font-medium">Refs (need 3)</th>
            <th className="px-4 py-3 text-left font-medium">Videos</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => {
            const isRevealed = revealed.has(row.referral_code);
            const claimed = hasClaim(row);

            return (
              <tr key={row.referral_code} className="align-top">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">
                      {isRevealed ? row.email : maskEmail(row.email)}
                    </span>
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
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {row.referral_code}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {timeAgo(row.joined_at)}
                </td>
                <td className="px-4 py-3">
                  <ProgressBar count={row.referred_count} />
                </td>
                <td className="px-4 py-3 space-y-1">
                  <VideoLink url={row.challenger_video_url ?? ''} label="Talent video" />
                  <VideoLink url={row.response_video_url ?? ''} label="Response video" />
                </td>
                <td className="px-4 py-3">
                  <ClaimBadge status={row.claim_status} />
                  {row.claim_submitted_at && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {timeAgo(row.claim_submitted_at)}
                    </p>
                  )}
                  {row.reviewer_notes && (
                    <p className="mt-1 text-[10px] text-muted-foreground italic max-w-[160px] truncate" title={row.reviewer_notes}>
                      {row.reviewer_notes}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {claimed ? (
                    <StatusActions referralCode={row.referral_code} status={row.claim_status} existingNotes={row.reviewer_notes} />
                  ) : (
                    logClaimFor === row.referral_code ? (
                      <LogClaimForm referralCode={row.referral_code} onDone={() => setLogClaimFor(null)} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setLogClaimFor(row.referral_code)}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      >
                        Log DM claim
                      </button>
                    )
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
