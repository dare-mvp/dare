'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  approveWithdrawal,
  rejectWithdrawal,
  decideKyc,
  freezeUser,
  assignJuryCase,
  resolveJuryCase,
} from '@/lib/admin-api';

async function getAccessToken() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');
  return session.access_token;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/auth/login');
}

export async function approveWithdrawalAction(id: string, reason: string) {
  if (reason.trim().length < 5) throw new Error('Note too short');
  await requireAdmin();
  const token = await getAccessToken();
  await approveWithdrawal(id, reason.trim(), token);
  revalidatePath('/admin/withdrawals');
}

export async function rejectWithdrawalAction(id: string, reason: string) {
  if (reason.trim().length < 5) throw new Error('Note too short');
  await requireAdmin();
  const token = await getAccessToken();
  await rejectWithdrawal(id, reason.trim(), token);
  revalidatePath('/admin/withdrawals');
}

export async function decideKycAction(
  verificationId: string,
  verdict: 'approved' | 'rejected',
  kycTierGranted: 'kyc1' | 'kyc2' | 'kyc3' | null,
  adminNote: string | null,
) {
  await requireAdmin();
  const token = await getAccessToken();
  await decideKyc(
    verificationId,
    {
      verdict,
      ...(kycTierGranted ? { kycTierGranted } : {}),
      ...(adminNote ? { adminNote: adminNote.trim() } : {}),
    },
    token,
  );
  revalidatePath('/admin/kyc');
}

export async function freezeUserAction(userId: string, reason: string) {
  if (reason.trim().length < 5) throw new Error('Note too short');
  await requireAdmin();
  const token = await getAccessToken();
  await freezeUser(userId, reason.trim(), token);
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/admin/users');
}

export async function assignJuryCaseAction(caseId: string) {
  await requireAdmin();
  const token = await getAccessToken();
  await assignJuryCase(caseId, token);
  revalidatePath('/admin/jury');
}

export async function resolveJuryCaseAction(
  caseId: string,
  verdict: 'A' | 'B' | 'void' | 'uphold' | 'overturn',
  adminNote: string,
) {
  if (adminNote.trim().length < 10) throw new Error('Rationale too short');
  await requireAdmin();
  const token = await getAccessToken();
  await resolveJuryCase(caseId, { verdict, adminNote: adminNote.trim() }, token);
  revalidatePath('/admin/jury');
}
