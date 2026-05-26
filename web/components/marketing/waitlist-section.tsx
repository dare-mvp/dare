'use client';

import { useActionState } from 'react';
import { joinWaitlist, type WaitlistState } from '@/app/(marketing)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';

const initialState: WaitlistState = {};

const ROLES = [
  { value: '', label: 'Select role (optional)' },
  { value: 'player', label: 'Player' },
  { value: 'creator', label: 'Creator' },
  { value: 'community_lead', label: 'Community lead' },
  { value: 'partner', label: 'Partner' },
];

const COUNTRIES = [
  { value: '', label: 'Select country (optional)' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'KE', label: 'Kenya' },
  { value: 'GH', label: 'Ghana' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'UG', label: 'Uganda' },
  { value: 'other', label: 'Other' },
];

export function WaitlistSection() {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);

  if (state.ok) {
    return (
      <section className="bg-brand-surface px-6 py-24">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#19C37D]/15">
            <CheckCircle2 className="h-8 w-8 text-[#19C37D]" />
          </div>
          <h2 className="font-syne text-3xl font-extrabold text-foreground">
            You&apos;re on the list.
          </h2>
          <p className="mt-3 text-muted-foreground">
            We&apos;ll reach out when DARE opens to your region. Spread the word.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a
              href="https://twitter.com/intent/tweet?text=I%20just%20joined%20the%20DARE%20waitlist%20%E2%80%94%20challenge%20friends%20to%20real-money%20skill%20competitions%20%F0%9F%94%A5"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-foreground transition-colors hover:bg-white/10"
            >
              Share on X
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" className="scroll-mt-14 bg-brand-surface px-6 py-24">
      <div className="mx-auto max-w-xl space-y-8">
        <div className="text-center">
          <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            Be first in.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sign up to get early access and launch updates for your region.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="waitlist-email">Email address *</Label>
            <Input
              id="waitlist-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={pending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="waitlist-country">Country</Label>
              <select
                id="waitlist-country"
                name="country"
                title="Country"
                disabled={pending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="waitlist-role">I am a...</Label>
              <select
                id="waitlist-role"
                name="role"
                title="Role"
                disabled={pending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="waitlist-phone">
              Phone number{' '}
              <span className="text-muted-foreground">(optional - for SMS launch alerts)</span>
            </Label>
            <Input
              id="waitlist-phone"
              name="phone"
              type="tel"
              placeholder="+234 800 000 0000"
              disabled={pending}
            />
          </div>

          {state.error === 'duplicate' && (
            <p className="text-sm text-muted-foreground">You&apos;re already signed up.</p>
          )}
          {state.error === 'invalid_email' && (
            <p className="text-sm text-destructive">Enter a valid email address.</p>
          )}
          {state.error === 'invalid_phone' && (
            <p className="text-sm text-destructive">Enter a valid phone number or leave it blank.</p>
          )}
          {state.error === 'unknown' && (
            <p className="text-sm text-destructive">Something went wrong. Try again.</p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-brand-primary text-white hover:opacity-90"
          >
            {pending ? 'Joining...' : 'Join waitlist'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            No spam. Unsubscribe any time.
          </p>
        </form>
      </div>
    </section>
  );
}
