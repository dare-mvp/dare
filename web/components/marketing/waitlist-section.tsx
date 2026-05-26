'use client';

import { useActionState } from 'react';
import { joinWaitlist, type WaitlistState } from '@/app/(marketing)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: WaitlistState = {};

const ROLES = [
  { value: '', label: 'Select role (optional)' },
  { value: 'player', label: 'Player' },
  { value: 'creator', label: 'Creator' },
  { value: 'community_lead', label: 'Community lead' },
  { value: 'partner', label: 'Partner' },
];

export function WaitlistSection() {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);

  if (state.ok) {
    return (
      <section className="bg-brand-surface px-6 py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-syne text-3xl font-extrabold text-foreground">You&apos;re on the list.</h2>
          <p className="mt-3 text-muted-foreground">We&apos;ll reach out when DARE opens to your region.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" className="bg-brand-surface px-6 py-24">
      <div className="mx-auto max-w-xl space-y-8">
        <div className="text-center">
          <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            Be first in.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sign up to get early access and launch updates.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="waitlist-email">Email address</Label>
            <Input
              id="waitlist-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="waitlist-role">I am a…</Label>
            <select
              id="waitlist-role"
              name="role"
              title="Select your role"
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

          {state.error === 'duplicate' && (
            <p className="text-sm text-muted-foreground">You&apos;re already signed up.</p>
          )}
          {state.error === 'invalid_email' && (
            <p className="text-sm text-destructive">Enter a valid email address.</p>
          )}
          {state.error === 'unknown' && (
            <p className="text-sm text-destructive">Something went wrong. Try again.</p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-brand-primary text-white hover:opacity-90"
          >
            {pending ? 'Joining…' : 'Join waitlist'}
          </Button>
        </form>
      </div>
    </section>
  );
}
