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
  "POST /dares/*/answers": [
    { scope: "answer_submission:minute", limit: 30, windowSeconds: 60 },
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
