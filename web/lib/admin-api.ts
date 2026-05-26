type ActionEnvelope<TPayload> = {
  requestId: string;
  idempotencyKey: string;
  payload: TPayload;
};

async function postAdminAction<TPayload>(
  path: string,
  scope: string,
  payload: TPayload,
  accessToken: string,
): Promise<void> {
  const body: ActionEnvelope<TPayload> = {
    requestId: crypto.randomUUID(),
    idempotencyKey: `${scope}:${crypto.randomUUID()}`,
    payload,
  };

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      typeof errorBody?.error?.message === 'string'
        ? errorBody.error.message
        : `Admin action failed with ${response.status}`,
    );
  }
}

export function approveWithdrawal(id: string, reason: string, accessToken: string): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/withdrawals/${id}/approve`,
    `approve-withdrawal:${id}`,
    { reason },
    accessToken,
  );
}

export function rejectWithdrawal(id: string, reason: string, accessToken: string): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/withdrawals/${id}/reject`,
    `reject-withdrawal:${id}`,
    { reason },
    accessToken,
  );
}

export function decideKyc(
  verificationId: string,
  payload: {
    verdict: 'approved' | 'rejected';
    kycTierGranted?: 'kyc1' | 'kyc2' | 'kyc3';
    adminNote?: string;
  },
  accessToken: string,
): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/kyc/${verificationId}/decide`,
    `decide-kyc:${verificationId}`,
    payload,
    accessToken,
  );
}

export function freezeUser(userId: string, reason: string, accessToken: string): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/users/${userId}/freeze`,
    `freeze-user:${userId}`,
    { reason },
    accessToken,
  );
}

export function assignJuryCase(
  caseId: string,
  accessToken: string,
  assignmentCount?: 3 | 5 | 7,
): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/jury-cases/${caseId}/assign`,
    `assign-jury-case:${caseId}`,
    assignmentCount != null ? { assignmentCount } : {},
    accessToken,
  );
}

export function resolveJuryCase(
  caseId: string,
  payload: {
    verdict: 'A' | 'B' | 'void' | 'uphold' | 'overturn';
    adminNote: string;
  },
  accessToken: string,
): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/jury-cases/${caseId}/resolve`,
    `resolve-jury-case:${caseId}`,
    payload,
    accessToken,
  );
}
