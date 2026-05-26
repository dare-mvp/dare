export async function postAdminAction<TPayload>(
  path: string,
  scope: string,
  payload: TPayload,
  accessToken: string,
): Promise<void> {
  const body = {
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
