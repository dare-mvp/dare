import { Session, User } from '@supabase/supabase-js';

import { PhoneAuthMode } from './phoneOtp';

export type AuthStatus = 'authenticated' | 'error' | 'loading' | 'preview' | 'unauthenticated';

export type AuthOperationResult =
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

export type AuthContextValue = {
  completeEmailConfirmation: (url: string) => Promise<AuthOperationResult>;
  isBackendConfigured: boolean;
  requestPhoneLinkOtp: (phone: string) => Promise<AuthOperationResult>;
  requestPhoneOtp: (phone: string, mode: PhoneAuthMode) => Promise<AuthOperationResult>;
  requestPasswordReset: (email: string) => Promise<AuthOperationResult>;
  resendPhoneLinkOtp: (phone: string) => Promise<AuthOperationResult>;
  resendPhoneOtp: (phone: string) => Promise<AuthOperationResult>;
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
  verifyPhoneLinkOtp: (phone: string, token: string) => Promise<AuthOperationResult>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<AuthOperationResult>;
  user: User | null;
};
