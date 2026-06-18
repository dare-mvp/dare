'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DareLogo } from '@/components/brand/dare-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type State = 'idle' | 'loading' | 'error' | 'success';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('loading');
    setErrorMessage('');

    const form = e.currentTarget;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value;

    if (password !== confirm) {
      setState('error');
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setState('error');
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setState('error');
      setErrorMessage(error.message);
      return;
    }

    setState('success');
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3">
          <DareLogo size="lg" />
          <h1 className="font-syne text-2xl font-extrabold text-foreground">Set a new password</h1>
          <p className="text-sm text-muted-foreground">Choose a strong password for your admin account.</p>
        </div>

        {state === 'success' ? (
          <p className="text-sm text-[#19C37D]">Password updated — redirecting to dashboard…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={state === 'loading'}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={state === 'loading'}
              />
            </div>

            {state === 'error' && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-brand-primary text-white hover:opacity-90"
              disabled={state === 'loading'}
            >
              {state === 'loading' ? 'Saving…' : 'Set password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
