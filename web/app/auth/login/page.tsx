'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DareLogo } from '@/components/brand/dare-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type State = 'idle' | 'loading' | 'error' | 'success';

export default function LoginPage() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('loading');
    setErrorMessage('');

    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setState('error');
      setErrorMessage(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password'
          : error.message,
      );
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
          <h1 className="font-syne text-2xl font-extrabold text-foreground">Admin Sign In</h1>
          <p className="text-sm text-muted-foreground">DARE internal dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={state === 'loading' || state === 'success'}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={state === 'loading' || state === 'success'}
            />
          </div>

          {state === 'error' && (
            <p className="text-sm text-destructive">{errorMessage || 'Sign in failed. Check your credentials.'}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-brand-primary text-white hover:opacity-90"
            disabled={state === 'loading' || state === 'success'}
          >
            {state === 'loading' ? 'Signing in...' : state === 'success' ? 'Redirecting...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
