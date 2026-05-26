'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';
import { postAdminAction } from '@/lib/admin-api';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/auth/login');
}

export async function approveWithdrawal(withdrawalId: string, note: string) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  await postAdminAction(
    '/functions/v1/actions',
    `approve-withdrawal:${withdrawalId}`,
    { withdrawalId, adminNote: note },
    session.access_token,
  );
  revalidatePath('/admin/withdrawals');
}

export async function rejectWithdrawal(withdrawalId: string, note: string) {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  await postAdminAction(
    '/functions/v1/actions',
    `reject-withdrawal:${withdrawalId}`,
    { withdrawalId, adminNote: note },
    session.access_token,
  );
  revalidatePath('/admin/withdrawals');
}

export async function decideKyc(
  verificationId: string,
  decision: 'approved' | 'rejected',
  kycTierGranted: string | null,
  reason: string | null,
) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  await postAdminAction(
    '/functions/v1/actions',
    `decide-kyc:${verificationId}`,
    { verificationId, decision, kycTierGranted, reason },
    session.access_token,
  );
  revalidatePath('/admin/kyc');
}

export async function freezeUser(userId: string, note: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  await postAdminAction(
    '/functions/v1/actions',
    `freeze-user:${userId}`,
    { userId, adminNote: note },
    session.access_token,
  );
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/admin/users');
}

export async function assignJuryCase(caseId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  await postAdminAction(
    '/functions/v1/actions',
    `assign-jury-case:${caseId}`,
    { caseId },
    session.access_token,
  );
  revalidatePath('/admin/jury');
}

export async function resolveJuryCase(
  caseId: string,
  verdict: string,
  rationale: string,
) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  await postAdminAction(
    '/functions/v1/actions',
    `resolve-jury-case:${caseId}`,
    { caseId, verdict, rationale },
    session.access_token,
  );
  revalidatePath('/admin/jury');
}
