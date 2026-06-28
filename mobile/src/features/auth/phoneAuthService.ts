import { Session, SupabaseClient } from '@supabase/supabase-js';

import {
  getPhoneOtpErrorMessage,
  normalizeOtpCode,
  normalizePhoneNumber,
  PhoneAuthMode,
  validateOtpCode,
  validatePhoneNumber,
} from './phoneOtp';
import { AuthOperationResult } from './types';

type PhoneAuthDependencies = {
  applySession: (session: Session | null) => void;
  client: SupabaseClient | null;
  withTimeout: <T>(request: Promise<T>) => Promise<T>;
};

export function createPhoneAuthOperations({ applySession, client, withTimeout }: PhoneAuthDependencies) {
  return {
    requestPhoneLinkOtp: async (phone: string): Promise<AuthOperationResult> => {
      if (!client) return { message: 'Phone verification is not available right now.', ok: false };
      const validationError = validatePhoneNumber(phone);
      if (validationError) return { message: validationError, ok: false };

      try {
        const { error } = await withTimeout(client.auth.updateUser({
          phone: normalizePhoneNumber(phone),
        }));

        return error
          ? { message: getPhoneOtpErrorMessage(error), ok: false }
          : { message: 'Enter the verification code sent to your phone.', ok: true };
      } catch (error) {
        return { message: getPhoneOtpErrorMessage(error), ok: false };
      }
    },
    requestPhoneOtp: async (phone: string, mode: PhoneAuthMode): Promise<AuthOperationResult> => {
      if (!client) return { message: 'Phone sign-in is not available right now.', ok: false };
      const validationError = validatePhoneNumber(phone);
      if (validationError) return { message: validationError, ok: false };

      try {
        const { error } = await withTimeout(client.auth.signInWithOtp({
          options: {
            shouldCreateUser: mode === 'sign-up',
          },
          phone: normalizePhoneNumber(phone),
        }));

        return error
          ? { message: getPhoneOtpErrorMessage(error), ok: false }
          : { message: 'Enter the verification code sent to your phone.', ok: true };
      } catch (error) {
        return { message: getPhoneOtpErrorMessage(error), ok: false };
      }
    },
    resendPhoneLinkOtp: async (phone: string): Promise<AuthOperationResult> => {
      if (!client) return { message: 'Phone verification is not available right now.', ok: false };
      const validationError = validatePhoneNumber(phone);
      if (validationError) return { message: 'Request a new phone verification code before resending.', ok: false };

      try {
        const { error } = await withTimeout(client.auth.resend({
          phone: normalizePhoneNumber(phone),
          type: 'phone_change',
        }));

        return error
          ? { message: getPhoneOtpErrorMessage(error), ok: false }
          : { message: 'A new verification code was sent.', ok: true };
      } catch (error) {
        return { message: getPhoneOtpErrorMessage(error), ok: false };
      }
    },
    resendPhoneOtp: async (phone: string): Promise<AuthOperationResult> => {
      if (!client) return { message: 'Phone sign-in is not available right now.', ok: false };
      const validationError = validatePhoneNumber(phone);
      if (validationError) return { message: 'Request a new phone sign-in code before resending.', ok: false };

      try {
        const { error } = await withTimeout(client.auth.resend({
          phone: normalizePhoneNumber(phone),
          type: 'sms',
        }));

        return error
          ? { message: getPhoneOtpErrorMessage(error), ok: false }
          : { message: 'A new verification code was sent.', ok: true };
      } catch (error) {
        return { message: getPhoneOtpErrorMessage(error), ok: false };
      }
    },
    verifyPhoneLinkOtp: async (phone: string, token: string): Promise<AuthOperationResult> => {
      if (!client) return { message: 'Phone verification is not available right now.', ok: false };
      const phoneError = validatePhoneNumber(phone);
      if (phoneError) return { message: 'Request a new phone verification code before confirming.', ok: false };
      const tokenError = validateOtpCode(token);
      if (tokenError) return { message: tokenError, ok: false };

      try {
        const { data, error } = await withTimeout(client.auth.verifyOtp({
          phone: normalizePhoneNumber(phone),
          token: normalizeOtpCode(token),
          type: 'phone_change',
        }));

        if (error) return { message: getPhoneOtpErrorMessage(error), ok: false };
        if (data.session) applySession(data.session);
        return { ok: true };
      } catch (error) {
        return { message: getPhoneOtpErrorMessage(error), ok: false };
      }
    },
    verifyPhoneOtp: async (phone: string, token: string): Promise<AuthOperationResult> => {
      if (!client) return { message: 'Phone sign-in is not available right now.', ok: false };
      const phoneError = validatePhoneNumber(phone);
      if (phoneError) return { message: 'Request a new phone sign-in code before confirming.', ok: false };
      const tokenError = validateOtpCode(token);
      if (tokenError) return { message: tokenError, ok: false };

      try {
        const { data, error } = await withTimeout(client.auth.verifyOtp({
          phone: normalizePhoneNumber(phone),
          token: normalizeOtpCode(token),
          type: 'sms',
        }));

        if (error) return { message: getPhoneOtpErrorMessage(error), ok: false };

        applySession(data.session);
        return data.session ? { ok: true } : { message: getPhoneOtpErrorMessage(), ok: false };
      } catch (error) {
        return { message: getPhoneOtpErrorMessage(error), ok: false };
      }
    },
  };
}
