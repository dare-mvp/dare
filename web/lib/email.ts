import { Resend } from 'resend';
import { CHALLENGE_END_LABEL, LEGEND_START_LABEL, LEGEND_END_LABEL } from '@/lib/challenge-config';

const FROM = 'DARE <noreply@daregamesapp.com>';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// ---------------------------------------------------------------------------
// Challenge welcome — sent when someone joins the waitlist
// ---------------------------------------------------------------------------

export function buildChallengeWelcomePayload(to: string, referralUrl: string) {
  return {
    from: FROM,
    to,
    subject: 'Your I Dare You referral link is ready 🔥',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#050509;color:#ffffff;">
        <img src="https://www.daregamesapp.com/og-image.png" alt="DARE" style="width:64px;height:64px;margin-bottom:24px;" />

        <p style="font-size:16px;line-height:1.6;color:#a1a1aa;">
          You're on the DARE waitlist. Task 01 is done.
        </p>

        <p style="font-size:14px;color:#a1a1aa;margin-top:24px;text-transform:uppercase;letter-spacing:0.1em;font-family:monospace;">
          Your referral link
        </p>

        <a href="${referralUrl}"
           style="display:block;margin-top:8px;padding:14px 20px;background:#FF5500;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;word-break:break-all;">
          ${referralUrl}
        </a>

        <p style="font-size:15px;line-height:1.7;color:#a1a1aa;margin-top:24px;">
          Visit the link above to see your next steps and complete the I Dare You Challenge.
        </p>

        <p style="font-size:14px;color:#71717a;margin-top:8px;">
          Spots are limited. Standard &amp; Champion close ${CHALLENGE_END_LABEL}.
        </p>

        <p style="font-size:14px;color:#71717a;margin-top:4px;">
          Complete Standard or Champion and a new Legend Dare unlocks ${LEGEND_START_LABEL} — earn ₦9,000 (closes ${LEGEND_END_LABEL}).
        </p>

        <hr style="border:none;border-top:1px solid #1f1f23;margin:32px 0;" />

        <p style="font-size:12px;color:#52525b;">
          — The DARE Team<br />
          <a href="https://www.daregamesapp.com" style="color:#FF5500;text-decoration:none;">daregamesapp.com</a>
        </p>
      </div>
    `,
  };
}

export async function sendChallengeWelcomeEmail(to: string, referralUrl: string): Promise<void> {
  try {
    await getResend().emails.send(buildChallengeWelcomePayload(to, referralUrl));
  } catch {
    // Non-critical — user already has their referral link in the UI.
  }
}

// ---------------------------------------------------------------------------
// Legend welcome — sent when Legend opens (June 15)
// ---------------------------------------------------------------------------

export function buildLegendWelcomePayload(to: string, referralUrl: string) {
  return {
    from: FROM,
    to,
    subject: 'Legend Dare is now open — earn ₦9,000 👑',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#050509;color:#ffffff;">
        <img src="https://www.daregamesapp.com/og-image.png" alt="DARE" style="width:64px;height:64px;margin-bottom:24px;" />

        <p style="font-size:12px;color:#FBBF24;text-transform:uppercase;letter-spacing:0.12em;font-family:monospace;margin-bottom:4px;">
          Legend Dare
        </p>

        <p style="font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;margin:0 0 16px;">
          You unlocked the next level.
        </p>

        <p style="font-size:15px;line-height:1.7;color:#a1a1aa;">
          You completed Standard or Champion — that means <strong style="color:#ffffff;">Legend Dare is now open for you</strong>. Complete three more tasks and earn <strong style="color:#FBBF24;">₦9,000</strong>.
        </p>

        <div style="margin:24px 0;padding:20px;background:#0e0e1a;border-radius:12px;border:1px solid rgba(251,191,36,0.15);">
          <p style="font-size:11px;color:#FBBF24;text-transform:uppercase;letter-spacing:0.1em;font-family:monospace;margin:0 0 14px;">Your 3 tasks</p>

          <div style="display:flex;gap:10px;margin-bottom:10px;">
            <span style="font-family:monospace;font-size:10px;color:#FBBF24;min-width:16px;padding-top:2px;">A</span>
            <div>
              <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Refer 5 friends</p>
              <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Use your referral link. Auto-tracked — no screenshot needed.</p>
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-bottom:10px;">
            <span style="font-family:monospace;font-size:10px;color:#FBBF24;min-width:16px;padding-top:2px;">B</span>
            <div>
              <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Film a DARE battle</p>
              <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Dare a friend on camera. They film their response. Post both videos, tag @dareappofficial, #IDareYouNG.</p>
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-bottom:10px;">
            <span style="font-family:monospace;font-size:10px;color:#FBBF24;min-width:16px;padding-top:2px;">C</span>
            <div>
              <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Drop in a WhatsApp community</p>
              <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Share your link in a group of 20+ people. Screenshot the delivery as proof.</p>
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <span style="font-family:monospace;font-size:10px;color:#FBBF24;min-width:16px;padding-top:2px;">D</span>
            <div>
              <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Join our WhatsApp Channel</p>
              <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Join the official DARE channel. Screenshot your membership screen as proof.</p>
              <a href="https://whatsapp.com/channel/0029VbCZi4bLdQec56X6i81K" style="display:inline-block;margin-top:6px;font-size:12px;color:#25D366;text-decoration:none;">Join DARE WhatsApp Channel →</a>
            </div>
          </div>
        </div>

        <p style="font-size:14px;color:#a1a1aa;margin-bottom:8px;">Your referral link (Task A is auto-tracked with this):</p>

        <a href="${referralUrl}"
           style="display:block;padding:14px 20px;background:#FBBF24;color:#000000;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;word-break:break-all;">
          ${referralUrl}
        </a>

        <p style="font-size:14px;color:#71717a;margin-top:16px;">
          When done, DM <strong style="color:#ffffff;">@dareappofficial</strong> on Instagram or WhatsApp with your proof (battle videos, WhatsApp group screenshot, channel membership screenshot):<br/>
          <span style="font-family:monospace;color:#FBBF24;">Legend Dare complete — ref: YOUR_CODE</span>
        </p>

        <p style="font-size:13px;color:#52525b;margin-top:8px;">
          Legend Dare closes ${LEGEND_END_LABEL}.
        </p>

        <hr style="border:none;border-top:1px solid #1f1f23;margin:32px 0;" />

        <p style="font-size:12px;color:#52525b;">
          — The DARE Team<br />
          <a href="https://www.daregamesapp.com" style="color:#FF5500;text-decoration:none;">daregamesapp.com</a>
        </p>
      </div>
    `,
  };
}

export async function sendLegendWelcomeEmail(to: string, referralUrl: string): Promise<void> {
  try {
    await getResend().emails.send(buildLegendWelcomePayload(to, referralUrl));
  } catch {
    // Non-critical.
  }
}

// ---------------------------------------------------------------------------
// Legend closing soon — sent 3 days before Legend closes (fires July 12)
// ---------------------------------------------------------------------------

export function buildLegendClosingSoonPayload(to: string, referralUrl: string) {
  return {
    from: FROM,
    to,
    subject: `3 days left — Legend Dare closes ${LEGEND_END_LABEL} 👑`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#050509;color:#ffffff;">
        <img src="https://www.daregamesapp.com/og-image.png" alt="DARE" style="width:64px;height:64px;margin-bottom:24px;" />

        <p style="font-size:12px;color:#FBBF24;text-transform:uppercase;letter-spacing:0.12em;font-family:monospace;margin-bottom:4px;">
          Last chance
        </p>

        <p style="font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;margin:0 0 16px;">
          Legend Dare closes ${LEGEND_END_LABEL}.
        </p>

        <p style="font-size:15px;line-height:1.7;color:#a1a1aa;">
          You're eligible for <strong style="color:#FBBF24;">Legend Dare — ₦9,000</strong>. Three days left to complete your tasks and claim.
        </p>

        <div style="margin:24px 0;padding:20px;background:#0e0e1a;border-radius:12px;border:1px solid rgba(251,191,36,0.15);">
          <p style="font-size:11px;color:#FBBF24;text-transform:uppercase;letter-spacing:0.1em;font-family:monospace;margin:0 0 14px;">3 tasks remaining</p>

          <div style="display:flex;gap:10px;margin-bottom:10px;">
            <span style="font-family:monospace;font-size:10px;color:#FBBF24;min-width:16px;padding-top:2px;">A</span>
            <div>
              <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Refer 5 friends</p>
              <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Auto-tracked via your referral link.</p>
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-bottom:10px;">
            <span style="font-family:monospace;font-size:10px;color:#FBBF24;min-width:16px;padding-top:2px;">B</span>
            <div>
              <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Film a DARE battle</p>
              <p style="margin:4px 0 0;font-size:12px;color:#71717a;">You + a friend, on camera. Post both videos tagging @dareappofficial.</p>
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-bottom:10px;">
            <span style="font-family:monospace;font-size:10px;color:#FBBF24;min-width:16px;padding-top:2px;">C</span>
            <div>
              <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Drop in a WhatsApp community</p>
              <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Share your link in a group of 20+. Screenshot proof.</p>
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <span style="font-family:monospace;font-size:10px;color:#FBBF24;min-width:16px;padding-top:2px;">D</span>
            <div>
              <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Join our WhatsApp Channel</p>
              <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Join the official DARE channel. Screenshot your membership as proof.</p>
              <a href="https://whatsapp.com/channel/0029VbCZi4bLdQec56X6i81K" style="display:inline-block;margin-top:6px;font-size:12px;color:#25D366;text-decoration:none;">Join DARE WhatsApp Channel →</a>
            </div>
          </div>
        </div>

        <a href="${referralUrl}"
           style="display:block;padding:14px 20px;background:#FBBF24;color:#000000;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;word-break:break-all;">
          ${referralUrl}
        </a>

        <p style="font-size:14px;color:#71717a;margin-top:16px;">
          When done, DM <strong style="color:#ffffff;">@dareappofficial</strong> on Instagram or WhatsApp with your proof:<br/>
          <span style="font-family:monospace;color:#FBBF24;">Legend Dare complete — ref: YOUR_CODE</span>
        </p>

        <hr style="border:none;border-top:1px solid #1f1f23;margin:32px 0;" />

        <p style="font-size:12px;color:#52525b;">
          — The DARE Team<br />
          <a href="https://www.daregamesapp.com" style="color:#FF5500;text-decoration:none;">daregamesapp.com</a>
        </p>
      </div>
    `,
  };
}

export async function sendClosingSoonEmail(to: string, referralUrl: string): Promise<void> {
  try {
    await getResend().emails.send(buildLegendClosingSoonPayload(to, referralUrl));
  } catch {
    // Non-critical.
  }
}
