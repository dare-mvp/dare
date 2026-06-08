import { assert, assertEquals, assertRejects } from "@std/assert";

import { ActionError } from "../actions/_shared/errors.ts";
import { parseActionEnvelope } from "../actions/_shared/envelope.ts";
import {
  hashBody,
  hashIdempotencyKey,
} from "../actions/_shared/idempotency.ts";
import { errorResponse, successResponse } from "../actions/_shared/response.ts";
import {
  assertInteger,
  assertOneOf,
  assertRecord,
  assertString,
} from "../actions/_shared/validation.ts";
import { createHandler, handler } from "../actions/handler.ts";
import { createPaystackWebhookHandler } from "../paystack-webhook/handler.ts";
import { createWithdrawalProcessorHandler } from "../withdrawal-processor/handler.ts";
import {
  type QueryResponse,
  type SupabaseActionClient,
  type SupabaseFilterBuilder,
} from "../actions/_shared/supabase.ts";

const requestId = "123e4567-e89b-12d3-a456-426614174000";

Deno.test("parseActionEnvelope validates the standard envelope", async () => {
  const request = jsonRequest({
    requestId,
    idempotencyKey: "create-dare:abc123",
    payload: {
      amount: 5000,
      currency: "NGN",
    },
  });

  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload(value) {
      const payload = assertRecord(value, "payload");
      return {
        amount: assertInteger(payload.amount, "payload.amount", { min: 1 }),
        currency: assertString(payload.currency, "payload.currency", {
          min: 3,
          max: 3,
        }),
      };
    },
  });

  assertEquals(envelope.requestId, requestId);
  assertEquals(envelope.idempotencyKey, "create-dare:abc123");
  assertEquals(envelope.payload, { amount: 5000, currency: "NGN" });
});

Deno.test("parseActionEnvelope rejects missing idempotency keys when required", async () => {
  const request = jsonRequest({
    requestId,
    payload: {},
  });

  const error = await assertRejects(
    () => parseActionEnvelope(request, { requireIdempotencyKey: true }),
    ActionError,
  );

  assertEquals(error.code, "VALIDATION_FAILED");
});

Deno.test("validation helpers reject unsafe values", () => {
  assertEquals(
    assertOneOf("knowledge", ["knowledge", "sports"] as const),
    "knowledge",
  );

  try {
    assertString("<script>", "title", { min: 20 });
    throw new Error("Expected validation to fail");
  } catch (error) {
    assert(error instanceof ActionError);
    assertEquals(error.code, "VALIDATION_FAILED");
  }
});

Deno.test("response helpers return stable success and error envelopes", async () => {
  const success = successResponse({ ok: "yes" }, requestId);
  assertEquals(success.status, 200);
  assertEquals(await success.json(), {
    ok: true,
    data: { ok: "yes" },
    requestId,
  });

  const failure = errorResponse(
    new ActionError("INSUFFICIENT_FUNDS"),
    requestId,
  );
  assertEquals(failure.status, 409);
  assertEquals(await failure.json(), {
    ok: false,
    error: {
      code: "INSUFFICIENT_FUNDS",
      message: "Available balance is too low for this action.",
      retryable: false,
    },
    requestId,
  });
});

Deno.test("hashIdempotencyKey returns a deterministic SHA-256 hex digest", async () => {
  const first = await hashIdempotencyKey("create-dare:abc123");
  const second = await hashIdempotencyKey("create-dare:abc123");

  assertEquals(first, second);
  assertEquals(first.length, 64);
});

Deno.test("hashBody returns different digests for different payloads", async () => {
  const a = await hashBody({ amount: 1000, currency: "NGN" });
  const b = await hashBody({ amount: 2000, currency: "NGN" });
  const aAgain = await hashBody({ amount: 1000, currency: "NGN" });

  assertEquals(a.length, 64);
  assertEquals(a, aAgain);
  assert(a !== b);
});

Deno.test("actions handler exposes health and safe unknown-route errors", async () => {
  const health = await handler(
    new Request("http://localhost/functions/v1/actions/health", {
      method: "GET",
      headers: { "x-request-id": requestId },
    }),
  );
  assertEquals(health.status, 200);

  const missing = await handler(
    new Request("http://localhost/functions/v1/actions/missing", {
      method: "GET",
      headers: { "x-request-id": requestId },
    }),
  );
  assertEquals(missing.status, 404);
  assertEquals(await missing.json(), {
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found.",
      retryable: false,
    },
    requestId,
  });
});

Deno.test("GET /me returns profile, wallet, responsible gaming, and capabilities", async () => {
  const client = fakeClient();
  const testHandler = createHandler({ createClient: () => client });

  const response = await testHandler(
    new Request("http://localhost/functions/v1/actions/me", {
      method: "GET",
      headers: { "x-request-id": requestId },
    }),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.user.username, "ada");
  assertEquals(body.data.user.displayName, "Ada");
  assertEquals(body.data.wallet.available, 250000);
  assertEquals(body.data.responsibleGaming.maxStakePerDare, 100000);
  assertEquals(body.data.capabilities.canCreateDare, true);
});

Deno.test("PATCH /profiles/me rejects sensitive profile fields", async () => {
  const client = fakeClient();
  const testHandler = createHandler({ createClient: () => client });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        payload: {
          trustScore: 900,
        },
      },
      "http://localhost/functions/v1/actions/profiles/me",
      "PATCH",
    ),
  );

  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.ok, false);
  assertEquals(body.error.code, "VALIDATION_FAILED");
});

Deno.test("PATCH /profiles/me updates only safe profile fields", async () => {
  const client = fakeClient();
  const testHandler = createHandler({ createClient: () => client });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        payload: {
          displayName: "Ada Lovelace",
          bio: "Answer Key DARE player",
          city: "Lagos",
        },
      },
      "http://localhost/functions/v1/actions/profiles/me",
      "PATCH",
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.user.displayName, "Ada Lovelace");
  assertEquals(body.data.user.bio, "Answer Key DARE player");
  assertEquals(body.data.user.city, "Lagos");
});

Deno.test("PATCH /profiles/me/jury rejects ineligible opt-in", async () => {
  const state = createFakeState();
  state.profile.jury_opt_in = false;
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        payload: {
          juryOptIn: true,
          juryCategories: ["knowledge"],
        },
      },
      "http://localhost/functions/v1/actions/profiles/me/jury",
      "PATCH",
    ),
  );

  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.ok, false);
  assertEquals(body.error.code, "FORBIDDEN");
});

Deno.test("PATCH /profiles/me/jury updates eligible jury preferences", async () => {
  const state = createFakeState();
  state.profile.trust_score = 650;
  state.profile.completed_dares = 12;
  state.profile.jury_opt_in = false;
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        payload: {
          juryOptIn: true,
          juryCategories: ["knowledge", "sports"],
        },
      },
      "http://localhost/functions/v1/actions/profiles/me/jury",
      "PATCH",
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.juryOptIn, true);
  assertEquals(body.data.juryCategories, ["knowledge", "sports"]);
  assertEquals(body.data.eligible, true);
  assertEquals(state.profile.jury_opt_in, true);
  assertEquals(state.auditLogs[0].action, "profile.jury_updated");
});

Deno.test("PATCH /notifications/{id}/read marks own notification read", async () => {
  const state = createFakeState();
  const notificationId = "a23e4567-e89b-12d3-a456-426614174000";
  state.notifications.push({
    id: notificationId,
    user_id: state.user.id,
    type: "system",
    title: "Welcome",
    body: "Hello",
    is_read: false,
    read_at: null,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        payload: {},
      },
      `http://localhost/functions/v1/actions/notifications/${notificationId}/read`,
      "PATCH",
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.notificationId, notificationId);
  assertEquals(body.data.isRead, true);
  assertEquals(state.notifications[0].is_read, true);
});

Deno.test("POST /notifications/read-all marks unread notifications", async () => {
  const state = createFakeState();
  state.notifications.push(
    {
      id: "a23e4567-e89b-12d3-a456-426614174000",
      user_id: state.user.id,
      type: "system",
      title: "One",
      body: "Unread",
      is_read: false,
      read_at: null,
    },
    {
      id: "b23e4567-e89b-12d3-a456-426614174000",
      user_id: state.user.id,
      type: "system",
      title: "Two",
      body: "Already read",
      is_read: true,
      read_at: "2026-05-21T00:00:00.000Z",
    },
    {
      id: "c23e4567-e89b-12d3-a456-426614174000",
      user_id: "723e4567-e89b-12d3-a456-426614174000",
      type: "system",
      title: "Other",
      body: "Other user",
      is_read: false,
      read_at: null,
    },
  );
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        payload: {},
      },
      "http://localhost/functions/v1/actions/notifications/read-all",
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.updatedCount, 1);
  assertEquals(state.notifications[0].is_read, true);
  assertEquals(state.notifications[2].is_read, false);
});

Deno.test("PATCH /responsible-gaming/settings applies lower limits immediately", async () => {
  const state = createFakeState();
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "rg-settings:abc123456",
        payload: {
          dailyDepositLimitNgn: 4000,
          maxStakeNgn: 800,
        },
      },
      "http://localhost/functions/v1/actions/responsible-gaming/settings",
      "PATCH",
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.dailyDepositLimitNgn, 4000);
  assertEquals(body.data.maxStakeNgn, 800);
  assertEquals(body.data.pending.dailyDepositLimitNgn, null);
  assertEquals(state.responsibleGaming.daily_deposit_limit_kobo, 400000);
  assertEquals(state.responsibleGaming.max_stake_per_dare_kobo, 80000);
  assertEquals(
    state.auditLogs[0].action,
    "responsible_gaming.settings_updated",
  );
});

Deno.test("PATCH /responsible-gaming/settings stages higher limits", async () => {
  const state = createFakeState();
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "rg-increase:abc123456",
        payload: {
          dailyDepositLimitNgn: 6000,
        },
      },
      "http://localhost/functions/v1/actions/responsible-gaming/settings",
      "PATCH",
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.dailyDepositLimitNgn, 5000);
  assertEquals(body.data.pending.dailyDepositLimitNgn, 6000);
  assertEquals(
    body.data.pending.effectiveAt,
    "2026-05-22T00:05:00.000Z",
  );
  assertEquals(state.responsibleGaming.daily_deposit_limit_kobo, 500000);
  assertEquals(
    state.responsibleGaming.pending_daily_deposit_limit_kobo,
    600000,
  );
});

Deno.test("POST /responsible-gaming/self-exclude restricts the account", async () => {
  const state = createFakeState();
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "rg-self:abc123456",
        payload: {
          durationDays: 30,
          reason: "Need a break",
        },
      },
      "http://localhost/functions/v1/actions/responsible-gaming/self-exclude",
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.selfExcluded, true);
  assertEquals(body.data.accountStatus, "limited");
  assertEquals(body.data.cancelledDares, 0);
  assertEquals(state.profile.account_status, "limited");
  assertEquals(state.profile.jury_opt_in, false);
  assertEquals(state.responsibleGaming.self_excluded, true);
  assertEquals(
    state.auditLogs[0].action,
    "responsible_gaming.self_excluded",
  );
});

Deno.test("POST /responsible-gaming/self-exclude cancels open and forfeits active DAREs", async () => {
  const state = createFakeState();
  const activeDareId = "623e4567-e89b-42d3-a456-426614174001";
  const openDareId = "623e4567-e89b-42d3-a456-426614174002";
  const challengerId = "323e4567-e89b-12d3-a456-426614174000";
  state.dares.push(
    {
      id: activeDareId,
      issuer_id: state.profile.id,
      challenger_id: challengerId,
      status: "active",
      currency: "NGN",
    },
    {
      id: openDareId,
      issuer_id: state.profile.id,
      challenger_id: null,
      status: "open",
      currency: "NGN",
    },
  );
  state.courtSessions.push({
    id: "723e4567-e89b-42d3-a456-426614174001",
    dare_id: activeDareId,
    phase: "active",
  });
  state.escrowHolds.push({
    id: "823e4567-e89b-42d3-a456-426614174002",
    dare_id: openDareId,
    user_id: state.profile.id,
    wallet_account_id: state.wallet.wallet_account_id,
    amount: 50000,
    currency: "NGN",
    status: "held",
  });

  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "rg-self-cleanup:abc123456",
        payload: {
          durationDays: 30,
        },
      },
      "http://localhost/functions/v1/actions/responsible-gaming/self-exclude",
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.cancelledDares, 1);
  assertEquals(body.data.forfeitedDares, 1);
  assertEquals(body.data.refundedAmount, 50000);
  assertEquals(state.dares[0].status, "forfeited");
  assertEquals(state.dares[0].winner_id, challengerId);
  assertEquals(state.dares[1].status, "cancelled");
  assertEquals(state.escrowHolds[0].status, "refunded");
});

Deno.test("POST /wallet/deposits/init initializes Paystack once", async () => {
  const state = createFakeState();
  const client = fakeClient(state);
  const serviceClient = fakeClient(state);
  let providerCalls = 0;
  const testHandler = createHandler({
    createClient: () => client,
    createServiceClient: () => serviceClient,
    paystackInitializer: (params) => {
      providerCalls += 1;
      return Promise.resolve({
        mode: "test",
        reference: params.reference,
        authorizationUrl: `https://checkout.paystack.com/${params.reference}`,
        accessCode: `access_${params.reference}`,
      });
    },
  });

  const requestBody = {
    requestId,
    idempotencyKey: "deposit:abc123456",
    payload: {
      amount: 100000,
      currency: "NGN",
      provider: "paystack",
    },
  };

  const first = await testHandler(
    jsonRequest(
      requestBody,
      "http://localhost/functions/v1/actions/wallet/deposits/init",
    ),
  );
  const replay = await testHandler(
    jsonRequest(
      requestBody,
      "http://localhost/functions/v1/actions/wallet/deposits/init",
    ),
  );

  assertEquals(first.status, 200);
  assertEquals(replay.status, 200);
  const body = await first.json();
  const replayBody = await replay.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.mode, "test");
  assertEquals(body.data.provider, "paystack");
  assertEquals(body.data.amount, 100000);
  assertEquals(body.data.reference, replayBody.data.reference);
  assertEquals(providerCalls, 1);
  assertEquals(state.paymentTransactions.length, 1);
  assertEquals(state.auditLogs.length, 1);
  assertEquals(state.idempotencyRecords.length, 1);
});

Deno.test("paystack webhook verifies signature and avoids double credit", async () => {
  const state = createFakeState();
  state.paymentTransactions.push({
    id: "323e4567-e89b-12d3-a456-426614174000",
    user_id: state.user.id,
    provider: "paystack",
    provider_reference: "dare_dep_reference",
    type: "deposit",
    amount: 100000,
    currency: "NGN",
    status: "initialized",
    raw_provider_payload: {},
  });

  const secret = "sk_test_unit_secret";
  const rawBody = JSON.stringify({
    event: "charge.success",
    data: {
      reference: "dare_dep_reference",
      amount: 100000,
      currency: "NGN",
      status: "success",
    },
  });
  const signature = await hmacSha512Hex(rawBody, secret);
  const testHandler = createPaystackWebhookHandler({
    createServiceClient: () => fakeClient(state),
    getSecret: () => secret,
  });

  const first = await testHandler(
    webhookRequest(rawBody, signature),
  );
  const replay = await testHandler(
    webhookRequest(rawBody, signature),
  );

  assertEquals(first.status, 200);
  assertEquals(replay.status, 200);
  assertEquals(state.paymentTransactions[0].status, "verified_success");
  assertEquals(state.ledgerEntries.length, 1);
  assertEquals(state.auditLogs.length, 1);
});

Deno.test("paystack webhook completes withdrawal transfer payouts once", async () => {
  const state = createFakeState();
  state.withdrawalRequests.push({
    id: "423e4567-e89b-12d3-a456-426614174000",
    user_id: state.user.id,
    wallet_account_id: state.wallet.wallet_account_id,
    amount: 100000,
    currency: "NGN",
    provider: "paystack",
    provider_transfer_reference: "dare_wd_reference",
    status: "processing",
    ledger_entry_id: "523e4567-e89b-12d3-a456-426614174000",
  });

  const secret = "sk_test_unit_secret";
  const rawBody = JSON.stringify({
    event: "transfer.success",
    data: {
      reference: "dare_wd_reference",
      amount: 100000,
      currency: "NGN",
      status: "success",
    },
  });
  const signature = await hmacSha512Hex(rawBody, secret);
  const testHandler = createPaystackWebhookHandler({
    createServiceClient: () => fakeClient(state),
    getSecret: () => secret,
  });

  const first = await testHandler(webhookRequest(rawBody, signature));
  const replay = await testHandler(webhookRequest(rawBody, signature));

  assertEquals(first.status, 200);
  assertEquals(replay.status, 200);
  assertEquals(state.withdrawalRequests[0].status, "completed");
  assertEquals(
    state.ledgerEntries.filter((entry) => entry.type === "withdrawal_completed")
      .length,
    1,
  );
  assertEquals(state.auditLogs.length, 1);
});

Deno.test("POST /wallet/withdrawals queues a request without automatic payout", async () => {
  const state = createFakeState();
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const requestBody = {
    requestId,
    idempotencyKey: "withdrawal:abc123456",
    payload: {
      amount: 100000,
      currency: "NGN",
      destination: {
        type: "bank_account",
        bankCode: "058",
        accountNumberToken: "acct_token_123456",
        accountName: "Ada Lovelace",
      },
    },
  };

  const first = await testHandler(
    jsonRequest(
      requestBody,
      "http://localhost/functions/v1/actions/wallet/withdrawals",
    ),
  );
  const replay = await testHandler(
    jsonRequest(
      requestBody,
      "http://localhost/functions/v1/actions/wallet/withdrawals",
    ),
  );

  assertEquals(first.status, 200);
  assertEquals(replay.status, 200);
  const body = await first.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "pending");
  assertEquals(body.data.amount, 100000);
  assertEquals(state.withdrawalRequests.length, 1);
  assertEquals(state.ledgerEntries.length, 1);
  assertEquals(state.ledgerEntries[0].type, "withdrawal_pending");
  assertEquals(state.ledgerEntries[0].status, "pending");
  assertEquals(state.notifications.length, 1);
  assertEquals(state.auditLogs.length, 1);
  assertEquals(state.idempotencyRecords.length, 1);
});

Deno.test("POST /admin/withdrawals/{id}/approve gates provider processing", async () => {
  const state = createFakeState();
  state.profile.is_admin = true;
  const withdrawalId = "523e4567-e89b-12d3-a456-426614174000";
  state.withdrawalRequests.push({
    id: withdrawalId,
    user_id: state.user.id,
    wallet_account_id: state.wallet.wallet_account_id,
    amount: 100000,
    currency: "NGN",
    provider: null,
    provider_transfer_reference: null,
    status: "pending",
    ledger_entry_id: "423e4567-e89b-12d3-a456-426614174000",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });
  const requestBody = {
    requestId,
    idempotencyKey: "admin-wd-approve:abc123",
    payload: { reason: "Manual risk review passed." },
  };

  const first = await testHandler(
    jsonRequest(
      requestBody,
      `http://localhost/functions/v1/actions/admin/withdrawals/${withdrawalId}/approve`,
    ),
  );
  const replay = await testHandler(
    jsonRequest(
      requestBody,
      `http://localhost/functions/v1/actions/admin/withdrawals/${withdrawalId}/approve`,
    ),
  );

  assertEquals(first.status, 200);
  assertEquals(replay.status, 200);
  const body = await first.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "approved");
  assertEquals(state.withdrawalRequests[0].status, "approved");
  assertEquals(state.withdrawalRequests[0].provider, "paystack");
  assertEquals(
    state.withdrawalRequests[0].provider_transfer_reference,
    "wd_523e4567e89b12d3a456426614174000",
  );
  assertEquals(state.auditLogs.length, 1);
  assertEquals(state.notifications.length, 1);
  assertEquals(state.idempotencyRecords.length, 1);
});

Deno.test("POST /admin/withdrawals/{id}/reject releases pending withdrawal hold", async () => {
  const state = createFakeState();
  state.profile.is_admin = true;
  const withdrawalId = "523e4567-e89b-12d3-a456-426614174000";
  state.withdrawalRequests.push({
    id: withdrawalId,
    user_id: state.user.id,
    wallet_account_id: state.wallet.wallet_account_id,
    amount: 100000,
    currency: "NGN",
    provider: null,
    provider_transfer_reference: null,
    status: "pending",
    ledger_entry_id: "423e4567-e89b-12d3-a456-426614174000",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "admin-wd-reject:abc123",
        payload: { reason: "Bank destination failed review." },
      },
      `http://localhost/functions/v1/actions/admin/withdrawals/${withdrawalId}/reject`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "rejected");
  assertEquals(state.withdrawalRequests[0].status, "rejected");
  assertEquals(
    state.withdrawalRequests[0].failure_reason,
    "Bank destination failed review.",
  );
  assertEquals(state.auditLogs[0].action, "wallet.withdrawal_rejected");
  assertEquals(state.notifications[0].title, "Withdrawal rejected");
});

Deno.test("POST /admin/users/{id}/freeze freezes account and writes audit log", async () => {
  const state = createFakeState();
  state.profile.is_admin = true;
  const targetUserId = "923e4567-e89b-42d3-a456-426614174000";
  state.jurorProfiles.push({
    id: targetUserId,
    username: "risk_user",
    account_status: "active",
    jury_opt_in: true,
    jury_categories: ["knowledge"],
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "admin-freeze:abc123",
        payload: { reason: "Suspicious payment activity." },
      },
      `http://localhost/functions/v1/actions/admin/users/${targetUserId}/freeze`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.accountStatus, "frozen");
  assertEquals(state.jurorProfiles[0].account_status, "frozen");
  assertEquals(state.jurorProfiles[0].jury_opt_in, false);
  assertEquals(state.auditLogs[0].action, "user.frozen");
  assertEquals(state.notifications[0].title, "Account frozen");
});

Deno.test("withdrawal processor creates Paystack recipient and initiates transfer", async () => {
  const state = createFakeState();
  state.withdrawalRequests.push({
    id: "423e4567-e89b-12d3-a456-426614174000",
    user_id: state.user.id,
    wallet_account_id: state.wallet.wallet_account_id,
    amount: 100000,
    currency: "NGN",
    bank_code: "058",
    account_number: "0123456789",
    account_name: "Ada Lovelace",
    provider: null,
    provider_recipient_code: null,
    provider_transfer_reference: null,
    status: "approved",
    retry_count: 0,
    ledger_entry_id: "523e4567-e89b-12d3-a456-426614174000",
  });
  const transferCalls: Record<string, unknown>[] = [];
  const testHandler = createWithdrawalProcessorHandler({
    createServiceClient: () => fakeClient(state),
    getPaystackSecret: () => "sk_test_unit_secret",
    getProcessorSecret: () => "processor_secret",
    paystackClient: {
      createRecipient: (params) =>
        Promise.resolve({
          recipientCode: `RCP_${params.withdrawalRequestId.slice(0, 8)}`,
          raw: { status: true },
        }),
      initiateTransfer: (params) => {
        transferCalls.push(params);
        return Promise.resolve({
          reference: params.reference,
          status: "pending",
          raw: { status: true, data: { reference: params.reference } },
        });
      },
    },
  });

  const response = await testHandler(
    new Request("http://localhost/functions/v1/withdrawal-processor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "Bearer processor_secret",
      },
      body: JSON.stringify({ limit: 1 }),
    }),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.claimed, 1);
  assertEquals(body.data.initiated, 1);
  assertEquals(state.withdrawalRequests[0].status, "processing");
  assertEquals(state.withdrawalRequests[0].provider, "paystack");
  assertEquals(
    state.withdrawalRequests[0].provider_transfer_reference,
    "wd_423e4567e89b12d3a456426614174000",
  );
  assertEquals(
    state.withdrawalRequests[0].provider_recipient_code,
    "RCP_423e4567",
  );
  assertEquals(state.paymentTransactions.length, 1);
  assertEquals(state.paymentTransactions[0].type, "withdrawal");
  assertEquals(state.paymentTransactions[0].status, "provider_pending");
  assertEquals(transferCalls.length, 1);
  assertEquals(
    transferCalls[0].reference,
    state.withdrawalRequests[0].provider_transfer_reference,
  );
});

Deno.test("withdrawal processor skips withdrawals before admin approval", async () => {
  const state = createFakeState();
  state.withdrawalRequests.push({
    id: "423e4567-e89b-12d3-a456-426614174000",
    user_id: state.user.id,
    wallet_account_id: state.wallet.wallet_account_id,
    amount: 100000,
    currency: "NGN",
    bank_code: "058",
    account_number: "0123456789",
    account_name: "Ada Lovelace",
    provider: null,
    provider_recipient_code: null,
    provider_transfer_reference: null,
    status: "pending",
    retry_count: 0,
    ledger_entry_id: "523e4567-e89b-12d3-a456-426614174000",
  });
  const testHandler = createWithdrawalProcessorHandler({
    createServiceClient: () => fakeClient(state),
    getPaystackSecret: () => "sk_test_unit_secret",
    getProcessorSecret: () => "processor_secret",
  });

  const response = await testHandler(
    new Request("http://localhost/functions/v1/withdrawal-processor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "Bearer processor_secret",
      },
      body: JSON.stringify({ limit: 1 }),
    }),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.claimed, 0);
  assertEquals(state.withdrawalRequests[0].status, "pending");
  assertEquals(state.paymentTransactions.length, 0);
});

Deno.test("POST /wallet/withdrawals rejects insufficient funds", async () => {
  const state = createFakeState();
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "withdrawal:large123456",
        payload: {
          amount: 300000,
          currency: "NGN",
          destination: {
            type: "bank_account",
            bankCode: "058",
            accountNumberToken: "acct_token_123456",
            accountName: "Ada Lovelace",
          },
        },
      },
      "http://localhost/functions/v1/actions/wallet/withdrawals",
    ),
  );

  assertEquals(response.status, 409);
  const body = await response.json();
  assertEquals(body.ok, false);
  assertEquals(body.error.code, "INSUFFICIENT_FUNDS");
  assertEquals(state.withdrawalRequests.length, 0);
  assertEquals(state.ledgerEntries.length, 0);
});

Deno.test("POST /dares creates an open DARE with issuer escrow", async () => {
  const state = createFakeState();
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });
  const requestBody = {
    requestId,
    idempotencyKey: "create-dare:abc123456",
    payload: {
      title: "Name 20 African capitals in 60 seconds",
      category: "knowledge",
      dareType: "skill",
      resolutionType: "answer_key",
      stakeAmount: 50000,
      rewardAmount: 0,
      currency: "NGN",
      durationSeconds: 60,
      targetUsername: null,
      constitution: {
        test: "Name 20 African capitals in 60 seconds",
        rules: "Answers must be submitted before the timer ends.",
        answerKey: "Lagos",
        answerKeyRules: "Exact answer required.",
        proofMethod: "Committed answer key",
        edgeCases: "Tie refunds both players.",
      },
    },
  };

  const first = await testHandler(
    jsonRequest(requestBody, "http://localhost/functions/v1/actions/dares"),
  );
  const replay = await testHandler(
    jsonRequest(requestBody, "http://localhost/functions/v1/actions/dares"),
  );

  assertEquals(first.status, 200);
  assertEquals(replay.status, 200);
  const body = await first.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "open");
  assertEquals(body.data.stakeAmount, 50000);
  assertEquals(state.dares.length, 1);
  assertEquals(state.dares[0].resolution_type, "answer_key");
  assertEquals(state.dareConstitutions.length, 1);
  assertEquals(state.escrowHolds.length, 1);
  assertEquals(state.ledgerEntries.length, 1);
  assertEquals(state.ledgerEntries[0].type, "escrow_hold");
  assertEquals(state.idempotencyRecords.length, 1);
});

Deno.test("POST /dares is blocked by action rate limits before mutation", async () => {
  const state = createFakeState();
  state.rateLimitDenials.add("create_dare:minute");
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "create-dare:rate-limited",
        payload: {
          title: "Name 20 African capitals in 60 seconds",
          category: "knowledge",
          dareType: "skill",
          resolutionType: "answer_key",
          stakeAmount: 50000,
          rewardAmount: 0,
          currency: "NGN",
          durationSeconds: 60,
          targetUsername: null,
          constitution: {
            test: "Name 20 African capitals in 60 seconds",
            rules: "Answers must be submitted before the timer ends.",
            answerKey: "Lagos",
            answerKeyRules: "Exact answer required.",
            proofMethod: "Committed answer key",
            edgeCases: "Tie refunds both players.",
          },
        },
      },
      "http://localhost/functions/v1/actions/dares",
    ),
  );

  assertEquals(response.status, 429);
  const body = await response.json();
  assertEquals(body.ok, false);
  assertEquals(body.error.code, "RATE_LIMITED");
  assertEquals(state.dares.length, 0);
  assertEquals(state.ledgerEntries.length, 0);
});

Deno.test("POST /dares enforces max stake limits before mutation", async () => {
  const state = createFakeState();
  state.responsibleGaming.max_stake_per_dare_kobo = 20000;
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "create-dare:max-stake",
        payload: {
          title: "Name 20 African capitals in 60 seconds",
          category: "knowledge",
          dareType: "skill",
          resolutionType: "answer_key",
          stakeAmount: 50000,
          rewardAmount: 0,
          currency: "NGN",
          durationSeconds: 60,
          targetUsername: null,
          constitution: {
            test: "Name 20 African capitals in 60 seconds",
            rules: "Answers must be submitted before the timer ends.",
            answerKey: "Lagos",
            answerKeyRules: "Exact answer required.",
            proofMethod: "Committed answer key",
            edgeCases: "Tie refunds both players.",
          },
        },
      },
      "http://localhost/functions/v1/actions/dares",
    ),
  );

  assertEquals(response.status, 429);
  const body = await response.json();
  assertEquals(body.ok, false);
  assertEquals(body.error.code, "LIMIT_EXCEEDED");
  assertEquals(state.dares.length, 0);
  assertEquals(state.escrowHolds.length, 0);
  assertEquals(state.ledgerEntries.length, 0);
});

Deno.test("POST /dares/{id}/accept escrows challenger and creates court", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: "723e4567-e89b-12d3-a456-426614174000",
    challenger_id: null,
    title: "Name 20 African capitals in 60 seconds",
    status: "open",
    stake_amount: 50000,
    currency: "NGN",
    constitution_id: "823e4567-e89b-12d3-a456-426614174000",
  });
  state.dareConstitutions.push({
    id: "823e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "accept-dare:abc123456",
        payload: {},
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/accept`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "ready_check");
  assertEquals(state.dares[0].status, "ready_check");
  assertEquals(state.dares[0].challenger_id, state.user.id);
  assertEquals(state.courtSessions.length, 1);
  assertEquals(state.escrowHolds.length, 1);
  assertEquals(state.ledgerEntries[0].metadata, { role: "challenger" });
});

Deno.test("POST /dares/{id}/cancel refunds issuer escrow once", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const holdLedgerId = "923e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: null,
    title: "Name 20 African capitals in 60 seconds",
    status: "open",
    stake_amount: 50000,
    currency: "NGN",
  });
  state.ledgerEntries.push({
    id: holdLedgerId,
    wallet_account_id: state.wallet.wallet_account_id,
    user_id: state.user.id,
    dare_id: dareId,
    type: "escrow_hold",
    direction: "debit",
    amount: 50000,
    currency: "NGN",
    status: "posted",
    idempotency_key: "create:cancel-test",
  });
  state.escrowHolds.push({
    id: "a23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    user_id: state.user.id,
    wallet_account_id: state.wallet.wallet_account_id,
    amount: 50000,
    currency: "NGN",
    status: "held",
    hold_reason: "dare_active",
    held_ledger_entry_id: holdLedgerId,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const first = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "cancel-dare:abc123456",
        payload: {},
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/cancel`,
    ),
  );
  const replay = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "cancel-dare:abc123456",
        payload: {},
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/cancel`,
    ),
  );

  assertEquals(first.status, 200);
  assertEquals(replay.status, 200);
  const body = await first.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "cancelled");
  assertEquals(body.data.refundedAmount, 50000);
  assertEquals(state.dares[0].status, "cancelled");
  assertEquals(state.escrowHolds[0].status, "refunded");
  assertEquals(
    state.ledgerEntries.filter((entry) => entry.type === "escrow_release")
      .length,
    1,
  );
  assertEquals(state.notifications[0].type, "system");
});

Deno.test("POST /dares/{id}/ready starts court after both players are ready", async () => {
  const state = createFakeState();
  const issuerId = state.user.id;
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: issuerId,
    challenger_id: challengerId,
    category: "knowledge",
    status: "ready_check",
    duration_seconds: 60,
  });
  state.darePrompts[0].dare_id = dareId;
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "ready_check",
    player_a_ready: false,
    player_b_ready: false,
    server_start_time: null,
    server_end_time: null,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const issuerReady = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "ready-issuer:abc123456",
        payload: {},
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/ready`,
    ),
  );
  state.user.id = challengerId;
  const challengerReady = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "ready-challenger:abc123456",
        payload: {},
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/ready`,
    ),
  );

  assertEquals(issuerReady.status, 200);
  assertEquals(challengerReady.status, 200);
  const issuerBody = await issuerReady.json();
  const challengerBody = await challengerReady.json();
  assertEquals(issuerBody.data.phase, "ready_check");
  assertEquals(issuerBody.data.playerAReady, true);
  assertEquals(challengerBody.data.phase, "active");
  assertEquals(challengerBody.data.playerBReady, true);
  assertEquals(challengerBody.data.assignedRounds, 1);
  assertEquals(state.dares[0].status, "active");
  assertEquals(state.dareQuizRounds.length, 0);
  assertEquals(state.auditLogs.length, 2);
});

Deno.test("POST /dares/{id}/forfeit marks opponent winner before settlement", async () => {
  const state = createFakeState();
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  state.profile.trust_score = 120;
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: challengerId,
    category: "knowledge",
    status: "active",
    winner_id: null,
    currency: "NGN",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "active",
  });
  state.escrowHolds.push(
    {
      id: "a23e4567-e89b-12d3-a456-426614174000",
      dare_id: dareId,
      user_id: state.user.id,
      wallet_account_id: state.wallet.wallet_account_id,
      amount: 50000,
      currency: "NGN",
      status: "held",
    },
    {
      id: "c23e4567-e89b-12d3-a456-426614174000",
      dare_id: dareId,
      user_id: challengerId,
      wallet_account_id: "333e4567-e89b-12d3-a456-426614174000",
      amount: 50000,
      currency: "NGN",
      status: "held",
    },
  );
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "forfeit:abc123456",
        payload: {},
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/forfeit`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "settled");
  assertEquals(body.data.forfeiterId, state.user.id);
  assertEquals(body.data.winnerId, challengerId);
  assertEquals(state.dares[0].status, "settled");
  assertEquals(state.dares[0].winner_id, challengerId);
  assertEquals(state.courtSessions[0].phase, "completed");
  assertEquals(
    state.escrowHolds.every((hold) => hold.status === "released"),
    true,
  );
  assertEquals(state.ledgerEntries[0].type, "payout");
  assertEquals(state.profile.trust_score, 105);
  assertEquals(state.auditLogs[0].action, "dare.forfeited");
  assertEquals(state.notifications.length, 2);
});

Deno.test("POST /court/{dareId}/heartbeat records participant presence", async () => {
  const state = createFakeState();
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: challengerId,
    status: "active",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "active",
    player_a_heartbeat_at: null,
    player_b_heartbeat_at: null,
    reconnect_deadline: null,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        payload: {},
      },
      `http://localhost/functions/v1/actions/court/${dareId}/heartbeat`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.playerRole, "A");
  assertEquals(body.data.phase, "active");
  assertEquals(
    state.courtSessions[0].player_a_heartbeat_at,
    "2026-05-21T00:03:00.000Z",
  );
  assertEquals(
    state.courtSessions[0].reconnect_deadline,
    "2026-05-21T00:04:00.000Z",
  );
});

Deno.test("POST /court/{dareId}/heartbeat is rate limited", async () => {
  const state = createFakeState();
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: challengerId,
    status: "active",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "active",
    player_a_heartbeat_at: "2026-05-21T00:02:55.000Z",
    player_b_heartbeat_at: null,
    reconnect_deadline: "2026-05-21T00:03:55.000Z",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        payload: {},
      },
      `http://localhost/functions/v1/actions/court/${dareId}/heartbeat`,
    ),
  );

  assertEquals(response.status, 429);
  const body = await response.json();
  assertEquals(body.ok, false);
  assertEquals(body.error.code, "RATE_LIMITED");
});

Deno.test("POST /court/{dareId}/messages stores participant message once", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: "723e4567-e89b-12d3-a456-426614174000",
    status: "active",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });
  const requestBody = {
    requestId,
    idempotencyKey: "court-message:abc123456",
    payload: {
      message: "Ready for round two.",
    },
  };

  const first = await testHandler(
    jsonRequest(
      requestBody,
      `http://localhost/functions/v1/actions/court/${dareId}/messages`,
    ),
  );
  const replay = await testHandler(
    jsonRequest(
      requestBody,
      `http://localhost/functions/v1/actions/court/${dareId}/messages`,
    ),
  );

  assertEquals(first.status, 200);
  assertEquals(replay.status, 200);
  const body = await first.json();
  const replayBody = await replay.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.dareId, dareId);
  assertEquals(body.data.message, "Ready for round two.");
  assertEquals(body.data.usernameSnapshot, "ada");
  assertEquals(replayBody.data.messageId, body.data.messageId);
  assertEquals(state.courtChatMessages.length, 1);
  assertEquals(state.auditLogs.length, 1);
  assertEquals(state.auditLogs[0].action, "court.message_sent");
  assertEquals(state.idempotencyRecords.length, 1);
});

Deno.test("POST /court/{dareId}/messages rejects non-participants", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: "823e4567-e89b-12d3-a456-426614174000",
    challenger_id: "723e4567-e89b-12d3-a456-426614174000",
    status: "active",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "court-message-denied:abc123456",
        payload: {
          message: "I should not be here.",
        },
      },
      `http://localhost/functions/v1/actions/court/${dareId}/messages`,
    ),
  );

  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.ok, false);
  assertEquals(body.error.code, "FORBIDDEN");
  assertEquals(state.courtChatMessages.length, 0);
});

Deno.test("POST /dares/{id}/answers scores from committed creator answer key", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const questionId = state.darePrompts[0].id;
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: "723e4567-e89b-12d3-a456-426614174000",
    category: "knowledge",
    status: "active",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "active",
    score_a: 0,
    score_b: 0,
    server_start_time: "2026-05-21T00:00:00.000Z",
    server_end_time: "2099-05-21T00:01:00.000Z",
  });
  state.darePrompts[0].dare_id = dareId;
  state.dareAnswerKeys[0].dare_id = dareId;
  state.dareAnswerKeys[0].prompt_id = questionId;
  state.darePrompts[0].id = questionId;
  state.darePrompts[0].position = 0;
  state.darePrompts[0].prompt = "What is the capital of Lagos State?";
  state.dareAnswerKeys[0].answer_text = "Ikeja";
  state.dareAnswerKeys[0].answer_hash = "ikeja";
  state.dareAnswerKeys[0].answer_salt = "fake";
  state.darePromptAssignments.push({
    id: "e23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    prompt_id: questionId,
    round_index: 0,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const first = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "answer:abc123456",
        payload: {
          answerText: "Ikeja",
          questionId,
        },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/answers`,
    ),
  );
  const replay = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "answer:abc123456",
        payload: {
          answerText: "Ikeja",
          questionId,
        },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/answers`,
    ),
  );

  assertEquals(first.status, 200);
  assertEquals(replay.status, 200);
  const body = await first.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.correct, true);
  assertEquals(body.data.scoreA, 1);
  assertEquals(body.data.scoreB, 0);
  assertEquals(state.dareAnswerSubmissions.length, 1);
  assertEquals(state.idempotencyRecords.length, 1);
});

Deno.test("GET /court/{dareId}/question returns prompt without answer key", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const questionId = state.darePrompts[0].id;
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: "723e4567-e89b-12d3-a456-426614174000",
    category: "knowledge",
    status: "active",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "active",
    score_a: 0,
    score_b: 0,
    server_start_time: "2026-05-21T00:00:00.000Z",
    server_end_time: "2099-05-21T00:01:00.000Z",
  });
  state.darePrompts[0].dare_id = dareId;
  state.darePrompts[0].prompt = "What is the capital of Lagos State?";
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    new Request(
      `http://localhost/functions/v1/actions/court/${dareId}/question`,
      { method: "GET" },
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.questionId, questionId);
  assertEquals(body.data.roundIndex, 0);
  assertEquals(body.data.options, []);
  assertEquals("correctOption" in body.data, false);
  assertEquals("correct_option" in body.data, false);
});

Deno.test("POST /dares/{id}/complete determines winner from answers", async () => {
  const state = createFakeState();
  state.profile.is_admin = true;
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: challengerId,
    dare_type: "skill",
    status: "active",
    winner_id: null,
    completed_at: null,
    dispute_deadline_at: null,
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "active",
    score_a: 0,
    score_b: 0,
    server_end_time: "2026-05-21T00:00:00.000Z",
  });
  state.dareAnswerSubmissions.push({
    dare_id: dareId,
    user_id: state.user.id,
    prompt_id: state.darePrompts[0].id,
    correct: true,
  });

  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });
  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "complete:abc123456",
        payload: {},
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/complete`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "completed");
  assertEquals(body.data.winnerId, state.user.id);
  assertEquals(body.data.scoreA, 1);
  assertEquals(body.data.scoreB, 0);
  assertEquals(state.dares[0].status, "completed");
});

Deno.test("POST /dares/{id}/settle releases escrow to winner once", async () => {
  const state = createFakeState();
  state.profile.is_admin = true;
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: challengerId,
    status: "completed",
    winner_id: state.user.id,
    currency: "NGN",
    dispute_deadline_at: "2026-05-21T00:00:00.000Z",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "completed",
  });
  state.escrowHolds.push(
    {
      id: "a23e4567-e89b-12d3-a456-426614174000",
      dare_id: dareId,
      user_id: state.user.id,
      wallet_account_id: state.wallet.wallet_account_id,
      amount: 50000,
      currency: "NGN",
      status: "held",
    },
    {
      id: "c23e4567-e89b-12d3-a456-426614174000",
      dare_id: dareId,
      user_id: challengerId,
      wallet_account_id: "333e4567-e89b-12d3-a456-426614174000",
      amount: 50000,
      currency: "NGN",
      status: "held",
    },
  );
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const first = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "settle:abc123456",
        payload: {},
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/settle`,
    ),
  );
  const replay = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "settle:abc123456",
        payload: {},
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/settle`,
    ),
  );

  assertEquals(first.status, 200);
  assertEquals(replay.status, 200);
  const body = await first.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "settled");
  assertEquals(body.data.payoutAmount, 100000);
  assertEquals(state.dares[0].status, "settled");
  assertEquals(
    state.ledgerEntries.filter((entry) => entry.type === "payout").length,
    1,
  );
  assertEquals(
    state.escrowHolds.every((hold) => hold.status === "released"),
    true,
  );
});

Deno.test("POST /dares/{id}/disputes freezes a completed dare", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: challengerId,
    status: "completed",
    winner_id: state.user.id,
    dispute_deadline_at: "2099-05-21T00:00:00.000Z",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "completed",
  });
  state.escrowHolds.push({
    id: "a23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    user_id: state.user.id,
    wallet_account_id: state.wallet.wallet_account_id,
    amount: 50000,
    currency: "NGN",
    status: "held",
    hold_reason: "dare_active",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "dispute:abc123456",
        payload: {
          reason: "score_issue",
          summary: "The final score did not match the submitted answers.",
          evidenceObjectIds: [],
        },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/disputes`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "filed");
  assertEquals(body.data.dareStatus, "dispute_pending");
  assertEquals(body.data.opponentUserId, challengerId);
  assertEquals(state.dares[0].status, "dispute_pending");
  assertEquals(state.courtSessions[0].phase, "disputed");
  assertEquals(state.escrowHolds[0].hold_reason, "dispute_pending");
  assertEquals(state.juryCases.length, 1);
  assertEquals(state.notifications[0].type, "dispute_filed");
});

Deno.test("POST /dares/{id}/evidence creates a signed upload target", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: "723e4567-e89b-12d3-a456-426614174000",
    status: "dispute_pending",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "evidence-upload:abc123456",
        payload: {
          fileName: "score.png",
          mimeType: "image/png",
          fileSizeBytes: 2048,
        },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/evidence`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "pending");
  assertEquals(body.data.storageBucket, "dare-evidence");
  assertEquals(body.data.upload.token, "signed-upload-token");
  assertEquals(state.evidenceObjects.length, 1);
  assertEquals(state.evidenceObjects[0].status, "pending");
  assertEquals(state.auditLogs[0].action, "evidence.upload_requested");
});

Deno.test("POST /dares/{id}/evidence/confirm attaches evidence to the jury case", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const evidenceId = "a23e4567-e89b-42d3-a456-426614174000";
  const juryCaseId = "b23e4567-e89b-42d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: "723e4567-e89b-12d3-a456-426614174000",
    status: "dispute_pending",
  });
  state.evidenceObjects.push({
    id: evidenceId,
    dare_id: dareId,
    user_id: state.user.id,
    storage_bucket: "dare-evidence",
    storage_path: `${dareId}/${state.user.id}/${evidenceId}.png`,
    media_type: "image/png",
    byte_size: 2048,
    status: "pending",
  });
  state.juryCases.push({
    id: juryCaseId,
    dare_id: dareId,
    opened_by_user_id: state.user.id,
    status: "filed",
    evidence_a_id: null,
    evidence_b_id: null,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "evidence-confirm:abc123456",
        payload: {
          evidenceObjectId: evidenceId,
          contentHash: "0123456789abcdef",
        },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/evidence/confirm`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "uploaded");
  assertEquals(body.data.side, "A");
  assertEquals(state.evidenceObjects[0].status, "uploaded");
  assertEquals(state.juryCases[0].evidence_a_id, evidenceId);
  assertEquals(state.auditLogs[0].action, "evidence.upload_confirmed");
});

Deno.test("POST /dares/{id}/evidence/confirm supports evidence resolution before dispute", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const evidenceId = "a23e4567-e89b-42d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: "723e4567-e89b-12d3-a456-426614174000",
    status: "active",
    resolution_type: "evidence",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "active",
  });
  state.evidenceObjects.push({
    id: evidenceId,
    dare_id: dareId,
    user_id: state.user.id,
    storage_bucket: "dare-evidence",
    storage_path: `${dareId}/${state.user.id}/${evidenceId}.png`,
    media_type: "image/png",
    byte_size: 2048,
    status: "pending",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "evidence-confirm-result:abc123456",
        payload: {
          evidenceObjectId: evidenceId,
          contentHash: "0123456789abcdef",
        },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/evidence/confirm`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.juryCaseId, null);
  assertEquals(body.data.status, "uploaded");
  assertEquals(state.evidenceObjects[0].status, "uploaded");
});

Deno.test("POST /dares/{id}/results/claims records witnessed result until both participants agree", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: challengerId,
    dare_type: "skill",
    resolution_type: "witnessed",
    status: "active",
    winner_id: null,
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "active",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "result-claim:abc123456",
        payload: {
          claimedOutcome: "issuer_won",
          claimedWinnerId: state.user.id,
          rationale: "Both players witnessed the finish.",
        },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/results/claims`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.claimState, "pending");
  assertEquals(body.data.dareStatus, "awaiting_result");
  assertEquals(body.data.agreedWinnerId, null);
  assertEquals(state.dares[0].status, "awaiting_result");
  assertEquals(state.courtSessions[0].phase, "awaiting_result");
  assertEquals(state.resultClaims.length, 1);
});

Deno.test("POST /dares/{id}/results/claims completes witnessed result on matching claim", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const issuerId = "823e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: issuerId,
    challenger_id: state.user.id,
    dare_type: "skill",
    resolution_type: "witnessed",
    status: "awaiting_result",
    winner_id: null,
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "awaiting_result",
  });
  state.resultClaims.push({
    id: "c23e4567-e89b-42d3-a456-426614174000",
    dare_id: dareId,
    user_id: issuerId,
    claimed_outcome: "issuer_won",
    claimed_winner_id: issuerId,
    rationale: "Issuer finished first.",
    evidence_object_ids: [],
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "result-claim-match:abc123456",
        payload: {
          claimedOutcome: "issuer_won",
          claimedWinnerId: issuerId,
          rationale: "I agree with the witnessed result.",
        },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/results/claims`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.claimState, "agreed");
  assertEquals(body.data.dareStatus, "completed");
  assertEquals(body.data.agreedWinnerId, issuerId);
  assertEquals(state.dares[0].status, "completed");
  assertEquals(state.courtSessions[0].phase, "completed");
  assertEquals(state.resultClaims.length, 2);
});

Deno.test("POST /dares/{id}/results/witness-votes requires eligible attendance", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const issuerId = "823e4567-e89b-12d3-a456-426614174000";
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: issuerId,
    challenger_id: challengerId,
    dare_type: "skill",
    resolution_type: "witnessed",
    status: "active",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "active",
    votes_a: 0,
    votes_b: 0,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const rejected = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "witness-vote:missing-attendance",
        payload: { vote: "A" },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/results/witness-votes`,
    ),
  );
  assertEquals(rejected.status, 409);
  assertEquals((await rejected.json()).error.code, "INVALID_STATE");

  const attendance = await testHandler(
    jsonRequest(
      {
        requestId,
        payload: {},
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/results/witness-attendance`,
    ),
  );
  assertEquals(attendance.status, 200);
  assertEquals(state.witnessAttendances.length, 1);
  state.witnessAttendances[0].joined_at = "2026-05-21T00:02:30.000Z";
  state.witnessAttendances[0].last_seen_at = "2026-05-21T00:03:00.000Z";

  const accepted = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "witness-vote:eligible-attendance",
        payload: { vote: "A" },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/results/witness-votes`,
    ),
  );
  assertEquals(accepted.status, 200);
  const body = await accepted.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.votesA, 1);
  assertEquals(state.dareVotes.length, 1);
});

Deno.test("POST /dares/{id}/results/claims opens dispute path on explicit dispute", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: challengerId,
    dare_type: "skill",
    resolution_type: "witnessed",
    status: "active",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "active",
  });
  state.escrowHolds.push({
    id: "a23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    user_id: state.user.id,
    wallet_account_id: state.wallet.wallet_account_id,
    amount: 50000,
    currency: "NGN",
    status: "held",
    hold_reason: "dare_active",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "result-claim-dispute:abc123456",
        payload: {
          claimedOutcome: "dispute",
          rationale: "The witnessed result is contested and needs review.",
        },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/results/claims`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.data.claimState, "dispute_requested");
  assertEquals(body.data.dareStatus, "dispute_pending");
  assertEquals(body.data.courtPhase, "disputed");
  assertEquals(state.juryCases.length, 1);
  assertEquals(state.escrowHolds[0].hold_reason, "dispute_pending");
});

Deno.test("POST /dares/{id}/results/claims opens dispute path on conflicting claims", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const issuerId = "823e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: issuerId,
    challenger_id: state.user.id,
    dare_type: "skill",
    resolution_type: "witnessed",
    status: "awaiting_result",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "awaiting_result",
  });
  state.resultClaims.push({
    id: "c23e4567-e89b-42d3-a456-426614174000",
    dare_id: dareId,
    user_id: issuerId,
    claimed_outcome: "issuer_won",
    claimed_winner_id: issuerId,
    rationale: "Issuer finished first.",
    evidence_object_ids: [],
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "result-claim-conflict:abc123456",
        payload: {
          claimedOutcome: "challenger_won",
          claimedWinnerId: state.user.id,
          rationale: "I disagree with the witnessed result.",
        },
      },
      `http://localhost/functions/v1/actions/dares/${dareId}/results/claims`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.data.claimState, "conflicted");
  assertEquals(body.data.dareStatus, "dispute_pending");
  assertEquals(body.data.courtPhase, "disputed");
  assertEquals(state.juryCases.length, 1);
});

Deno.test("POST /admin/jury-cases/{id}/resolve returns dare to settlement path", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  const juryCaseId = "b23e4567-e89b-12d3-a456-426614174000";
  state.profile.is_admin = true;
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: challengerId,
    status: "dispute_pending",
    winner_id: state.user.id,
    dispute_deadline_at: "2099-05-21T00:00:00.000Z",
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "disputed",
  });
  state.juryCases.push({
    id: juryCaseId,
    dare_id: dareId,
    opened_by_user_id: challengerId,
    status: "filed",
    verdict: null,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "admin-resolve:abc123456",
        payload: {
          verdict: "B",
          adminNote: "Manual review confirms challenger should win.",
        },
      },
      `http://localhost/functions/v1/actions/admin/jury-cases/${juryCaseId}/resolve`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "settlement_pending");
  assertEquals(body.data.verdict, "B");
  assertEquals(body.data.winnerId, challengerId);
  assertEquals(body.data.dareStatus, "completed");
  assertEquals(state.dares[0].status, "completed");
  assertEquals(state.dares[0].winner_id, challengerId);
  assertEquals(state.juryCases[0].status, "settlement_pending");
  assertEquals(state.auditLogs[0].actor_type, "admin");
});

Deno.test("POST /admin/jury-cases/{id}/assign creates juror assignments", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  const juryCaseId = "b23e4567-e89b-12d3-a456-426614174000";
  state.profile.is_admin = true;
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: challengerId,
    category: "knowledge",
    status: "dispute_pending",
  });
  state.juryCases.push({
    id: juryCaseId,
    dare_id: dareId,
    opened_by_user_id: challengerId,
    status: "filed",
    votes_needed: 3,
  });
  seedJurors(state);
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "assign-jury:abc123456",
        payload: {},
      },
      `http://localhost/functions/v1/actions/admin/jury-cases/${juryCaseId}/assign`,
    ),
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.status, "jury_voting");
  assertEquals(body.data.assignedCount, 3);
  assertEquals(state.dares[0].status, "jury_open");
  assertEquals(state.juryAssignments.length, 3);
  assertEquals(state.notifications.length, 3);
  assertEquals(state.auditLogs[0].action, "jury.assigned");
});

Deno.test("POST /jury-cases/{id}/votes reaches a settlement pending verdict", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  const challengerId = "723e4567-e89b-12d3-a456-426614174000";
  const juryCaseId = "b23e4567-e89b-12d3-a456-426614174000";
  const jurors = seedJurors(state);
  state.dares.push({
    id: dareId,
    issuer_id: state.user.id,
    challenger_id: challengerId,
    category: "knowledge",
    status: "jury_open",
    winner_id: state.user.id,
  });
  state.courtSessions.push({
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dareId,
    phase: "disputed",
  });
  state.juryCases.push({
    id: juryCaseId,
    dare_id: dareId,
    opened_by_user_id: challengerId,
    status: "jury_voting",
    votes_needed: 3,
    verdict: null,
  });
  state.juryAssignments.push(
    ...jurors.map((juror, index) => ({
      id: `c23e4567-e89b-42d3-a456-${String(index).padStart(12, "0")}`,
      jury_case_id: juryCaseId,
      juror_id: juror.id,
      status: "assigned",
      due_at: "2099-05-21T00:00:00.000Z",
    })),
  );
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  for (const [index, juror] of jurors.entries()) {
    state.user.id = juror.id as string;
    const response = await testHandler(
      jsonRequest(
        {
          requestId,
          idempotencyKey: `jury-vote:${index}:abc123456`,
          payload: {
            vote: "B",
            rationale: "The challenger evidence is stronger than side A.",
          },
        },
        `http://localhost/functions/v1/actions/jury-cases/${juryCaseId}/votes`,
      ),
    );
    assertEquals(response.status, 200);
  }

  assertEquals(state.juryVotes.length, 3);
  assertEquals(state.juryCases[0].status, "settlement_pending");
  assertEquals(state.juryCases[0].verdict, "B");
  assertEquals(state.dares[0].status, "completed");
  assertEquals(state.dares[0].winner_id, challengerId);
  assertEquals(state.courtSessions[0].phase, "completed");
});

Deno.test("POST /dares/{id}/complete returns 403 for non-admin", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: "823e4567-e89b-12d3-a456-426614174000",
    challenger_id: "723e4567-e89b-12d3-a456-426614174000",
    status: "active",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      { requestId, idempotencyKey: "complete:nonAdmin:abc123" },
      `http://localhost/functions/v1/actions/dares/${dareId}/complete`,
    ),
  );
  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.error.code, "FORBIDDEN");
});

Deno.test("POST /dares/{id}/settle returns 403 for non-admin", async () => {
  const state = createFakeState();
  const dareId = "623e4567-e89b-12d3-a456-426614174000";
  state.dares.push({
    id: dareId,
    issuer_id: "823e4567-e89b-12d3-a456-426614174000",
    challenger_id: "723e4567-e89b-12d3-a456-426614174000",
    status: "completed",
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      { requestId, idempotencyKey: "settle:nonAdmin:abc123" },
      `http://localhost/functions/v1/actions/dares/${dareId}/settle`,
    ),
  );
  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.error.code, "FORBIDDEN");
});

Deno.test("POST /admin/jury-cases/{id}/resolve returns 403 for non-admin", async () => {
  const state = createFakeState();
  const juryCaseId = "b23e4567-e89b-12d3-a456-426614174000";
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "resolve:nonAdmin:abc123",
        payload: { verdict: "A", adminNote: "test" },
      },
      `http://localhost/functions/v1/actions/admin/jury-cases/${juryCaseId}/resolve`,
    ),
  );
  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.error.code, "FORBIDDEN");
});

Deno.test("POST /admin/jury-cases/{id}/assign returns 403 for non-admin", async () => {
  const state = createFakeState();
  const juryCaseId = "b23e4567-e89b-12d3-a456-426614174000";
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "assign:nonAdmin:abc123",
        payload: { jurorIds: ["923e4567-e89b-42d3-a456-426614174000"] },
      },
      `http://localhost/functions/v1/actions/admin/jury-cases/${juryCaseId}/assign`,
    ),
  );
  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.error.code, "FORBIDDEN");
});

Deno.test("POST /wallet/deposits/init rejects when daily deposit limit is exceeded", async () => {
  const state = createFakeState();
  // daily_deposit_limit_kobo = 500000; inject 450001 already used → 450001 + 100000 > 500000
  const baseServiceClient = fakeClient(state);
  const limitedServiceClient: SupabaseActionClient = {
    auth: baseServiceClient.auth,
    from: (table: string) => baseServiceClient.from(table),
    storage: baseServiceClient.storage,
    rpc<T>(
      functionName: string,
      args: Record<string, unknown>,
    ): Promise<QueryResponse<T>> {
      if (functionName === "get_user_deposit_totals_kobo") {
        return Promise.resolve({
          data: [{
            daily_total_kobo: 450001,
            weekly_total_kobo: 0,
            monthly_total_kobo: 0,
          }] as unknown as T,
          error: null,
        });
      }
      return baseServiceClient.rpc<T>(functionName, args);
    },
  };

  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => limitedServiceClient,
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "deposit:limit:abc123",
        payload: { amount: 100000, currency: "NGN", provider: "paystack" },
      },
      "http://localhost/functions/v1/actions/wallet/deposits/init",
    ),
  );
  assertEquals(response.status, 429);
  const body = await response.json();
  assertEquals(body.ok, false);
  assertEquals(body.error.code, "LIMIT_EXCEEDED");
});

Deno.test("GET /kyc/status returns null when no verification exists", async () => {
  const state = createFakeState();
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    new Request("http://localhost/functions/v1/actions/kyc/status", {
      method: "GET",
    }),
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data, null);
});

Deno.test("GET /kyc/status returns the most recent verification", async () => {
  const state = createFakeState();
  state.kycVerifications.push({
    id: "kv-001",
    user_id: state.user.id,
    kyc_tier_requested: "kyc1",
    kyc_tier_granted: null,
    status: "pending",
    submitted_at: "2026-05-21T00:00:00.000Z",
    decided_at: null,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    new Request("http://localhost/functions/v1/actions/kyc/status", {
      method: "GET",
    }),
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.data.kycTierRequested, "kyc1");
  assertEquals(body.data.status, "pending");
  assertEquals(body.data.kycTierGranted, null);
});

Deno.test("POST /admin/kyc/{id}/decide approves and upgrades profile tier", async () => {
  const state = createFakeState();
  const kycVerificationId = "a23e4567-e89b-42d3-a456-426614174101";
  state.profile.is_admin = true;
  (state.profile as Record<string, unknown>).kyc_tier = "kyc0";
  state.kycVerifications.push({
    id: kycVerificationId,
    user_id: state.user.id,
    kyc_tier_requested: "kyc1",
    kyc_tier_granted: null,
    status: "pending",
    submitted_at: "2026-05-21T00:00:00.000Z",
    decided_at: null,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "kyc:decide:approve:abc123",
        payload: { verdict: "approved", kycTierGranted: "kyc1" },
      },
      `http://localhost/functions/v1/actions/admin/kyc/${kycVerificationId}/decide`,
    ),
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.data.status, "approved");
  assertEquals(body.data.kycTierGranted, "kyc1");
  assertEquals(state.kycVerifications[0].status, "approved");
  assertEquals(state.profile.kyc_tier, "kyc1");
  assertEquals(state.auditLogs.length, 1);
  assertEquals(state.auditLogs[0].actor_type, "admin");
  assertEquals(state.notifications.length, 1);
  assertEquals(state.notifications[0].user_id, state.user.id);
});

Deno.test("POST /admin/kyc/{id}/decide rejects without upgrading profile", async () => {
  const state = createFakeState();
  const kycVerificationId = "a23e4567-e89b-42d3-a456-426614174102";
  state.profile.is_admin = true;
  (state.profile as Record<string, unknown>).kyc_tier = "kyc0";
  state.kycVerifications.push({
    id: kycVerificationId,
    user_id: state.user.id,
    kyc_tier_requested: "kyc1",
    kyc_tier_granted: null,
    status: "pending",
    submitted_at: "2026-05-21T00:00:00.000Z",
    decided_at: null,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "kyc:decide:reject:abc123",
        payload: { verdict: "rejected", adminNote: "Document unclear." },
      },
      `http://localhost/functions/v1/actions/admin/kyc/${kycVerificationId}/decide`,
    ),
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.data.status, "rejected");
  assertEquals(body.data.kycTierGranted, null);
  assertEquals(state.kycVerifications[0].status, "rejected");
  assertEquals(state.profile.kyc_tier, "kyc0");
  assertEquals(state.notifications.length, 1);
  assertEquals(state.notifications[0].user_id, state.user.id);
});

Deno.test("POST /admin/kyc/{id}/decide returns 403 for non-admin", async () => {
  const state = createFakeState();
  const kycVerificationId = "a23e4567-e89b-42d3-a456-426614174103";
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "kyc:decide:nonAdmin:abc123",
        payload: { verdict: "approved", kycTierGranted: "kyc1" },
      },
      `http://localhost/functions/v1/actions/admin/kyc/${kycVerificationId}/decide`,
    ),
  );
  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.error.code, "FORBIDDEN");
});

Deno.test("POST /admin/kyc/{id}/decide is idempotent", async () => {
  const state = createFakeState();
  const kycVerificationId = "a23e4567-e89b-42d3-a456-426614174104";
  state.profile.is_admin = true;
  state.kycVerifications.push({
    id: kycVerificationId,
    user_id: state.user.id,
    kyc_tier_requested: "kyc2",
    kyc_tier_granted: null,
    status: "pending",
    submitted_at: "2026-05-21T00:00:00.000Z",
    decided_at: null,
  });
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const requestBody = {
    requestId,
    idempotencyKey: "kyc:decide:idem:abc123",
    payload: { verdict: "approved", kycTierGranted: "kyc2" },
  };
  const url =
    `http://localhost/functions/v1/actions/admin/kyc/${kycVerificationId}/decide`;

  const first = await testHandler(jsonRequest(requestBody, url));
  const replay = await testHandler(jsonRequest(requestBody, url));

  assertEquals(first.status, 200);
  assertEquals(replay.status, 200);
  const firstBody = await first.json();
  const replayBody = await replay.json();
  assertEquals(
    firstBody.data.kycVerificationId,
    replayBody.data.kycVerificationId,
  );
  assertEquals(state.kycVerifications[0].status, "approved");
  assertEquals(state.auditLogs.length, 1);
});

Deno.test("POST /kyc/submit creates a pending verification record", async () => {
  const state = createFakeState();
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const response = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "kyc:submit:abc123",
        payload: {
          kycTierRequested: "kyc1",
          documents: { bvn: "12345678901" },
        },
      },
      "http://localhost/functions/v1/actions/kyc/submit",
    ),
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.data.kycTierRequested, "kyc1");
  assertEquals(body.data.status, "pending");
  assertEquals(state.kycVerifications.length, 1);
  assertEquals(state.auditLogs.length, 1);
});

Deno.test("POST /kyc/submit rejects duplicate pending verification at same tier", async () => {
  const state = createFakeState();
  const testHandler = createHandler({
    createClient: () => fakeClient(state),
    createServiceClient: () => fakeClient(state),
  });

  const firstResponse = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "kyc:dup:first",
        payload: {
          kycTierRequested: "kyc1",
          documents: { bvn: "12345678901" },
        },
      },
      "http://localhost/functions/v1/actions/kyc/submit",
    ),
  );
  assertEquals(firstResponse.status, 200);

  const secondResponse = await testHandler(
    jsonRequest(
      {
        requestId,
        idempotencyKey: "kyc:dup:second",
        payload: {
          kycTierRequested: "kyc1",
          documents: { bvn: "12345678901" },
        },
      },
      "http://localhost/functions/v1/actions/kyc/submit",
    ),
  );
  assertEquals(secondResponse.status, 409);
  const body = await secondResponse.json();
  assertEquals(body.error.code, "INVALID_STATE");
});

function jsonRequest(
  body: unknown,
  url = "http://localhost/functions/v1/actions",
  method = "POST",
): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function webhookRequest(rawBody: string, signature: string): Request {
  return new Request("http://localhost/functions/v1/paystack-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": signature,
    },
    body: rawBody,
  });
}

async function hmacSha512Hex(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function seedJurors(
  state: ReturnType<typeof createFakeState>,
): Record<string, unknown>[] {
  const jurors = [
    "923e4567-e89b-42d3-a456-426614174000",
    "923e4567-e89b-42d3-a456-426614174001",
    "923e4567-e89b-42d3-a456-426614174002",
  ].map((id, index) => ({
    id,
    username: `juror_${index}`,
    jury_opt_in: true,
    jury_categories: ["knowledge"],
    trust_score: 700,
    completed_dares: 20,
    kyc_tier: "kyc1",
    account_status: "active",
    risk_status: "normal",
  }));
  state.jurorProfiles.push(...jurors);
  return jurors;
}

function createFakeState() {
  return {
    user: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "ada@example.com",
    },
    profile: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      username: "ada",
      display_name: "Ada",
      avatar_url: null,
      avatar_emoji: "A",
      avatar_color: "ember",
      bio: null,
      country: "NG",
      city: null,
      trust_score: 120,
      tier: "contender",
      wins: 3,
      losses: 1,
      disputes: 0,
      completed_dares: 4,
      jury_opt_in: true,
      jury_categories: ["knowledge"],
      kyc_tier: "kyc1",
      account_status: "active",
      risk_status: "normal",
      is_admin: false,
      created_at: "2026-05-21T00:00:00Z",
      updated_at: "2026-05-21T00:00:00Z",
    },
    wallet: {
      wallet_account_id: "223e4567-e89b-12d3-a456-426614174000",
      user_id: "123e4567-e89b-12d3-a456-426614174000",
      currency: "NGN",
      account_status: "active",
      available_balance: 250000,
      escrowed_balance: 50000,
      dispute_held_balance: 0,
      pending_withdrawal_balance: 0,
    },
    responsibleGaming: {
      user_id: "123e4567-e89b-12d3-a456-426614174000",
      daily_deposit_limit_kobo: 500000,
      weekly_deposit_limit_kobo: 2000000,
      monthly_deposit_limit_kobo: null,
      session_max_minutes: null,
      max_stake_per_dare_kobo: 100000,
      pending_daily_deposit_limit_kobo: null,
      pending_weekly_deposit_limit_kobo: null,
      pending_monthly_deposit_limit_kobo: null,
      pending_session_max_minutes: null,
      pending_max_stake_per_dare_kobo: null,
      pending_limits_effective_at: null,
      self_excluded: false,
      self_exclusion_until: null,
      cooling_off_until: null,
    },
    jurorProfiles: [] as Record<string, unknown>[],
    paymentTransactions: [] as Record<string, unknown>[],
    withdrawalRequests: [] as Record<string, unknown>[],
    dares: [] as Record<string, unknown>[],
    dareConstitutions: [] as Record<string, unknown>[],
    escrowHolds: [] as Record<string, unknown>[],
    courtSessions: [] as Record<string, unknown>[],
    courtChatMessages: [] as Record<string, unknown>[],
    evidenceObjects: [] as Record<string, unknown>[],
    juryCases: [] as Record<string, unknown>[],
    juryAssignments: [] as Record<string, unknown>[],
    juryVotes: [] as Record<string, unknown>[],
    quizQuestions: Array.from({ length: 6 }, (_, index) => ({
      id: `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      category: "knowledge",
      active: true,
      prompt: `Question ${index + 1}`,
      options: ["A", "B", "C", "D"],
      correct_option: 2,
    })) as Record<string, unknown>[],
    dareQuizRounds: [] as Record<string, unknown>[],
    dareQuizAnswers: [] as Record<string, unknown>[],
    darePrompts: [{
      id: "10000000-0000-4000-9000-000000000000",
      dare_id: null,
      created_by: "123e4567-e89b-12d3-a456-426614174000",
      prompt: "What is the capital of Lagos State?",
      answer_format: "short_text",
      response_options: null,
      position: 0,
    }] as Record<string, unknown>[],
    dareAnswerKeys: [{
      id: "10000000-0000-4000-9001-000000000000",
      dare_id: null,
      prompt_id: "10000000-0000-4000-9000-000000000000",
      answer_text: "Ikeja",
      answer_hash: "ikeja",
      answer_salt: "fake",
      match_strategy: "normalized_exact",
      answer_key_rules: "Exact answer required.",
    }] as Record<string, unknown>[],
    dareAnswerSubmissions: [] as Record<string, unknown>[],
    resultClaims: [] as Record<string, unknown>[],
    witnessAttendances: [] as Record<string, unknown>[],
    dareVotes: [] as Record<string, unknown>[],
    darePromptAssignments: [] as Record<string, unknown>[],
    auditLogs: [] as Record<string, unknown>[],
    idempotencyRecords: [] as Record<string, unknown>[],
    ledgerEntries: [] as Record<string, unknown>[],
    trustEvents: [] as Record<string, unknown>[],
    notifications: [] as Record<string, unknown>[],
    kycVerifications: [] as Record<string, unknown>[],
    rateLimitDenials: new Set<string>(),
  };
}

function fakeClient(state = createFakeState()): SupabaseActionClient {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: state.user },
          error: null,
        }),
    },
    from<T>(table: string): SupabaseFilterBuilder<T> {
      return new FakeBuilder<T>(table, state);
    },
    rpc<T>(
      functionName: string,
      args: Record<string, unknown>,
    ): Promise<QueryResponse<T>> {
      if (functionName === "request_withdrawal") {
        return fakeRequestWithdrawalRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "claim_paystack_withdrawals") {
        return fakeClaimPaystackWithdrawalsRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "approve_withdrawal_admin_action") {
        return fakeApproveWithdrawalRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "reject_withdrawal_admin_action") {
        return fakeRejectWithdrawalRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "freeze_user_admin_action") {
        return fakeFreezeUserRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "get_user_deposit_totals_kobo") {
        return Promise.resolve({
          data: [{
            daily_total_kobo: 0,
            weekly_total_kobo: 0,
            monthly_total_kobo: 0,
          }] as T,
          error: null,
        });
      }

      if (functionName === "consume_action_rate_limit") {
        return fakeConsumeActionRateLimitRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "mark_notification_read_action") {
        return fakeMarkNotificationReadRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "mark_all_notifications_read_action") {
        return fakeMarkAllNotificationsReadRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "update_responsible_gaming_settings_action") {
        return fakeUpdateResponsibleGamingSettingsRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "self_exclude_action") {
        return fakeSelfExcludeRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "create_evidence_upload_action") {
        return fakeCreateEvidenceUploadRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "confirm_evidence_upload_action") {
        return fakeConfirmEvidenceUploadRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "create_dare_action") {
        return fakeCreateDareRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "accept_dare_action") {
        return fakeAcceptDareRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "cancel_dare_action") {
        return fakeCancelDareRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "forfeit_dare_action") {
        return fakeForfeitDareRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "ready_dare_action") {
        return fakeReadyDareRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "record_court_heartbeat_action") {
        return fakeCourtHeartbeatRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "get_current_court_question_action") {
        return fakeCurrentCourtQuestionRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "submit_dare_answer_action") {
        return fakeSubmitAnswerRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "submit_result_claim_action") {
        return fakeSubmitResultClaimRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "record_witness_attendance_action") {
        return fakeRecordWitnessAttendanceRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "submit_witness_vote_action") {
        return fakeSubmitWitnessVoteRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "complete_dare_action") {
        return fakeCompleteDareRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "settle_dare_action") {
        return fakeSettleDareRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "file_dispute_action") {
        return fakeFileDisputeRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "resolve_jury_case_admin_action") {
        return fakeResolveJuryCaseRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "assign_jury_case_action") {
        return fakeAssignJuryCaseRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "cast_jury_vote_action") {
        return fakeCastJuryVoteRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "submit_kyc_action") {
        return fakeSubmitKycRpc(state, args) as Promise<QueryResponse<T>>;
      }

      if (functionName === "get_latest_kyc_verification") {
        return fakeGetLatestKycVerificationRpc(state, args) as Promise<
          QueryResponse<T>
        >;
      }

      if (functionName === "decide_kyc_action") {
        return fakeDecideKycRpc(state, args) as Promise<QueryResponse<T>>;
      }

      return Promise.resolve({
        data: null as T,
        error: { message: "Unknown RPC" },
      });
    },
    storage: {
      from: (bucket: string) => ({
        createSignedUploadUrl: (path: string) =>
          Promise.resolve({
            data: {
              signedUrl: `https://storage.local/${bucket}/${path}`,
              path,
              token: "signed-upload-token",
            },
            error: null,
          }),
        download: (_path: string) =>
          Promise.resolve({
            data: new Blob(["uploaded evidence"]),
            error: null,
          }),
      }),
    },
  };
}

function fakeMarkNotificationReadRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const notification = state.notifications.find((row) =>
    row.id === args.p_notification_id && row.user_id === args.p_user_id
  );
  if (!notification) {
    return Promise.resolve({
      data: [],
      error: { message: "notification_not_found" },
    });
  }

  notification.is_read = true;
  notification.read_at = notification.read_at ?? "2026-05-21T00:05:00.000Z";
  return Promise.resolve({
    data: [{
      notification_id: notification.id,
      is_read: notification.is_read,
      read_at: notification.read_at,
    }],
    error: null,
  });
}

function fakeConsumeActionRateLimitRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const scope = String(args.p_scope);
  const allowed = !state.rateLimitDenials.has(scope);
  return Promise.resolve({
    data: [{
      allowed,
      limit_count: args.p_limit,
      remaining: allowed ? Number(args.p_limit) - 1 : 0,
      reset_at: "2026-05-21T01:00:00.000Z",
      retry_after_seconds: allowed ? 0 : 60,
    }],
    error: null,
  });
}

function fakeMarkAllNotificationsReadRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  let updated = 0;
  const readAt = "2026-05-21T00:05:00.000Z";
  for (const notification of state.notifications) {
    if (
      notification.user_id === args.p_user_id &&
      notification.is_read === false
    ) {
      notification.is_read = true;
      notification.read_at = readAt;
      updated += 1;
    }
  }

  return Promise.resolve({
    data: [{ updated_count: updated, read_at: readAt }],
    error: null,
  });
}

function fakeUpdateResponsibleGamingSettingsRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  if (state.profile.account_status !== "active") {
    return Promise.resolve({
      data: [],
      error: { message: "account_restricted" },
    });
  }

  const settings = state.responsibleGaming;
  const effectiveAt = "2026-05-22T00:05:00.000Z";
  applyLimitUpdate(
    settings,
    "daily_deposit_limit_kobo",
    "pending_daily_deposit_limit_kobo",
    args.p_daily_deposit_limit_kobo,
    effectiveAt,
  );
  applyLimitUpdate(
    settings,
    "weekly_deposit_limit_kobo",
    "pending_weekly_deposit_limit_kobo",
    args.p_weekly_deposit_limit_kobo,
    effectiveAt,
  );
  applyLimitUpdate(
    settings,
    "monthly_deposit_limit_kobo",
    "pending_monthly_deposit_limit_kobo",
    args.p_monthly_deposit_limit_kobo,
    effectiveAt,
  );
  applyLimitUpdate(
    settings,
    "session_max_minutes",
    "pending_session_max_minutes",
    args.p_session_max_minutes,
    effectiveAt,
  );
  applyLimitUpdate(
    settings,
    "max_stake_per_dare_kobo",
    "pending_max_stake_per_dare_kobo",
    args.p_max_stake_per_dare_kobo,
    effectiveAt,
  );

  const settingsRecord = settings as Record<string, unknown>;
  const hasPending = [
    "pending_daily_deposit_limit_kobo",
    "pending_weekly_deposit_limit_kobo",
    "pending_monthly_deposit_limit_kobo",
    "pending_session_max_minutes",
    "pending_max_stake_per_dare_kobo",
  ].some((key) => settingsRecord[key] !== null);
  settingsRecord.pending_limits_effective_at = hasPending ? effectiveAt : null;

  return Promise.resolve({
    data: [{
      user_id: settings.user_id,
      daily_deposit_limit_kobo: settings.daily_deposit_limit_kobo,
      weekly_deposit_limit_kobo: settings.weekly_deposit_limit_kobo,
      monthly_deposit_limit_kobo: settings.monthly_deposit_limit_kobo,
      session_max_minutes: settings.session_max_minutes,
      max_stake_per_dare_kobo: settings.max_stake_per_dare_kobo,
      pending_daily_deposit_limit_kobo:
        settings.pending_daily_deposit_limit_kobo,
      pending_weekly_deposit_limit_kobo:
        settings.pending_weekly_deposit_limit_kobo,
      pending_monthly_deposit_limit_kobo:
        settings.pending_monthly_deposit_limit_kobo,
      pending_session_max_minutes: settings.pending_session_max_minutes,
      pending_max_stake_per_dare_kobo: settings.pending_max_stake_per_dare_kobo,
      pending_limits_effective_at: settingsRecord.pending_limits_effective_at,
      self_excluded: settings.self_excluded,
      self_exclusion_until: settings.self_exclusion_until,
      cooling_off_until: settings.cooling_off_until,
    }],
    error: null,
  });
}

function applyLimitUpdate(
  settings: Record<string, unknown>,
  currentKey: string,
  pendingKey: string,
  value: unknown,
  _effectiveAt: string,
): void {
  if (value === null || value === undefined) return;
  const current = settings[currentKey] as number | null;
  const next = value as number;
  if (current === null || next <= current) {
    settings[currentKey] = next;
    settings[pendingKey] = null;
  } else {
    settings[pendingKey] = next;
  }
}

function fakeSelfExcludeRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  if (state.responsibleGaming.self_excluded === true) {
    return Promise.resolve({
      data: [],
      error: { message: "self_exclusion_active" },
    });
  }

  const until = "2026-06-20T00:05:00.000Z";
  const settings = state.responsibleGaming as Record<string, unknown>;
  const profile = state.profile as Record<string, unknown>;
  settings.self_excluded = true;
  settings.self_exclusion_until = until;
  settings.cooling_off_until = null;
  settings.pending_daily_deposit_limit_kobo = null;
  settings.pending_weekly_deposit_limit_kobo = null;
  settings.pending_monthly_deposit_limit_kobo = null;
  settings.pending_session_max_minutes = null;
  settings.pending_max_stake_per_dare_kobo = null;
  settings.pending_limits_effective_at = null;
  profile.account_status = "limited";
  profile.jury_opt_in = false;
  profile.jury_categories = [];

  let cancelled = 0;
  let forfeited = 0;
  let refunded = 0;

  for (const dare of state.dares) {
    if (
      dare.issuer_id === args.p_user_id &&
      (dare.status === "open" || dare.status === "targeted_pending")
    ) {
      dare.status = "cancelled";
      cancelled += 1;
      const hold = state.escrowHolds.find((row) =>
        row.dare_id === dare.id &&
        row.user_id === args.p_user_id &&
        row.status === "held"
      );
      if (hold) {
        hold.status = "refunded";
        refunded += hold.amount as number;
        state.ledgerEntries.push({
          id: `self-exclude-refund-${cancelled}`,
          wallet_account_id: hold.wallet_account_id,
          user_id: args.p_user_id,
          dare_id: dare.id,
          type: "escrow_release",
          direction: "credit",
          amount: hold.amount,
          currency: hold.currency,
          status: "posted",
          idempotency_key: `${args.p_ledger_idempotency_key}:cancel:${dare.id}`,
        });
      }
    }
  }

  for (const dare of state.dares) {
    if (
      (dare.issuer_id === args.p_user_id ||
        dare.challenger_id === args.p_user_id) &&
      ["accepted", "ready_check", "active", "awaiting_result"].includes(
        dare.status as string,
      ) &&
      dare.challenger_id
    ) {
      const winnerId = dare.issuer_id === args.p_user_id
        ? dare.challenger_id
        : dare.issuer_id;
      dare.status = "forfeited";
      dare.winner_id = winnerId;
      dare.completed_at = "2026-05-21T00:05:00.000Z";
      dare.dispute_deadline_at = "2026-05-21T00:05:00.000Z";
      const court = state.courtSessions.find((row) => row.dare_id === dare.id);
      if (court) court.phase = "forfeited";
      forfeited += 1;
    }
  }

  state.notifications.push({
    user_id: args.p_user_id,
    type: "system",
    title: "Self-exclusion active",
    body: "Your self-exclusion period is now active.",
    action: { type: "responsible_gaming" },
  });

  return Promise.resolve({
    data: [{
      user_id: args.p_user_id,
      self_excluded: settings.self_excluded,
      self_exclusion_until: settings.self_exclusion_until,
      account_status: profile.account_status,
      cancelled_dares: cancelled,
      forfeited_dares: forfeited,
      refunded_amount: refunded,
    }],
    error: null,
  });
}

function fakeCreateEvidenceUploadRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  if (
    args.p_user_id !== dare.issuer_id &&
    args.p_user_id !== dare.challenger_id
  ) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  const evidenceId = `e23e4567-e89b-42d3-a456-${
    String(state.evidenceObjects.length).padStart(12, "0")
  }`;
  const storagePath = `${args.p_dare_id}/${args.p_user_id}/${evidenceId}.png`;
  const evidence = {
    id: evidenceId,
    dare_id: args.p_dare_id,
    user_id: args.p_user_id,
    storage_bucket: "dare-evidence",
    storage_path: storagePath,
    media_type: args.p_mime_type,
    byte_size: args.p_file_size_bytes,
    status: "pending",
  };
  state.evidenceObjects.push(evidence);

  return Promise.resolve({
    data: [{
      evidence_object_id: evidence.id,
      dare_id: evidence.dare_id,
      user_id: evidence.user_id,
      storage_bucket: evidence.storage_bucket,
      storage_path: evidence.storage_path,
      media_type: evidence.media_type,
      byte_size: evidence.byte_size,
      status: evidence.status,
    }],
    error: null,
  });
}

function fakeConfirmEvidenceUploadRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  if (
    args.p_user_id !== dare.issuer_id &&
    args.p_user_id !== dare.challenger_id
  ) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  const evidence = state.evidenceObjects.find((row) =>
    row.id === args.p_evidence_object_id &&
    row.dare_id === args.p_dare_id &&
    row.user_id === args.p_user_id
  );
  if (!evidence) {
    return Promise.resolve({
      data: [],
      error: { message: "evidence_not_found" },
    });
  }

  const juryCase = state.juryCases.find((row) =>
    row.dare_id === args.p_dare_id &&
    ["filed", "accepted_for_review", "jury_assignment", "jury_voting"]
      .includes(row.status as string)
  );
  if (
    !juryCase &&
    !(dare.resolution_type === "evidence" &&
      ["active", "awaiting_result"].includes(dare.status as string))
  ) {
    return Promise.resolve({
      data: [],
      error: { message: "jury_case_not_found" },
    });
  }

  const side = args.p_user_id === dare.issuer_id ? "A" : "B";
  evidence.status = "uploaded";
  evidence.uploaded_at = "2026-05-21T00:05:00.000Z";
  evidence.content_hash = args.p_content_hash ?? null;
  if (juryCase && side === "A") {
    juryCase.evidence_a_id = evidence.id;
  } else if (juryCase) {
    juryCase.evidence_b_id = evidence.id;
  }

  return Promise.resolve({
    data: [{
      evidence_object_id: evidence.id,
      jury_case_id: juryCase?.id ?? null,
      dare_id: dare.id,
      side,
      status: evidence.status,
      uploaded_at: evidence.uploaded_at,
    }],
    error: null,
  });
}

class FakeBuilder<T> implements SupabaseFilterBuilder<T> {
  #updateValues: Record<string, unknown> | null = null;
  #filters = new Map<string, unknown>();

  constructor(
    private readonly table: string,
    private readonly state: ReturnType<typeof createFakeState>,
  ) {}

  select(_columns: string): SupabaseFilterBuilder<T> {
    return this;
  }

  insert(values: Record<string, unknown>): Promise<QueryResponse<null>> {
    if (this.table === "payment_transactions") {
      this.state.paymentTransactions.push({ ...values });
    }

    if (this.table === "audit_logs") {
      this.state.auditLogs.push({ ...values });
    }

    if (this.table === "idempotency_records") {
      this.state.idempotencyRecords.push({ ...values });
    }

    if (this.table === "ledger_entries") {
      this.state.ledgerEntries.push({ ...values });
    }

    if (this.table === "notifications") {
      this.state.notifications.push({ ...values });
    }

    if (this.table === "court_chat_messages") {
      this.state.courtChatMessages.push({ ...values });
    }

    return Promise.resolve({ data: null, error: null });
  }

  update(values: Record<string, unknown>): SupabaseFilterBuilder<T> {
    this.#updateValues = values;
    return this;
  }

  eq(column: string, value: unknown): SupabaseFilterBuilder<T> {
    this.#filters.set(column, value);
    return this;
  }

  maybeSingle(): Promise<QueryResponse<T | null>> {
    if (this.table === "profiles") {
      const data = [this.state.profile, ...this.state.jurorProfiles].find(
        (record) => matchesFilters(record, this.#filters),
      ) ?? this.state.profile;
      if (this.#updateValues) {
        Object.assign(data, this.#updateValues);
      }

      return Promise.resolve({
        data: data as T,
        error: null,
      });
    }

    if (this.table === "dares") {
      const data = this.state.dares.find((record) =>
        matchesFilters(record, this.#filters)
      );

      if (data && this.#updateValues) {
        Object.assign(data, this.#updateValues);
      }

      return Promise.resolve({
        data: data as T | undefined ?? null,
        error: null,
      });
    }

    if (this.table === "wallet_summary") {
      return Promise.resolve({
        data: this.state.wallet as T,
        error: null,
      });
    }

    if (this.table === "responsible_gaming_settings") {
      return Promise.resolve({
        data: this.state.responsibleGaming as T,
        error: null,
      });
    }

    if (this.table === "idempotency_records") {
      const data = this.state.idempotencyRecords.find((record) =>
        record.key_hash === this.#filters.get("key_hash")
      );
      return Promise.resolve({
        data: data as T | undefined ?? null,
        error: null,
      });
    }

    if (this.table === "payment_transactions") {
      const data = this.state.paymentTransactions.find((record) =>
        matchesFilters(record, this.#filters)
      );

      if (data && this.#updateValues) {
        Object.assign(data, this.#updateValues);
      }

      return Promise.resolve({
        data: data as T | undefined ?? null,
        error: null,
      });
    }

    if (this.table === "withdrawal_requests") {
      const data = this.state.withdrawalRequests.find((record) =>
        matchesFilters(record, this.#filters)
      );

      if (data && this.#updateValues) {
        Object.assign(data, this.#updateValues);
      }

      return Promise.resolve({
        data: data as T | undefined ?? null,
        error: null,
      });
    }

    if (this.table === "wallet_accounts") {
      const row = {
        id: this.state.wallet.wallet_account_id,
        user_id: this.state.wallet.user_id,
        currency: this.state.wallet.currency,
        status: this.state.wallet.account_status,
      };
      return Promise.resolve({
        data: matchesFilters(row, this.#filters) ? row as T : null,
        error: null,
      });
    }

    if (this.table === "ledger_entries") {
      const data = this.state.ledgerEntries.find((record) =>
        matchesFilters(record, this.#filters)
      );
      return Promise.resolve({
        data: data as T | undefined ?? null,
        error: null,
      });
    }

    if (this.table === "evidence_objects") {
      const data = this.state.evidenceObjects.find((record) =>
        matchesFilters(record, this.#filters)
      );
      return Promise.resolve({
        data: data as T | undefined ?? null,
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: null });
  }
}

function fakeCreateDareRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const ledgerKey = args.p_ledger_idempotency_key;
  const dareType = args.p_dare_type === "task" ? "task" : "skill";
  const fundingModel = dareType === "task" ? "darer_reward" : "two_sided_stake";
  const stakeAmount = dareType === "skill" ? Number(args.p_stake_amount) : 0;
  const rewardAmount = dareType === "task" ? Number(args.p_reward_amount) : 0;
  const escrowAmount = dareType === "task" ? rewardAmount : stakeAmount;
  const existingLedger = state.ledgerEntries.find((entry) =>
    entry.idempotency_key === ledgerKey
  );
  if (existingLedger) {
    const dare = state.dares.find((row) => row.id === existingLedger.dare_id)!;
    const escrow = state.escrowHolds.find((row) =>
      row.held_ledger_entry_id === existingLedger.id
    )!;
    return Promise.resolve({
      data: [createDareRpcRow(dare, escrow, existingLedger)],
      error: null,
    });
  }

  const maxStake = state.responsibleGaming.max_stake_per_dare_kobo;
  if (
    typeof maxStake === "number" &&
    escrowAmount > maxStake
  ) {
    return Promise.resolve({
      data: [],
      error: { message: "responsible_gaming_limit" },
    });
  }

  if (
    !Number.isFinite(escrowAmount) ||
    state.wallet.available_balance < escrowAmount
  ) {
    return Promise.resolve({
      data: [],
      error: { message: "insufficient_funds" },
    });
  }

  const dare = {
    id: "623e4567-e89b-12d3-a456-426614174000",
    issuer_id: args.p_issuer_id,
    challenger_id: null,
    title: args.p_title,
    status: "open",
    resolution_type: args.p_resolution_type ?? "answer_key",
    dare_type: dareType,
    funding_model: fundingModel,
    stake_amount: stakeAmount,
    reward_amount: rewardAmount,
    currency: args.p_currency,
    constitution_id: "823e4567-e89b-12d3-a456-426614174000",
  };
  const constitution = {
    id: dare.constitution_id,
    dare_id: dare.id,
    test: args.p_constitution_test,
    rules: args.p_constitution_rules,
  };
  const ledger = {
    id: "923e4567-e89b-12d3-a456-426614174000",
    wallet_account_id: state.wallet.wallet_account_id,
    user_id: args.p_issuer_id,
    dare_id: dare.id,
    type: "escrow_hold",
    direction: "debit",
    amount: escrowAmount,
    currency: args.p_currency,
    status: "posted",
    idempotency_key: ledgerKey,
    metadata: { role: "issuer", fundingModel },
  };
  const escrow = {
    id: "a23e4567-e89b-12d3-a456-426614174000",
    dare_id: dare.id,
    user_id: args.p_issuer_id,
    held_ledger_entry_id: ledger.id,
    amount: escrowAmount,
    currency: args.p_currency,
    status: "held",
  };

  state.dares.push(dare);
  state.dareConstitutions.push(constitution);
  state.ledgerEntries.push(ledger);
  state.escrowHolds.push(escrow);
  if (dare.resolution_type === "answer_key") {
    const prompt = {
      id: "10000000-0000-4000-9000-000000000000",
      dare_id: dare.id,
      created_by: args.p_issuer_id,
      prompt: args.p_constitution_test,
      answer_format: "short_text",
      response_options: null,
      position: 0,
    };
    state.darePrompts[0] = prompt;
    state.dareAnswerKeys[0] = {
      id: "10000000-0000-4000-9001-000000000000",
      dare_id: dare.id,
      prompt_id: prompt.id,
      answer_text: args.p_answer_key_text,
      answer_hash: normalizeAnswer(String(args.p_answer_key_text ?? "")),
      answer_salt: "fake",
      match_strategy: "normalized_exact",
      answer_key_rules: args.p_answer_key_rules ?? null,
    };
  }

  return Promise.resolve({
    data: [createDareRpcRow(dare, escrow, ledger)],
    error: null,
  });
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function fakeAcceptDareRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const ledgerKey = args.p_ledger_idempotency_key;
  const existingLedger = state.ledgerEntries.find((entry) =>
    entry.idempotency_key === ledgerKey
  );
  if (existingLedger) {
    const dare = state.dares.find((row) => row.id === existingLedger.dare_id)!;
    const court = state.courtSessions.find((row) => row.dare_id === dare.id)!;
    const escrow = state.escrowHolds.find((row) =>
      row.held_ledger_entry_id === existingLedger.id
    )!;
    return Promise.resolve({
      data: [acceptDareRpcRow(dare, court, escrow, existingLedger)],
      error: null,
    });
  }

  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  if (dare.status !== "open") {
    return Promise.resolve({
      data: [],
      error: { message: "dare_not_acceptable" },
    });
  }

  if (
    dare.dare_type !== "task" &&
    (typeof dare.stake_amount !== "number" ||
      state.wallet.available_balance < dare.stake_amount)
  ) {
    return Promise.resolve({
      data: [],
      error: { message: "insufficient_funds" },
    });
  }

  const isTask = dare.dare_type === "task";
  const ledger = isTask ? null : {
    id: "b23e4567-e89b-12d3-a456-426614174000",
    wallet_account_id: state.wallet.wallet_account_id,
    user_id: args.p_challenger_id,
    dare_id: dare.id,
    type: "escrow_hold",
    direction: "debit",
    amount: dare.stake_amount,
    currency: dare.currency,
    status: "posted",
    idempotency_key: ledgerKey,
    metadata: { role: "challenger" },
  };
  const escrow = isTask ? null : {
    id: "c23e4567-e89b-12d3-a456-426614174000",
    dare_id: dare.id,
    user_id: args.p_challenger_id,
    held_ledger_entry_id: ledger?.id,
    amount: dare.stake_amount,
    currency: dare.currency,
    status: "held",
  };
  const court = {
    id: "d23e4567-e89b-12d3-a456-426614174000",
    dare_id: dare.id,
    phase: "ready_check",
    player_a_ready: false,
    player_b_ready: false,
    score_a: 0,
    score_b: 0,
  };

  dare.status = "ready_check";
  dare.challenger_id = args.p_challenger_id;
  if (ledger) state.ledgerEntries.push(ledger);
  if (escrow) state.escrowHolds.push(escrow);
  state.courtSessions.push(court);

  return Promise.resolve({
    data: [acceptDareRpcRow(dare, court, escrow, ledger)],
    error: null,
  });
}

function createDareRpcRow(
  dare: Record<string, unknown>,
  escrow: Record<string, unknown>,
  ledger: Record<string, unknown>,
): Record<string, unknown> {
  return {
    dare_id: dare.id,
    constitution_id: dare.constitution_id,
    escrow_hold_id: escrow.id,
    ledger_entry_id: ledger.id,
    status: dare.status,
    dare_type: dare.dare_type ?? "skill",
    funding_model: dare.funding_model ?? "two_sided_stake",
    stake_amount: dare.stake_amount,
    reward_amount: dare.reward_amount ?? 0,
    escrow_amount: ledger.amount ?? dare.stake_amount,
    currency: dare.currency,
    challenger_id: dare.challenger_id,
  };
}

function acceptDareRpcRow(
  dare: Record<string, unknown>,
  court: Record<string, unknown>,
  escrow: Record<string, unknown> | null,
  ledger: Record<string, unknown> | null,
): Record<string, unknown> {
  return {
    dare_id: dare.id,
    court_session_id: court.id,
    escrow_hold_id: escrow?.id ?? null,
    ledger_entry_id: ledger?.id ?? null,
    status: dare.status,
    dare_type: dare.dare_type ?? "skill",
    funding_model: dare.funding_model ?? "two_sided_stake",
    stake_amount: dare.stake_amount,
    reward_amount: dare.reward_amount ?? 0,
    escrow_amount: ledger?.amount ?? 0,
    currency: dare.currency,
  };
}

function fakeCancelDareRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const ledgerKey = args.p_ledger_idempotency_key;
  const existingLedger = state.ledgerEntries.find((entry) =>
    entry.idempotency_key === ledgerKey
  );
  if (existingLedger) {
    const dare = state.dares.find((row) => row.id === existingLedger.dare_id)!;
    const escrow = state.escrowHolds.find((row) =>
      row.release_ledger_entry_id === existingLedger.id
    )!;
    return Promise.resolve({
      data: [cancelDareRpcRow(dare, escrow, existingLedger)],
      error: null,
    });
  }

  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  if (args.p_actor_user_id !== dare.issuer_id) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  if (dare.status !== "open" && dare.status !== "targeted_pending") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_dare_state" },
    });
  }

  const escrow = state.escrowHolds.find((row) =>
    row.dare_id === dare.id && row.user_id === dare.issuer_id &&
    row.status === "held"
  );
  if (!escrow) {
    return Promise.resolve({
      data: [],
      error: { message: "escrow_not_found" },
    });
  }

  const ledger = {
    id: "d23e4567-e89b-42d3-a456-426614174000",
    wallet_account_id: escrow.wallet_account_id,
    user_id: dare.issuer_id,
    dare_id: dare.id,
    type: "escrow_release",
    direction: "credit",
    amount: escrow.amount,
    currency: escrow.currency,
    status: "posted",
    idempotency_key: ledgerKey,
    metadata: { reason: "dare_cancelled" },
  };

  state.ledgerEntries.push(ledger);
  escrow.status = "refunded";
  escrow.release_ledger_entry_id = ledger.id;
  dare.status = "cancelled";

  return Promise.resolve({
    data: [cancelDareRpcRow(dare, escrow, ledger)],
    error: null,
  });
}

function cancelDareRpcRow(
  dare: Record<string, unknown>,
  escrow: Record<string, unknown>,
  ledger: Record<string, unknown>,
): Record<string, unknown> {
  return {
    dare_id: dare.id,
    status: dare.status,
    escrow_hold_id: escrow.id,
    release_ledger_entry_id: ledger.id,
    refunded_amount: ledger.amount,
    currency: ledger.currency,
  };
}

function fakeForfeitDareRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  if (
    args.p_actor_user_id !== dare.issuer_id &&
    args.p_actor_user_id !== dare.challenger_id
  ) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  if (dare.status !== "active") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_dare_state" },
    });
  }

  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (!court) {
    return Promise.resolve({ data: [], error: { message: "court_not_found" } });
  }

  if (court.phase !== "active") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_court_state" },
    });
  }

  const winnerId = args.p_actor_user_id === dare.issuer_id
    ? dare.challenger_id
    : dare.issuer_id;
  dare.status = "forfeited";
  dare.winner_id = winnerId;
  dare.completed_at = "2026-05-21T00:02:00.000Z";
  dare.dispute_deadline_at = "2026-05-21T00:02:00.000Z";
  court.phase = "forfeited";
  state.profile.trust_score = Math.max(0, state.profile.trust_score - 10);
  state.trustEvents.push({
    user_id: args.p_actor_user_id,
    event_type: "dare_forfeit",
    delta: -10,
    resulting_score: state.profile.trust_score,
    dare_id: dare.id,
  });

  return fakeSettleDareRpc(state, args).then((result) => {
    if (result.error) return result;

    return {
      data: [{
        dare_id: dare.id,
        status: dare.status,
        forfeiter_id: args.p_actor_user_id,
        winner_id: dare.winner_id,
        court_phase: court.phase,
        completed_at: dare.completed_at,
      }],
      error: null,
    };
  });
}

function fakeReadyDareRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (!court) {
    return Promise.resolve({ data: [], error: { message: "court_not_found" } });
  }

  if (
    args.p_user_id !== dare.issuer_id && args.p_user_id !== dare.challenger_id
  ) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  if (args.p_user_id === dare.issuer_id) {
    court.player_a_ready = true;
  } else {
    court.player_b_ready = true;
  }

  if (
    court.player_a_ready &&
    court.player_b_ready &&
    court.phase === "ready_check"
  ) {
    court.phase = "active";
    court.server_start_time = "2026-05-21T00:00:00.000Z";
    court.server_end_time = "2026-05-21T00:01:00.000Z";
    dare.status = "active";
  }

  return Promise.resolve({
    data: [{
      dare_id: dare.id,
      court_session_id: court.id,
      dare_status: dare.status,
      phase: court.phase,
      player_a_ready: court.player_a_ready,
      player_b_ready: court.player_b_ready,
      server_start_time: court.server_start_time,
      server_end_time: court.server_end_time,
      assigned_rounds: state.darePrompts.filter((prompt) =>
        prompt.dare_id === dare.id
      ).length,
    }],
    error: null,
  });
}

function fakeCourtHeartbeatRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (!court) {
    return Promise.resolve({ data: [], error: { message: "court_not_found" } });
  }

  if (dare.status !== "active") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_dare_state" },
    });
  }

  if (court.phase !== "active") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_court_state" },
    });
  }

  const role = args.p_user_id === dare.issuer_id
    ? "A"
    : args.p_user_id === dare.challenger_id
    ? "B"
    : null;
  if (!role) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  const now = "2026-05-21T00:03:00.000Z";
  const reconnectDeadline = "2026-05-21T00:04:00.000Z";
  if (role === "A" && court.player_a_heartbeat_at) {
    return Promise.resolve({
      data: [],
      error: { message: "heartbeat_rate_limited" },
    });
  }

  if (role === "B" && court.player_b_heartbeat_at) {
    return Promise.resolve({
      data: [],
      error: { message: "heartbeat_rate_limited" },
    });
  }

  if (role === "A") {
    court.player_a_heartbeat_at = now;
  } else {
    court.player_b_heartbeat_at = now;
  }
  court.reconnect_deadline = reconnectDeadline;

  return Promise.resolve({
    data: [{
      dare_id: dare.id,
      court_session_id: court.id,
      phase: court.phase,
      player_role: role,
      player_a_heartbeat_at: court.player_a_heartbeat_at ?? null,
      player_b_heartbeat_at: court.player_b_heartbeat_at ?? null,
      reconnect_deadline: court.reconnect_deadline,
    }],
    error: null,
  });
}

function fakeSubmitAnswerRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (!court) {
    return Promise.resolve({ data: [], error: { message: "court_not_found" } });
  }

  if (dare.status !== "active" || court.phase !== "active") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_court_state" },
    });
  }

  if (
    args.p_user_id !== dare.issuer_id && args.p_user_id !== dare.challenger_id
  ) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  const prompt = state.darePrompts.find((row) =>
    row.dare_id === dare.id && row.id === args.p_prompt_id
  );
  if (!prompt) {
    return Promise.resolve({
      data: [],
      error: { message: "question_not_assigned" },
    });
  }

  const existing = state.dareAnswerSubmissions.find((answer) =>
    answer.dare_id === dare.id &&
    answer.user_id === args.p_user_id &&
    answer.prompt_id === args.p_prompt_id
  );
  if (existing) {
    return Promise.resolve({
      data: [],
      error: { message: "answer_already_submitted" },
    });
  }

  const answerKey = state.dareAnswerKeys.find((row) =>
    row.dare_id === dare.id && row.prompt_id === args.p_prompt_id
  );
  if (!answerKey) {
    return Promise.resolve({
      data: [],
      error: { message: "question_not_found" },
    });
  }

  const correct = normalizeAnswer(String(args.p_answer_text ?? "")) ===
    answerKey.answer_hash;
  if (correct && args.p_user_id === dare.issuer_id) {
    court.score_a = (court.score_a as number) + 1;
  } else if (correct) {
    court.score_b = (court.score_b as number) + 1;
  }

  const answer = {
    id: "f23e4567-e89b-12d3-a456-426614174000",
    dare_id: dare.id,
    user_id: args.p_user_id,
    prompt_id: args.p_prompt_id,
    answer_text: args.p_answer_text,
    answer_hash: normalizeAnswer(String(args.p_answer_text ?? "")),
    round_index: prompt.position,
    selected_option: null,
    correct,
    response_ms: null,
  };
  state.dareAnswerSubmissions.push(answer);

  return Promise.resolve({
    data: [{
      answer_id: answer.id,
      dare_id: dare.id,
      question_id: answer.prompt_id,
      round_index: answer.round_index,
      selected_option: answer.selected_option,
      correct: answer.correct,
      response_ms: answer.response_ms,
      score_a: court.score_a,
      score_b: court.score_b,
      phase: court.phase,
    }],
    error: null,
  });
}

function addSeconds(isoTimestamp: string, seconds: number): string {
  return new Date(Date.parse(isoTimestamp) + seconds * 1000).toISOString();
}

function fakeRecordWitnessAttendanceRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }
  if (dare.resolution_type !== "witnessed") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_resolution_type" },
    });
  }
  if (
    args.p_user_id === dare.issuer_id || args.p_user_id === dare.challenger_id
  ) {
    return Promise.resolve({
      data: [],
      error: { message: "participant_cannot_witness_vote" },
    });
  }
  if (!["active", "awaiting_result"].includes(dare.status as string)) {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_dare_state" },
    });
  }

  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (!court) {
    return Promise.resolve({ data: [], error: { message: "court_not_found" } });
  }
  if (!["active", "awaiting_result"].includes(court.phase as string)) {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_court_phase" },
    });
  }

  let attendance = state.witnessAttendances.find((row) =>
    row.dare_id === dare.id && row.witness_user_id === args.p_user_id
  );
  if (!attendance) {
    attendance = {
      id: `e23e4567-e89b-42d3-a456-${
        String(state.witnessAttendances.length).padStart(12, "0")
      }`,
      dare_id: dare.id,
      court_session_id: court.id,
      witness_user_id: args.p_user_id,
      joined_at: "2026-05-21T00:03:00.000Z",
      last_seen_at: "2026-05-21T00:03:00.000Z",
      status: "present",
    };
    state.witnessAttendances.push(attendance);
  } else {
    attendance.court_session_id = court.id;
    attendance.last_seen_at = "2026-05-21T00:03:00.000Z";
    attendance.status = "present";
  }

  const voteEligibleAt = addSeconds(String(attendance.joined_at), 15);
  return Promise.resolve({
    data: [{
      attendance_id: attendance.id,
      dare_id: dare.id,
      user_id: args.p_user_id,
      joined_at: attendance.joined_at,
      last_seen_at: attendance.last_seen_at,
      vote_eligible_at: voteEligibleAt,
      eligible_to_vote: Date.parse(String(attendance.joined_at)) <=
        Date.parse("2026-05-21T00:02:45.000Z"),
    }],
    error: null,
  });
}

function fakeSubmitWitnessVoteRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }
  if (dare.resolution_type !== "witnessed") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_resolution_type" },
    });
  }
  if (
    args.p_user_id === dare.issuer_id || args.p_user_id === dare.challenger_id
  ) {
    return Promise.resolve({
      data: [],
      error: { message: "participant_cannot_witness_vote" },
    });
  }
  if (!["active", "awaiting_result"].includes(dare.status as string)) {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_dare_state" },
    });
  }

  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (!court) {
    return Promise.resolve({ data: [], error: { message: "court_not_found" } });
  }
  if (!["active", "awaiting_result"].includes(court.phase as string)) {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_court_phase" },
    });
  }

  const attendance = state.witnessAttendances.find((row) =>
    row.dare_id === dare.id &&
    row.court_session_id === court.id &&
    row.witness_user_id === args.p_user_id &&
    row.status === "present"
  );
  const hasEligibleAttendance = attendance &&
    Date.parse(String(attendance.joined_at)) <=
      Date.parse("2026-05-21T00:02:45.000Z") &&
    Date.parse(String(attendance.last_seen_at)) >=
      Date.parse("2026-05-21T00:01:30.000Z");
  if (!hasEligibleAttendance) {
    return Promise.resolve({
      data: [],
      error: { message: "witness_attendance_required" },
    });
  }

  if (
    state.dareVotes.some((row) =>
      row.dare_id === dare.id && row.voter_id === args.p_user_id
    )
  ) {
    return Promise.resolve({
      data: [],
      error: { message: "witness_vote_already_submitted" },
    });
  }

  const vote = String(args.p_vote);
  if (!["A", "B"].includes(vote)) {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_witness_vote" },
    });
  }

  const voteRow = {
    id: `e33e4567-e89b-42d3-a456-${
      String(state.dareVotes.length).padStart(12, "0")
    }`,
    dare_id: dare.id,
    voter_id: args.p_user_id,
    vote,
  };
  state.dareVotes.push(voteRow);
  court.votes_a = Number(court.votes_a ?? 0) + (vote === "A" ? 1 : 0);
  court.votes_b = Number(court.votes_b ?? 0) + (vote === "B" ? 1 : 0);
  if (court.phase === "active") court.phase = "awaiting_result";
  if (dare.status === "active") dare.status = "awaiting_result";

  return Promise.resolve({
    data: [{
      vote_id: voteRow.id,
      dare_id: dare.id,
      voter_id: args.p_user_id,
      vote,
      votes_a: court.votes_a,
      votes_b: court.votes_b,
      phase: court.phase,
    }],
    error: null,
  });
}

function fakeSubmitResultClaimRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  if (
    args.p_user_id !== dare.issuer_id && args.p_user_id !== dare.challenger_id
  ) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  if (!["witnessed", "evidence"].includes(dare.resolution_type as string)) {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_resolution_type" },
    });
  }

  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (!court) {
    return Promise.resolve({ data: [], error: { message: "court_not_found" } });
  }

  if (
    !["active", "awaiting_result"].includes(dare.status as string) ||
    !["active", "awaiting_result"].includes(court.phase as string)
  ) {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_dare_state" },
    });
  }

  const outcome = String(args.p_claimed_outcome);
  const expectedWinnerId = outcome === "issuer_won"
    ? dare.issuer_id
    : outcome === "challenger_won" || outcome === "performer_completed"
    ? dare.challenger_id
    : null;
  if (
    args.p_claimed_winner_id && args.p_claimed_winner_id !== expectedWinnerId
  ) {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_claimed_winner" },
    });
  }

  const evidenceObjectIds = Array.isArray(args.p_evidence_object_ids)
    ? args.p_evidence_object_ids as string[]
    : [];
  if (dare.resolution_type === "evidence" && evidenceObjectIds.length === 0) {
    return Promise.resolve({
      data: [],
      error: { message: "evidence_required" },
    });
  }

  if (
    evidenceObjectIds.some((id) =>
      !state.evidenceObjects.some((evidence) =>
        evidence.id === id &&
        evidence.dare_id === dare.id &&
        evidence.user_id === args.p_user_id &&
        ["uploaded", "accepted"].includes(evidence.status as string)
      )
    )
  ) {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_evidence_state" },
    });
  }

  const existingClaim = state.resultClaims.find((row) =>
    row.dare_id === dare.id && row.user_id === args.p_user_id
  );
  if (existingClaim) {
    return Promise.resolve({
      data: [],
      error: { message: "result_claim_already_submitted" },
    });
  }
  const claim = {
    id: `f23e4567-e89b-42d3-a456-${
      String(state.resultClaims.length).padStart(12, "0")
    }`,
    dare_id: dare.id,
    user_id: args.p_user_id,
    claimed_outcome: outcome,
    claimed_winner_id: expectedWinnerId,
    rationale: args.p_rationale ?? null,
    evidence_object_ids: evidenceObjectIds,
  };
  state.resultClaims.push(claim);

  if (dare.status === "active") dare.status = "awaiting_result";
  if (court.phase === "active") court.phase = "awaiting_result";

  const otherClaim = state.resultClaims.find((row) =>
    row.dare_id === dare.id && row.user_id !== args.p_user_id
  );
  let claimState = "pending";
  let agreedWinnerId: unknown = null;
  if (otherClaim) {
    if (
      otherClaim.claimed_outcome === outcome &&
      otherClaim.claimed_winner_id === expectedWinnerId &&
      outcome !== "dispute"
    ) {
      dare.status = "completed";
      dare.winner_id = expectedWinnerId;
      dare.completed_at = "2026-05-21T00:02:00.000Z";
      dare.dispute_deadline_at = "2026-05-21T00:17:00.000Z";
      court.phase = "completed";
      claimState = "agreed";
      agreedWinnerId = expectedWinnerId;
    } else if (
      otherClaim.claimed_outcome === "dispute" || outcome === "dispute"
    ) {
      claimState = "dispute_requested";
      openFakeResultDispute(state, dare, court, args.p_user_id as string);
    } else {
      claimState = "conflicted";
      openFakeResultDispute(state, dare, court, args.p_user_id as string);
    }
  } else if (outcome === "dispute") {
    claimState = "dispute_requested";
    openFakeResultDispute(state, dare, court, args.p_user_id as string);
  }

  return Promise.resolve({
    data: [{
      claim_id: claim.id,
      dare_id: dare.id,
      user_id: args.p_user_id,
      resolution_type: dare.resolution_type,
      claimed_outcome: outcome,
      claimed_winner_id: expectedWinnerId,
      claim_state: claimState,
      dare_status: dare.status,
      court_phase: court.phase,
      agreed_winner_id: agreedWinnerId,
      claims_count: state.resultClaims.filter((row) => row.dare_id === dare.id)
        .length,
    }],
    error: null,
  });
}

function openFakeResultDispute(
  state: ReturnType<typeof createFakeState>,
  dare: Record<string, unknown>,
  court: Record<string, unknown>,
  openedByUserId: string,
): void {
  if (!state.juryCases.some((row) => row.dare_id === dare.id)) {
    state.juryCases.push({
      id: `b23e4567-e89b-42d3-a456-${
        String(state.juryCases.length).padStart(12, "0")
      }`,
      dare_id: dare.id,
      opened_by_user_id: openedByUserId,
      status: "filed",
      reason: "Result claims require jury review.",
      evidence_a_id: null,
      evidence_b_id: null,
    });
  }
  dare.status = "dispute_pending";
  court.phase = "disputed";
  for (const hold of state.escrowHolds) {
    if (hold.dare_id === dare.id && hold.status === "held") {
      hold.hold_reason = "dispute_pending";
    }
  }
}

function fakeCurrentCourtQuestionRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  if (
    args.p_user_id !== dare.issuer_id && args.p_user_id !== dare.challenger_id
  ) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (!court) {
    return Promise.resolve({ data: [], error: { message: "court_not_found" } });
  }

  if (dare.status !== "active" || court.phase !== "active") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_court_state" },
    });
  }

  const answered = state.dareAnswerSubmissions.filter((answer) =>
    answer.dare_id === dare.id && answer.user_id === args.p_user_id
  );
  const prompt = state.darePrompts
    .filter((row) => row.dare_id === dare.id)
    .sort((a, b) => Number(a.position) - Number(b.position))
    .find((row) => !answered.some((answer) => answer.prompt_id === row.id));

  if (!prompt) {
    return Promise.resolve({
      data: [],
      error: { message: "no_question_available" },
    });
  }

  return Promise.resolve({
    data: [{
      answered_rounds: answered.length,
      court_session_id: court.id,
      dare_id: dare.id,
      options: [],
      phase: court.phase,
      prompt: prompt.prompt,
      question_id: prompt.id,
      round_index: prompt.position,
      score_a: court.score_a,
      score_b: court.score_b,
      server_end_time: court.server_end_time,
      total_rounds: state.darePrompts.filter((row) =>
        row.dare_id === dare.id
      ).length,
    }],
    error: null,
  });
}

function fakeCompleteDareRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  if (
    args.p_actor_user_id !== dare.issuer_id &&
    args.p_actor_user_id !== dare.challenger_id &&
    !state.profile.is_admin
  ) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (!court) {
    return Promise.resolve({ data: [], error: { message: "court_not_found" } });
  }

  const scoreA =
    state.dareAnswerSubmissions.filter((answer) =>
      answer.dare_id === dare.id &&
      answer.user_id === dare.issuer_id &&
      answer.correct === true
    ).length;
  const scoreB =
    state.dareAnswerSubmissions.filter((answer) =>
      answer.dare_id === dare.id &&
      answer.user_id === dare.challenger_id &&
      answer.correct === true
    ).length;
  const winnerId = dare.dare_type === "task"
    ? (scoreB > 0 ? dare.challenger_id : null)
    : scoreA > scoreB
    ? dare.issuer_id
    : scoreB > scoreA
    ? dare.challenger_id
    : null;

  dare.status = "completed";
  dare.winner_id = winnerId;
  dare.completed_at = "2026-05-21T00:02:00.000Z";
  dare.dispute_deadline_at = "2026-05-21T00:12:00.000Z";
  court.phase = "completed";
  court.score_a = scoreA;
  court.score_b = scoreB;

  return Promise.resolve({
    data: [{
      dare_id: dare.id,
      status: dare.status,
      winner_id: dare.winner_id,
      score_a: scoreA,
      score_b: scoreB,
      phase: court.phase,
      completed_at: dare.completed_at,
      dispute_deadline_at: dare.dispute_deadline_at,
    }],
    error: null,
  });
}

function fakeSettleDareRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  if (
    args.p_actor_user_id !== dare.issuer_id &&
    args.p_actor_user_id !== dare.challenger_id &&
    !state.profile.is_admin
  ) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  if (dare.status === "settled") {
    const payoutAmount = state.ledgerEntries
      .filter((entry) => entry.dare_id === dare.id && entry.type === "payout")
      .reduce((sum, entry) => sum + (entry.amount as number), 0);
    return Promise.resolve({
      data: [settleDareRpcRow(dare, payoutAmount, 0, 0)],
      error: null,
    });
  }

  if (dare.status !== "completed" && dare.status !== "forfeited") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_dare_state" },
    });
  }

  const held = state.escrowHolds.filter((hold) =>
    hold.dare_id === dare.id && hold.status === "held"
  );
  const totalHeld = held.reduce(
    (sum, hold) => sum + (hold.amount as number),
    0,
  );
  const payout = {
    id: "aa3e4567-e89b-12d3-a456-426614174000",
    wallet_account_id: state.wallet.wallet_account_id,
    user_id: dare.winner_id,
    dare_id: dare.id,
    type: "payout",
    direction: "credit",
    amount: totalHeld,
    currency: dare.currency,
    status: "posted",
    idempotency_key: `settle:${dare.id}:payout`,
  };
  state.ledgerEntries.push(payout);
  for (const hold of held) {
    hold.status = "released";
    hold.release_ledger_entry_id = payout.id;
  }
  dare.status = "settled";
  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (court) court.phase = "completed";
  const winnerIsCurrentUser = dare.winner_id === state.profile.id;
  const loserId = dare.winner_id === dare.issuer_id
    ? dare.challenger_id
    : dare.issuer_id;
  if (winnerIsCurrentUser) {
    state.profile.wins = (state.profile.wins as number) + 1;
    state.profile.trust_score = Math.min(
      1000,
      (state.profile.trust_score as number) + 10,
    );
  } else if (loserId === state.profile.id) {
    state.profile.losses = (state.profile.losses as number) + 1;
    state.profile.trust_score = Math.max(
      0,
      (state.profile.trust_score as number) - 5,
    );
  }
  state.trustEvents.push(
    {
      user_id: dare.winner_id,
      event_type: "dare_win",
      delta: 10,
      resulting_score: winnerIsCurrentUser ? state.profile.trust_score : 130,
      dare_id: dare.id,
    },
    {
      user_id: loserId,
      event_type: "dare_loss",
      delta: -5,
      resulting_score: loserId === state.profile.id
        ? state.profile.trust_score
        : 115,
      dare_id: dare.id,
    },
  );

  return Promise.resolve({
    data: [settleDareRpcRow(dare, totalHeld, 0, 1)],
    error: null,
  });
}

function settleDareRpcRow(
  dare: Record<string, unknown>,
  payoutAmount: number,
  refundedAmount: number,
  created: number,
): Record<string, unknown> {
  return {
    dare_id: dare.id,
    status: dare.status,
    winner_id: dare.winner_id,
    payout_amount: payoutAmount,
    refunded_amount: refundedAmount,
    ledger_entries_created: created,
  };
}

function fakeFileDisputeRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const dare = state.dares.find((row) => row.id === args.p_dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (!court) {
    return Promise.resolve({ data: [], error: { message: "court_not_found" } });
  }

  if (
    args.p_user_id !== dare.issuer_id && args.p_user_id !== dare.challenger_id
  ) {
    return Promise.resolve({ data: [], error: { message: "not_participant" } });
  }

  if (dare.status !== "completed") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_dare_state" },
    });
  }

  if (state.juryCases.some((row) => row.dare_id === dare.id)) {
    return Promise.resolve({
      data: [],
      error: { message: "duplicate_dispute" },
    });
  }

  const evidenceIds = args.p_evidence_object_ids as string[];
  const evidenceId = evidenceIds[0] ?? null;
  const juryCase = {
    id: "b23e4567-e89b-12d3-a456-426614174000",
    dare_id: dare.id,
    opened_by_user_id: args.p_user_id,
    status: "filed",
    reason: `${args.p_reason}\n\n${args.p_summary}`,
    verdict: null,
    evidence_a_id: args.p_user_id === dare.issuer_id ? evidenceId : null,
    evidence_b_id: args.p_user_id === dare.challenger_id ? evidenceId : null,
  };

  state.juryCases.push(juryCase);
  dare.status = "dispute_pending";
  court.phase = "disputed";
  for (const hold of state.escrowHolds) {
    if (hold.dare_id === dare.id && hold.status === "held") {
      hold.hold_reason = "dispute_pending";
    }
  }

  return Promise.resolve({
    data: [{
      jury_case_id: juryCase.id,
      dare_id: dare.id,
      status: juryCase.status,
      dare_status: dare.status,
      court_phase: court.phase,
      opponent_user_id: args.p_user_id === dare.issuer_id
        ? dare.challenger_id
        : dare.issuer_id,
      evidence_a_id: juryCase.evidence_a_id,
      evidence_b_id: juryCase.evidence_b_id,
    }],
    error: null,
  });
}

function fakeResolveJuryCaseRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  if (!state.profile.is_admin) {
    return Promise.resolve({
      data: [],
      error: { message: "admin_required" },
    });
  }

  const juryCase = state.juryCases.find((row) =>
    row.id === args.p_jury_case_id
  );
  if (!juryCase) {
    return Promise.resolve({
      data: [],
      error: { message: "jury_case_not_found" },
    });
  }

  const dare = state.dares.find((row) => row.id === juryCase.dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  const court = state.courtSessions.find((row) => row.dare_id === dare.id);
  if (!court) {
    return Promise.resolve({ data: [], error: { message: "court_not_found" } });
  }

  const winnerId = args.p_verdict === "A"
    ? dare.issuer_id
    : args.p_verdict === "B"
    ? dare.challenger_id
    : null;

  juryCase.status = "settlement_pending";
  juryCase.verdict = args.p_verdict;
  dare.status = "completed";
  dare.winner_id = winnerId;
  dare.dispute_deadline_at = "2026-05-21T00:00:00.000Z";
  court.phase = "completed";

  return Promise.resolve({
    data: [{
      jury_case_id: juryCase.id,
      dare_id: dare.id,
      status: juryCase.status,
      verdict: juryCase.verdict,
      dare_status: dare.status,
      winner_id: dare.winner_id,
      court_phase: court.phase,
    }],
    error: null,
  });
}

function fakeAssignJuryCaseRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  if (!state.profile.is_admin) {
    return Promise.resolve({
      data: [],
      error: { message: "admin_required" },
    });
  }

  const juryCase = state.juryCases.find((row) =>
    row.id === args.p_jury_case_id
  );
  if (!juryCase) {
    return Promise.resolve({
      data: [],
      error: { message: "jury_case_not_found" },
    });
  }

  const dare = state.dares.find((row) => row.id === juryCase.dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  const votesNeeded = juryCase.votes_needed as number;
  const count = (args.p_assignment_count as number | null) ?? votesNeeded;
  const existingJurorIds = new Set(
    state.juryAssignments
      .filter((assignment) => assignment.jury_case_id === juryCase.id)
      .map((assignment) => assignment.juror_id),
  );
  const eligible = state.jurorProfiles.filter((profile) =>
    profile.jury_opt_in === true &&
    profile.account_status === "active" &&
    profile.risk_status === "normal" &&
    (profile.trust_score as number) >= 500 &&
    (profile.completed_dares as number) >= 10 &&
    profile.id !== dare.issuer_id &&
    profile.id !== dare.challenger_id &&
    !existingJurorIds.has(profile.id)
  );

  const needed = count - existingJurorIds.size;
  if (eligible.length < needed) {
    return Promise.resolve({
      data: [],
      error: { message: "jury_pool_insufficient" },
    });
  }

  const dueAt = "2099-05-21T00:00:00.000Z";
  for (const [index, juror] of eligible.slice(0, needed).entries()) {
    const assignment = {
      id: `c23e4567-e89b-42d3-a456-${String(index).padStart(12, "0")}`,
      jury_case_id: juryCase.id,
      juror_id: juror.id,
      status: "assigned",
      blind_side_mapping: { A: "issuer", B: "challenger" },
      due_at: dueAt,
    };
    state.juryAssignments.push(assignment);
    state.notifications.push({
      user_id: juror.id,
      type: "jury_invite",
      title: "Jury case assigned",
      body: "A dispute case is ready for your review.",
      action: { type: "jury_case", juryCaseId: juryCase.id, dareId: dare.id },
    });
  }

  juryCase.status = "jury_voting";
  dare.status = "jury_open";

  return Promise.resolve({
    data: [{
      jury_case_id: juryCase.id,
      dare_id: dare.id,
      status: juryCase.status,
      dare_status: dare.status,
      assigned_count: state.juryAssignments.filter((assignment) =>
        assignment.jury_case_id === juryCase.id
      ).length,
      votes_needed: votesNeeded,
      due_at: dueAt,
    }],
    error: null,
  });
}

function fakeCastJuryVoteRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const juryCase = state.juryCases.find((row) =>
    row.id === args.p_jury_case_id
  );
  if (!juryCase) {
    return Promise.resolve({
      data: [],
      error: { message: "jury_case_not_found" },
    });
  }

  const assignment = state.juryAssignments.find((row) =>
    row.jury_case_id === juryCase.id && row.juror_id === args.p_juror_id
  );
  if (!assignment) {
    return Promise.resolve({
      data: [],
      error: { message: "jury_assignment_not_found" },
    });
  }

  if (assignment.status !== "assigned" && assignment.status !== "claimed") {
    return Promise.resolve({
      data: [],
      error: { message: "jury_vote_already_submitted" },
    });
  }

  const dare = state.dares.find((row) => row.id === juryCase.dare_id);
  if (!dare) {
    return Promise.resolve({ data: [], error: { message: "dare_not_found" } });
  }

  const vote = {
    id: `e23e4567-e89b-42d3-a456-${
      String(state.juryVotes.length).padStart(12, "0")
    }`,
    jury_case_id: juryCase.id,
    juror_id: args.p_juror_id,
    vote: args.p_vote,
    rationale: args.p_rationale,
  };
  state.juryVotes.push(vote);
  assignment.status = "completed";
  assignment.completed_at = "2026-05-21T00:00:00.000Z";
  const jurorProfile = state.jurorProfiles.find((row) =>
    row.id === args.p_juror_id
  );
  if (jurorProfile) {
    jurorProfile.trust_score = Math.min(
      1000,
      (jurorProfile.trust_score as number) + 2,
    );
    state.trustEvents.push({
      user_id: args.p_juror_id,
      event_type: "jury_vote_completed",
      delta: 2,
      resulting_score: jurorProfile.trust_score,
      jury_case_id: juryCase.id,
    });
  }

  const votesForCase = state.juryVotes.filter((row) =>
    row.jury_case_id === juryCase.id
  );
  if (votesForCase.length >= (juryCase.votes_needed as number)) {
    const aCount = votesForCase.filter((row) => row.vote === "A").length;
    const bCount = votesForCase.filter((row) => row.vote === "B").length;
    const voidCount = votesForCase.filter((row) => row.vote === "void").length;
    const escalateCount = votesForCase.filter((row) =>
      row.vote === "escalate"
    ).length;
    const maxDecision = Math.max(aCount, bCount, voidCount);
    const verdict = escalateCount >= maxDecision
      ? "escalate"
      : aCount > bCount && aCount > voidCount
      ? "A"
      : bCount > aCount && bCount > voidCount
      ? "B"
      : voidCount > aCount && voidCount > bCount
      ? "void"
      : "escalate";
    juryCase.verdict = verdict;

    if (verdict === "escalate") {
      juryCase.status = "escalated";
      dare.status = "dispute_pending";
    } else {
      juryCase.status = "settlement_pending";
      dare.status = "completed";
      dare.winner_id = verdict === "B"
        ? dare.challenger_id
        : verdict === "A"
        ? dare.issuer_id
        : null;
      const court = state.courtSessions.find((row) => row.dare_id === dare.id);
      if (court) court.phase = "completed";
    }
  }

  return Promise.resolve({
    data: [{
      jury_case_id: juryCase.id,
      assignment_id: assignment.id,
      vote_id: vote.id,
      status: juryCase.status,
      verdict: juryCase.verdict ?? null,
      dare_id: dare.id,
      dare_status: dare.status,
      winner_id: dare.winner_id ?? null,
      votes_cast: votesForCase.length,
      votes_needed: juryCase.votes_needed,
    }],
    error: null,
  });
}

function fakeRequestWithdrawalRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const ledgerKey = args.p_ledger_idempotency_key;
  const existingLedger = state.ledgerEntries.find((entry) =>
    entry.idempotency_key === ledgerKey
  );
  if (existingLedger) {
    const existingWithdrawal = state.withdrawalRequests.find((request) =>
      request.ledger_entry_id === existingLedger.id
    );
    return Promise.resolve({
      data: [{
        withdrawal_request_id: existingWithdrawal?.id,
        ledger_entry_id: existingLedger.id,
        status: existingWithdrawal?.status,
        amount: existingWithdrawal?.amount,
        currency: existingWithdrawal?.currency,
      }],
      error: null,
    });
  }

  const withdrawable = state.wallet.available_balance -
    state.wallet.pending_withdrawal_balance;
  if (typeof args.p_amount !== "number" || withdrawable < args.p_amount) {
    return Promise.resolve({
      data: [],
      error: { message: "insufficient_funds" },
    });
  }

  const ledgerEntry = {
    id: "423e4567-e89b-12d3-a456-426614174000",
    wallet_account_id: args.p_wallet_account_id,
    user_id: args.p_user_id,
    type: "withdrawal_pending",
    direction: "debit",
    amount: args.p_amount,
    currency: args.p_currency,
    status: "pending",
    idempotency_key: ledgerKey,
  };
  const withdrawalRequest = {
    id: "523e4567-e89b-12d3-a456-426614174000",
    user_id: args.p_user_id,
    wallet_account_id: args.p_wallet_account_id,
    amount: args.p_amount,
    currency: args.p_currency,
    bank_code: args.p_bank_code,
    account_number: args.p_account_number,
    account_name: args.p_account_name,
    status: "pending",
    ledger_entry_id: ledgerEntry.id,
  };

  state.ledgerEntries.push(ledgerEntry);
  state.withdrawalRequests.push(withdrawalRequest);

  return Promise.resolve({
    data: [{
      withdrawal_request_id: withdrawalRequest.id,
      ledger_entry_id: ledgerEntry.id,
      status: withdrawalRequest.status,
      amount: withdrawalRequest.amount,
      currency: withdrawalRequest.currency,
    }],
    error: null,
  });
}

function fakeClaimPaystackWithdrawalsRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const limit = Number(args.p_limit ?? 10);
  const rows = state.withdrawalRequests
    .filter((request) =>
      request.status === "approved" &&
      (request.provider === null || request.provider === "paystack") &&
      Number(request.retry_count ?? 0) < 3
    )
    .slice(0, limit)
    .map((request) => {
      request.status = "processing";
      request.provider = "paystack";
      request.retry_count = Number(request.retry_count ?? 0) + 1;
      request.failure_reason = null;
      request.provider_transfer_reference ??= `wd_${
        String(request.id).replaceAll("-", "")
      }`;

      return {
        withdrawal_request_id: request.id,
        user_id: request.user_id,
        wallet_account_id: request.wallet_account_id,
        amount: request.amount,
        currency: request.currency,
        bank_code: request.bank_code,
        account_number: request.account_number,
        account_name: request.account_name,
        provider_recipient_code: request.provider_recipient_code ?? null,
        provider_transfer_reference: request.provider_transfer_reference,
        retry_count: request.retry_count,
      };
    });

  return Promise.resolve({ data: rows, error: null });
}

function fakeApproveWithdrawalRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  if (!state.profile.is_admin) {
    return Promise.resolve({
      data: [],
      error: { message: "admin_required" },
    });
  }

  const withdrawal = state.withdrawalRequests.find((row) =>
    row.id === args.p_withdrawal_request_id
  );
  if (!withdrawal) {
    return Promise.resolve({
      data: [],
      error: { message: "withdrawal_not_found" },
    });
  }

  if (
    ["approved", "processing", "completed"].includes(String(withdrawal.status))
  ) {
    return Promise.resolve({
      data: [approvedWithdrawalRow(withdrawal)],
      error: null,
    });
  }

  if (withdrawal.status !== "pending") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_withdrawal_state" },
    });
  }

  withdrawal.status = "approved";
  withdrawal.provider = "paystack";
  withdrawal.provider_transfer_reference ??= `wd_${
    String(withdrawal.id).replaceAll("-", "")
  }`;
  withdrawal.failure_reason = null;

  return Promise.resolve({
    data: [approvedWithdrawalRow(withdrawal)],
    error: null,
  });
}

function fakeRejectWithdrawalRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  if (!state.profile.is_admin) {
    return Promise.resolve({
      data: [],
      error: { message: "admin_required" },
    });
  }

  const withdrawal = state.withdrawalRequests.find((row) =>
    row.id === args.p_withdrawal_request_id
  );
  if (!withdrawal) {
    return Promise.resolve({
      data: [],
      error: { message: "withdrawal_not_found" },
    });
  }

  if (withdrawal.status === "rejected") {
    return Promise.resolve({
      data: [rejectedWithdrawalRow(withdrawal)],
      error: null,
    });
  }

  if (withdrawal.status !== "pending" && withdrawal.status !== "approved") {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_withdrawal_state" },
    });
  }

  withdrawal.status = "rejected";
  withdrawal.failure_reason = args.p_admin_note;
  withdrawal.processed_at = "2026-05-21T01:00:00.000Z";

  return Promise.resolve({
    data: [rejectedWithdrawalRow(withdrawal)],
    error: null,
  });
}

function fakeFreezeUserRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  if (!state.profile.is_admin) {
    return Promise.resolve({
      data: [],
      error: { message: "admin_required" },
    });
  }

  if (args.p_admin_user_id === args.p_target_user_id) {
    return Promise.resolve({
      data: [],
      error: { message: "invalid_admin_action" },
    });
  }

  const target = state.jurorProfiles.find((row) =>
    row.id === args.p_target_user_id
  );
  if (!target) {
    return Promise.resolve({
      data: [],
      error: { message: "profile_not_found" },
    });
  }

  target.account_status = "frozen";
  target.jury_opt_in = false;
  target.jury_categories = [];
  target.updated_at = "2026-05-21T01:00:00.000Z";

  return Promise.resolve({
    data: [{
      user_id: target.id,
      account_status: target.account_status,
      wallet_accounts_frozen: 1,
      jury_opt_in: target.jury_opt_in,
      updated_at: target.updated_at,
    }],
    error: null,
  });
}

function approvedWithdrawalRow(
  withdrawal: Record<string, unknown>,
): Record<string, unknown> {
  return {
    withdrawal_request_id: withdrawal.id,
    user_id: withdrawal.user_id,
    amount: withdrawal.amount,
    currency: withdrawal.currency,
    status: withdrawal.status,
    provider: withdrawal.provider ?? null,
    provider_transfer_reference: withdrawal.provider_transfer_reference ?? null,
    processed_at: withdrawal.processed_at ?? null,
  };
}

function rejectedWithdrawalRow(
  withdrawal: Record<string, unknown>,
): Record<string, unknown> {
  return {
    withdrawal_request_id: withdrawal.id,
    user_id: withdrawal.user_id,
    amount: withdrawal.amount,
    currency: withdrawal.currency,
    status: withdrawal.status,
    failure_reason: withdrawal.failure_reason ?? null,
    processed_at: withdrawal.processed_at ?? null,
  };
}

function fakeSubmitKycRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  if (
    state.kycVerifications.some(
      (row) =>
        row.user_id === args.p_user_id &&
        row.kyc_tier_requested === args.p_tier &&
        row.status === "pending",
    )
  ) {
    return Promise.resolve({
      data: [],
      error: { message: "kyc_verification_pending" },
    });
  }

  const id = `kyc-${state.kycVerifications.length + 1}`;
  const submittedAt = "2026-05-21T00:00:00.000Z";
  const record = {
    id,
    user_id: args.p_user_id,
    kyc_tier_requested: args.p_tier,
    status: "pending",
    submitted_at: submittedAt,
  };
  state.kycVerifications.push(record);

  return Promise.resolve({
    data: [{
      kyc_verification_id: id,
      user_id: args.p_user_id,
      kyc_tier_requested: args.p_tier,
      status: "pending",
      submitted_at: submittedAt,
    }],
    error: null,
  });
}

function fakeGetLatestKycVerificationRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  const record = [...state.kycVerifications]
    .reverse()
    .find((row) => row.user_id === args.p_user_id);
  if (!record) {
    return Promise.resolve({ data: [], error: null });
  }
  return Promise.resolve({
    data: [{
      kyc_verification_id: record.id,
      kyc_tier_requested: record.kyc_tier_requested,
      kyc_tier_granted: record.kyc_tier_granted ?? null,
      status: record.status,
      submitted_at: record.submitted_at,
      decided_at: record.decided_at ?? null,
    }],
    error: null,
  });
}

function fakeDecideKycRpc(
  state: ReturnType<typeof createFakeState>,
  args: Record<string, unknown>,
): Promise<QueryResponse<Record<string, unknown>[]>> {
  if (!state.profile.is_admin) {
    return Promise.resolve({
      data: [],
      error: { message: "admin_required" },
    });
  }

  const record = state.kycVerifications.find(
    (row) => row.id === args.p_kyc_verification_id,
  );
  if (!record) {
    return Promise.resolve({
      data: [],
      error: { message: "kyc_verification_not_found" },
    });
  }
  if (record.status !== "pending") {
    return Promise.resolve({
      data: [],
      error: { message: "kyc_verification_not_pending" },
    });
  }

  const decidedAt = "2026-05-21T01:00:00.000Z";
  record.status = args.p_verdict as string;
  record.kyc_tier_granted = args.p_verdict === "approved"
    ? args.p_kyc_tier_granted
    : null;
  record.reviewer_user_id = args.p_admin_user_id;
  record.reviewer_note = args.p_admin_note ?? null;
  record.decided_at = decidedAt;

  const tierRank: Record<string, number> = {
    kyc0: 0,
    kyc1: 1,
    kyc2: 2,
    kyc3: 3,
  };
  if (args.p_verdict === "approved") {
    const current = (state.profile as Record<string, unknown>)
      .kyc_tier as string;
    const granted = args.p_kyc_tier_granted as string;
    if ((tierRank[granted] ?? 0) > (tierRank[current] ?? 0)) {
      (state.profile as Record<string, unknown>).kyc_tier = granted;
    }
  }

  return Promise.resolve({
    data: [{
      kyc_verification_id: record.id,
      user_id: record.user_id,
      kyc_tier_requested: record.kyc_tier_requested,
      kyc_tier_granted: record.kyc_tier_granted ?? null,
      status: record.status,
      decided_at: decidedAt,
    }],
    error: null,
  });
}

function matchesFilters(
  record: Record<string, unknown>,
  filters: Map<string, unknown>,
): boolean {
  for (const [column, value] of filters.entries()) {
    if (record[column] !== value) return false;
  }
  return true;
}
