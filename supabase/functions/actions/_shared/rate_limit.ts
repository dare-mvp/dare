import { requireAuthenticatedUser } from "./auth.ts";
import { ActionError } from "./errors.ts";
import {
  type SupabaseActionClient,
  type SupabaseQueryError,
} from "./supabase.ts";

type RateLimitRule = {
  scope: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitRow = {
  allowed: boolean;
  limit_count: number;
  remaining: number;
  reset_at: string;
  retry_after_seconds: number;
};

const RATE_LIMITS: Record<string, RateLimitRule[]> = {
  "POST /dares": [
    { scope: "create_dare:minute", limit: 5, windowSeconds: 60 },
    { scope: "create_dare:day", limit: 20, windowSeconds: 86_400 },
  ],
  "POST /dares/*/accept": [
    { scope: "accept_dare:minute", limit: 10, windowSeconds: 60 },
  ],
  "GET /dares/*/accept-quote": [
    { scope: "accept_quote:minute", limit: 60, windowSeconds: 60 },
  ],
  "POST /dares/*/accept-quote": [
    { scope: "accept_dare:minute", limit: 10, windowSeconds: 60 },
  ],
  "POST /dares/*/answers": [
    { scope: "answer_submission:minute", limit: 30, windowSeconds: 60 },
  ],
  "POST /dares/*/complete": [
    { scope: "complete_dare:minute", limit: 10, windowSeconds: 60 },
  ],
  "POST /dares/*/settle": [
    { scope: "settle_dare:minute", limit: 10, windowSeconds: 60 },
  ],
  "GET /dares/*/settlement-status": [
    { scope: "settlement_status:minute", limit: 60, windowSeconds: 60 },
  ],
  "POST /court/*/messages": [
    { scope: "court_chat:minute", limit: 20, windowSeconds: 60 },
  ],
  "POST /court/*/heartbeat": [
    { scope: "court_heartbeat:minute", limit: 60, windowSeconds: 60 },
  ],
  "POST /court/*/ready": [
    { scope: "court_ready:minute", limit: 20, windowSeconds: 60 },
  ],
  "POST /devices/push-token": [
    { scope: "push_token_register:minute", limit: 10, windowSeconds: 60 },
  ],
  "POST /wallet/deposits/init": [
    { scope: "deposit_init:hour", limit: 5, windowSeconds: 3_600 },
    { scope: "deposit_init:day", limit: 10, windowSeconds: 86_400 },
  ],
  "POST /wallet/withdrawals": [
    { scope: "withdrawal_request:day", limit: 3, windowSeconds: 86_400 },
  ],
  "POST /dares/*/disputes": [
    { scope: "dispute_filing:day", limit: 3, windowSeconds: 86_400 },
  ],
  "POST /dares/*/evidence": [
    { scope: "evidence_upload_request:minute", limit: 10, windowSeconds: 60 },
  ],
  "POST /dares/*/evidence/confirm": [
    { scope: "evidence_upload_confirm:minute", limit: 20, windowSeconds: 60 },
  ],
  "POST /dares/*/results/claims": [
    { scope: "result_claim:minute", limit: 10, windowSeconds: 60 },
  ],
  "POST /dares/*/results/witness-attendance": [
    { scope: "witness_attendance:minute", limit: 20, windowSeconds: 60 },
  ],
  "POST /dares/*/results/witness-votes": [
    { scope: "witness_vote:minute", limit: 10, windowSeconds: 60 },
  ],
  "POST /jury-cases/*/votes": [
    { scope: "jury_vote:minute", limit: 10, windowSeconds: 60 },
  ],
  "GET /jury-cases/*/evidence": [
    { scope: "jury_evidence_read:minute", limit: 30, windowSeconds: 60 },
  ],
  "POST /admin/jury-cases/*/assign": [
    { scope: "admin_jury_assign:minute", limit: 20, windowSeconds: 60 },
  ],
  "POST /admin/jury-cases/*/resolve": [
    { scope: "admin_jury_resolve:minute", limit: 20, windowSeconds: 60 },
  ],
  "POST /kyc/submit": [
    { scope: "kyc_submit:day", limit: 3, windowSeconds: 86_400 },
  ],
};

export async function enforceActionRateLimit(
  method: string,
  actionPath: string[],
  getClient: () => SupabaseActionClient,
  getServiceClient: () => SupabaseActionClient,
): Promise<void> {
  const rules = RATE_LIMITS[routeKey(method, actionPath)];
  if (!rules) return;

  const client = getClient();
  const serviceClient = getServiceClient();
  const authUser = await requireAuthenticatedUser(client);
  for (const rule of rules) {
    const result = await consumeRateLimit(serviceClient, authUser.id, rule);
    if (!result.allowed) {
      throw new ActionError("RATE_LIMITED", {
        message: "Too many requests for this action. Try again later.",
        details: {
          scope: rule.scope,
          limit: result.limit_count,
          remaining: result.remaining,
          resetAt: result.reset_at,
          retryAfterSeconds: result.retry_after_seconds,
        },
      });
    }
  }
}

async function consumeRateLimit(
  serviceClient: SupabaseActionClient,
  userId: string,
  rule: RateLimitRule,
): Promise<RateLimitRow> {
  const { data, error } = await serviceClient.rpc<RateLimitRow[]>(
    "consume_action_rate_limit",
    {
      p_user_id: userId,
      p_scope: rule.scope,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    },
  );

  if (error) throw mapRateLimitError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function routeKey(method: string, actionPath: string[]): string {
  const normalized = actionPath.map((segment, index) => {
    if (index === 1 && ["dares"].includes(actionPath[0])) return "*";
    if (index === 1 && ["court"].includes(actionPath[0])) return "*";
    if (index === 1 && ["jury-cases"].includes(actionPath[0])) return "*";
    if (
      index === 2 && actionPath[0] === "admin" &&
      ["jury-cases", "withdrawals", "users"].includes(actionPath[1])
    ) return "*";
    return segment;
  });
  return `${method} /${normalized.join("/")}`;
}

function mapRateLimitError(error: SupabaseQueryError): ActionError {
  if (error.message === "rate_limited") {
    return new ActionError("RATE_LIMITED", { cause: error });
  }

  return new ActionError("INTERNAL_ERROR", {
    message: "Rate limit check failed.",
    cause: error,
  });
}
