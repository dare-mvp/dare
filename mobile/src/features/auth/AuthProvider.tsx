import { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { backendConfig } from '../../lib/config/env';
import { supabaseClient } from '../../lib/supabase/client';

type AuthStatus = 'authenticated' | 'error' | 'loading' | 'preview' | 'unauthenticated';

type AuthOperationResult =
  | {
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

type AuthContextValue = {
  isBackendConfigured: boolean;
  session: Session | null;
  signInWithPassword: (email: string, password: string) => Promise<AuthOperationResult>;
  signOut: () => Promise<AuthOperationResult>;
  signUpWithPassword: (input: {
    displayName: string;
    email: string;
    password: string;
  }) => Promise<AuthOperationResult>;
  status: AuthStatus;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(backendConfig.isConfigured ? 'loading' : 'preview');

  useEffect(() => {
    if (!supabaseClient) {
      setStatus('preview');
      return;
    }

    let mounted = true;

    supabaseClient.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setStatus('error');
          return;
        }

        setSession(data.session);
        setStatus(data.session ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        if (mounted) setStatus('error');
      });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isBackendConfigured: backendConfig.isConfigured,
    session,
    signInWithPassword: async (email, password) => {
      if (!supabaseClient) {
        return { message: 'Backend is not configured.', ok: false };
      }

      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      return error ? { message: error.message, ok: false } : { ok: true };
    },
    signOut: async () => {
      if (!supabaseClient) {
        setSession(null);
        setStatus('preview');
        return { ok: true };
      }

      const { error } = await supabaseClient.auth.signOut();
      return error ? { message: error.message, ok: false } : { ok: true };
    },
    signUpWithPassword: async ({ displayName, email, password }) => {
      if (!supabaseClient) {
        return { message: 'Backend is not configured.', ok: false };
      }

      const { error } = await supabaseClient.auth.signUp({
        email: email.trim(),
        options: {
          data: {
            display_name: displayName.trim(),
          },
        },
        password,
      });

      return error ? { message: error.message, ok: false } : { ok: true };
    },
    status,
    user: session?.user ?? null,
  }), [session, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return value;
}
