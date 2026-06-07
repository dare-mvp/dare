import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'DARE <noreply@daregamesapp.com>';

export async function sendChallengeWelcomeEmail(to: string, referralUrl: string): Promise<void> {
  try {
    await resend.emails.send({
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
            Spots are limited. Closes June 15, 2026.
          </p>

          <hr style="border:none;border-top:1px solid #1f1f23;margin:32px 0;" />

          <p style="font-size:12px;color:#52525b;">
            — The DARE Team<br />
            <a href="https://www.daregamesapp.com" style="color:#FF5500;text-decoration:none;">daregamesapp.com</a>
          </p>
        </div>
      `,
    });
  } catch {
    // Non-critical — user already has their referral link in the UI.
  }
}

export async function sendChallengeReminderEmail(to: string, referralUrl: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: '3 days left on the I Dare You Challenge',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#050509;color:#ffffff;">
          <img src="https://www.daregamesapp.com/og-image.png" alt="DARE" style="width:64px;height:64px;margin-bottom:24px;" />

          <p style="font-size:16px;line-height:1.6;color:#a1a1aa;">
            The I Dare You Challenge closes <strong style="color:#ffffff;">June 15</strong>. Your referral link is still active:
          </p>

          <a href="${referralUrl}"
             style="display:block;margin-top:16px;padding:14px 20px;background:#FF5500;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;word-break:break-all;">
            ${referralUrl}
          </a>

          <p style="font-size:15px;line-height:1.7;color:#a1a1aa;margin-top:24px;">
            Open the link, complete the tasks, earn ₦2,000–₦3,000.
          </p>

          <hr style="border:none;border-top:1px solid #1f1f23;margin:32px 0;" />

          <p style="font-size:12px;color:#52525b;">
            — The DARE Team<br />
            <a href="https://www.daregamesapp.com" style="color:#FF5500;text-decoration:none;">daregamesapp.com</a>
          </p>
        </div>
      `,
    });
  } catch {
    // Non-critical.
  }
}
