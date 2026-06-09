import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { backendConfig } from '../../lib/config/env';
import { getAuthUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';

type AuthStatus = 'authenticated' | 'error' | 'loading' | 'preview' | 'unauthenticated';

type AuthOperationResult =
  | {
      message?: string;
      needsEmailConfirmation?: boolean;
      ok: true;
      passwordRecovery?: boolean;
    }
  | {
      message: string;
      ok: false;
    };

type AuthContextValue = {
  completeEmailConfirmation: (url: string) => Promise<AuthOperationResult>;
  isBackendConfigured: boolean;
  requestPasswordReset: (email: string) => Promise<AuthOperationResult>;
  session: Session | null;
  signInWithPassword: (email: string, password: string) => Promise<AuthOperationResult>;
  signOut: () => Promise<AuthOperationResult>;
  signUpWithPassword: (input: {
    displayName: string;
    email: string;
    password: string;
  }) => Promise<AuthOperationResult>;
  status: AuthStatus;
  updatePassword: (password: string) => Promise<AuthOperationResult>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_REQUEST_TIMEOUT_MS = 20000;
const AUTH_CALLBACK_PATH = '/auth/callback';
const PASSWORD_RECOVERY_FLOW = 'password-recovery';

function authRequestTimeout() {
  return new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject({ status: 408 });
    }, AUTH_REQUEST_TIMEOUT_MS);
  });
}

async function withAuthTimeout<T>(request: Promise<T>) {
  return Promise.race([request, authRequestTimeout()]);
}

function getAuthErrorMessage(error: unknown) {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : undefined;
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;
  return getAuthUserMessage(Number.isFinite(status) ? status : undefined, code);
}

function getPasswordResetErrorMessage(error: unknown) {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : undefined;
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;

  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) {
    return 'Too many reset attempts. Wait a few minutes and try again.';
  }

  if (status && status >= 500) {
    return 'Password reset email could not be sent right now. Try again later.';
  }

  return getAuthUserMessage(Number.isFinite(status) ? status : undefined, code);
}

function getAuthCallbackUrl() {
  return Linking.createURL(AUTH_CALLBACK_PATH);
}

function getPasswordRecoveryCallbackUrl() {
  return Linking.createURL(AUTH_CALLBACK_PATH, {
    queryParams: {
      flow: PASSWORD_RECOVERY_FLOW,
    },
  });
}

function getAuthUrlParams(url: string) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;

  if (hash) {
    new URLSearchParams(hash).forEach((value, key) => {
      params.set(key, value);
    });
  }

  return params;
}

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
    completeEmailConfirmation: async (url) => {
      if (!supabaseClient) {
        return { message: 'Account confirmation is not available right now.', ok: false };
      }

      try {
        const params = getAuthUrlParams(url);
        const isPasswordRecovery = params.get('flow') === PASSWORD_RECOVERY_FLOW || params.get('type') === 'recovery';
        const hasError = params.has('error') || params.has('error_code');
        if (hasError) {
          return { message: getAuthUserMessage(), ok: false };
        }

        const code = params.get('code');
        if (code) {
          const { data, error } = await withAuthTimeout(supabaseClient.auth.exchangeCodeForSession(code));
          if (error) return { message: getAuthErrorMessage(error), ok: false };

          setSession(data.session);
          setStatus(data.session ? 'authenticated' : 'unauthenticated');
          return data.session ? { ok: true, passwordRecovery: isPasswordRecovery } : { message: getAuthUserMessage(), ok: false };
        }

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { data, error } = await withAuthTimeout(supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }));

          if (error) return { message: getAuthErrorMessage(error), ok: false };

          setSession(data.session);
          setStatus(data.session ? 'authenticated' : 'unauthenticated');
          return data.session ? { ok: true, passwordRecovery: isPasswordRecovery } : { message: getAuthUserMessage(), ok: false };
        }

        return { message: 'This confirmation link is invalid or expired.', ok: false };
      } catch {
        return { message: getAuthUserMessage(), ok: false };
      }
    },
    isBackendConfigured: backendConfig.isConfigured,
    requestPasswordReset: async (email) => {
      if (!supabaseClient) {
        return { message: 'Password reset is not available right now.', ok: false };
      }

      try {
        const { error } = await withAuthTimeout(supabaseClient.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: getPasswordRecoveryCallbackUrl(),
        }));

        if (error) return { message: getPasswordResetErrorMessage(error), ok: false };
        return {
          message: 'If that email has a DARE account, a reset link has been sent.',
          ok: true,
        };
      } catch (error) {
        return { message: getPasswordResetErrorMessage(error), ok: false };
      }
    },
    session,
    signInWithPassword: async (email, password) => {
      if (!supabaseClient) {
        return { message: 'App sign-in is not available right now.', ok: false };
      }

      try {
        const { error } = await withAuthTimeout(supabaseClient.auth.signInWithPassword({
          email: email.trim(),
          password,
        }));

        return error ? { message: getAuthErrorMessage(error), ok: false } : { ok: true };
      } catch (error) {
        return { message: getAuthErrorMessage(error), ok: false };
      }
    },
    signOut: async () => {
      if (!supabaseClient) {
        setSession(null);
        setStatus('preview');
        return { ok: true };
      }

      try {
        const { error } = await withAuthTimeout(supabaseClient.auth.signOut({ scope: 'global' }));
        if (error) {
          const { error: localError } = await withAuthTimeout(supabaseClient.auth.signOut({ scope: 'local' }));
          if (localError) return { message: getAuthErrorMessage(localError), ok: false };
        }

        setSession(null);
        setStatus('unauthenticated');
        return { ok: true };
      } catch (error) {
        try {
          const { error: localError } = await withAuthTimeout(supabaseClient.auth.signOut({ scope: 'local' }));
          if (localError) return { message: getAuthErrorMessage(localError), ok: false };
          setSession(null);
          setStatus('unauthenticated');
          return { ok: true };
        } catch {
          return { message: getAuthErrorMessage(error), ok: false };
        }
      }
    },
    signUpWithPassword: async ({ displayName, email, password }) => {
      if (!supabaseClient) {
        return { message: 'Account creation is not available right now.', ok: false };
      }

      try {
        const { data, error } = await withAuthTimeout(supabaseClient.auth.signUp({
          email: email.trim(),
          options: {
            data: {
              display_name: displayName.trim(),
            },
            emailRedirectTo: getAuthCallbackUrl(),
          },
          password,
        }));

        if (error) return { message: getAuthErrorMessage(error), ok: false };

        if (data.session) {
          setSession(data.session);
          setStatus('authenticated');
          return { ok: true };
        }

        setSession(null);
        setStatus('unauthenticated');
        return {
          message: 'Check your email to confirm this account, then sign in to finish setup.',
          needsEmailConfirmation: true,
          ok: true,
        };
      } catch (error) {
        return { message: getAuthErrorMessage(error), ok: false };
      }
    },
    status,
    updatePassword: async (password) => {
      if (!supabaseClient) {
        return { message: 'Password update is not available right now.', ok: false };
      }

      try {
        const { error } = await withAuthTimeout(supabaseClient.auth.updateUser({ password }));
        return error ? { message: getAuthErrorMessage(error), ok: false } : { ok: true };
      } catch (error) {
        return { message: getAuthErrorMessage(error), ok: false };
      }
    },
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
