'use client';

import { useState } from 'react';
import { CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { TALENT_REFERRAL_MIN } from '@/lib/talent-challenge-config';

const IG_URL = 'https://www.instagram.com/dareappofficial';
const HASHTAG = '#ShowMeYourDare';
const IG_HANDLE = '@dareappofficial';

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface TaskCardProps {
  number: string;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  done?: boolean;
}

function TaskCard({ number, title, description, action, done }: TaskCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${
        done ? 'border-[#19C37D]/30 bg-[#19C37D]/5' : 'border-white/8 bg-brand-surface'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full border font-mono text-xs font-bold ${
            done
              ? 'border-[#19C37D]/30 bg-[#19C37D]/15 text-[#19C37D]'
              : 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'
          }`}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : number}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{title}</p>
          <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</div>
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface TalentTaskListProps {
  referralCode: string;
  referralUrl: string;
}

export function TalentTaskList({ referralCode, referralUrl }: TalentTaskListProps) {
  const [copied, setCopied] = useState(false);

  const referralPrefix = referralUrl.replace(/^https?:\/\//, '').replace(referralCode, '');

  async function handleCopyReferral() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent('talent_referral_link_copied', { source: 'task_list' });
    } catch {
      setCopied(false);
    }
  }

  // Placeholder forces the user to substitute a real name before posting.
  const dareCaption = `@[Friend's name] I dare you to top this 🔥\n\nPost your 15–30s talent video on Instagram or TikTok, tag ${IG_HANDLE}, and use ${HASHTAG}. Let's see what you've got! 👇`;

  const referralShareText = `I just joined the Show Me Your Talent Dare Challenge. Complete 8 tasks and earn ₦5,000 to your DARE wallet. Sign up with my link:`;

  const dmClaimTemplate = `Hi, I'm claiming my Show Me Your Talent reward.\n\nReferral code: ${referralCode}\n\n1. Instagram follow screenshot: [attach screenshot]\n2. My talent video link: [paste link]\n3. Friend's response video link: [paste link]\n4. Referral link share screenshot: [attach screenshot]`;

  async function handleDareShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'DARE Challenge', text: dareCaption });
        trackEvent('talent_dare_share', { method: 'native' });
        return;
      } catch { /* fall through */ }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(dareCaption)}`,
      '_blank',
      'noopener,noreferrer',
    );
    trackEvent('talent_dare_share', { method: 'whatsapp' });
  }

  async function handleReferralShare() {
    const fullText = `${referralShareText} ${referralUrl}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Show Me Your Talent', text: referralShareText, url: referralUrl });
        trackEvent('talent_ref_share', { method: 'native' });
        return;
      } catch { /* fall through */ }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(fullText)}`,
      '_blank',
      'noopener,noreferrer',
    );
    trackEvent('talent_ref_share', { method: 'whatsapp' });
  }

  function handleClaimClick() {
    trackEvent('talent_claim_dm_click', { referral_code: referralCode });
    try { navigator.clipboard.writeText(dmClaimTemplate); } catch { /* non-critical */ }
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-brand-primary mb-1">Your tasks</p>
        <h2 className="font-syne text-2xl font-extrabold text-foreground">
          Complete all 8 to earn ₦5,000
        </h2>
      </div>

      {/* Task 01 — Done */}
      <TaskCard
        number="01"
        title="Join the waitlist"
        description="You're on the list. Your referral code is active."
        done
      />

      {/* Task 02 — Follow IG */}
      <TaskCard
        number="02"
        title="Follow @dareappofficial on Instagram"
        description="Follow our official page. We'll check this when you DM to claim."
        action={
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('talent_ig_follow_click')}
            className="flex w-full items-center justify-center gap-2 h-12 rounded-xl bg-[#E1306C] px-6 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            Follow on Instagram
          </a>
        }
      />

      {/* Task 03 — Record */}
      <TaskCard
        number="03"
        title="Record your 15–30s talent video"
        description="Film yourself doing what you do best — singing, dancing, cooking, comedy, anything. Keep it 15–30 seconds. You will post this video in Task 04."
      />

      {/* Task 04 — Post + dare */}
      <TaskCard
        number="04"
        title="Post your video and dare a named friend"
        description={
          <>
            Post your talent video on Instagram or TikTok. In your caption: tag{' '}
            <span className="text-foreground font-medium">{IG_HANDLE}</span>, use{' '}
            <span className="text-foreground font-medium">{HASHTAG}</span>, and dare{' '}
            <strong className="text-foreground">one specific named person</strong> — not an open call.
            Tap below to copy the caption template, then replace{' '}
            <span className="text-foreground font-medium">@[Friend&apos;s name]</span> before posting.
          </>
        }
        action={
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleDareShare}
              className="flex w-full items-center justify-center gap-2 h-12 rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              {WA_ICON}
              Copy caption template
            </button>
            <p className="text-center font-mono text-[10px] text-brand-primary">
              Replace @[Friend&apos;s name] with the real person you are daring
            </p>
          </div>
        }
      />

      {/* Task 05 — Friend responds */}
      <TaskCard
        number="05"
        title="Get your dared friend's response video"
        description={
          <>
            Your friend posts their own talent video responding to your dare. Save their video link —
            you will need to submit it alongside yours in Task 08.
          </>
        }
      />

      {/* Task 06 — Share referral */}
      <TaskCard
        number="06"
        title="Share your referral link on WhatsApp Status or Instagram Story"
        description="Drop your link on your Status or Story so more people sign up through your code."
        action={
          <button
            type="button"
            onClick={handleReferralShare}
            className="flex w-full items-center justify-center gap-2 h-12 rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          >
            {WA_ICON}
            Share link on WhatsApp
          </button>
        }
      />

      {/* Task 07 — Refer 3 */}
      <TaskCard
        number="07"
        title={`Refer ${TALENT_REFERRAL_MIN} friends via your link`}
        description={
          <>
            Every person who signs up using your link counts automatically. You need{' '}
            {TALENT_REFERRAL_MIN} to complete this task — no manual tracking needed.
          </>
        }
        action={
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap rounded-lg border border-white/10 bg-brand-bg px-3 py-2.5 font-mono text-xs">
                <span className="text-muted-foreground">{referralPrefix}</span>
                <span className="font-bold text-brand-primary">{referralCode}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyReferral}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-colors hover:bg-white/10 active:scale-95"
                aria-label="Copy referral link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[#19C37D]" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share everywhere. Referrals are tracked automatically — no need to notify us.
            </p>
          </div>
        }
      />

      {/* Task 08 — Claim */}
      <TaskCard
        number="08"
        title="DM @dareappofficial to claim your ₦5,000"
        description={
          <>
            Once all 7 tasks are done, send us your proof package on Instagram DM or WhatsApp:
            <ol className="mt-2 space-y-1 list-none">
              <li className="flex gap-2"><span className="text-brand-primary font-mono text-[10px] pt-0.5">①</span> Screenshot of your Instagram follow (Task 02)</li>
              <li className="flex gap-2"><span className="text-brand-primary font-mono text-[10px] pt-0.5">②</span> Link to your posted talent video (Task 04)</li>
              <li className="flex gap-2"><span className="text-brand-primary font-mono text-[10px] pt-0.5">③</span> Link to your friend&apos;s response video (Task 05)</li>
              <li className="flex gap-2"><span className="text-brand-primary font-mono text-[10px] pt-0.5">④</span> Screenshot of your referral link share (Task 06)</li>
            </ol>
            <p className="mt-2">Tap either button — the message template copies to your clipboard automatically.</p>
          </>
        }
        action={
          <div className="flex flex-col gap-2">
            <a
              href="https://ig.me/m/dareappofficial"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClaimClick}
              className="flex w-full items-center justify-center gap-2 h-12 rounded-xl bg-[#E1306C] px-6 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              Claim via Instagram DM
            </a>
            <a
              href={`https://wa.me/2347014268973?text=${encodeURIComponent(dmClaimTemplate)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('talent_claim_dm_click', { referral_code: referralCode })}
              className="flex w-full items-center justify-center gap-2 h-12 rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              {WA_ICON}
              Claim via WhatsApp
            </a>
          </div>
        }
      />
    </div>
  );
}
