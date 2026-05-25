import { ActionError } from "./_shared/errors.ts";
import { corsPreflightResponse, isCorsPreflight } from "./_shared/cors.ts";
import { enforceActionRateLimit } from "./_shared/rate_limit.ts";
import { errorResponse, successResponse } from "./_shared/response.ts";
import {
  createServiceClient,
  createUserClient,
  type SupabaseActionClient,
} from "./_shared/supabase.ts";
import { submitAnswer } from "./routes/answers.ts";
import {
  getCurrentCourtQuestion,
  markDareReady,
  recordCourtHeartbeat,
} from "./routes/court.ts";
import { acceptDare, cancelDare, createDare } from "./routes/dares.ts";
import { forfeitDare } from "./routes/dare_lifecycle.ts";
import {
  initializeDeposit,
  type PaystackInitializer,
} from "./routes/deposits.ts";
import { fileDispute, resolveJuryCase } from "./routes/disputes.ts";
import {
  confirmEvidenceUpload,
  requestEvidenceUpload,
} from "./routes/evidence.ts";
import { assignJuryCase, castJuryVote } from "./routes/jury.ts";
import { getMe, updateMyProfile } from "./routes/me.ts";
import {
  decideKycVerification,
  getKycStatus,
  submitKycRequest,
} from "./routes/kyc.ts";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "./routes/notifications.ts";
import { updateMyJuryProfile } from "./routes/profile_jury.ts";
import {
  selfExclude,
  updateResponsibleGamingSettings,
} from "./routes/responsible_gaming.ts";
import { requestWithdrawal } from "./routes/withdrawals.ts";
import { completeDare, settleDare } from "./routes/settlement.ts";

type RouteContext = {
  request: Request;
  requestId: string;
  pathname: string;
  getClient: () => SupabaseActionClient;
  getServiceClient: () => SupabaseActionClient;
  paystackInitializer?: PaystackInitializer;
};

type HandlerDependencies = {
  createClient: (request: Request) => SupabaseActionClient;
  createServiceClient?: () => SupabaseActionClient;
  paystackInitializer?: PaystackInitializer;
};

const defaultDependencies: HandlerDependencies = {
  createClient: createUserClient,
  createServiceClient,
};

export function createHandler(
  dependencies: HandlerDependencies = defaultDependencies,
): (request: Request) => Promise<Response> {
  return async function handler(request: Request): Promise<Response> {
    if (isCorsPreflight(request)) {
      return corsPreflightResponse();
    }

    const requestId = request.headers.get("x-request-id") ??
      crypto.randomUUID();

    try {
      const url = new URL(request.url);
      return await route({
        request,
        requestId,
        pathname: url.pathname,
        getClient: () => dependencies.createClient(request),
        getServiceClient: () => {
          const factory = dependencies.createServiceClient ??
            defaultDependencies.createServiceClient!;
          return factory();
        },
        paystackInitializer: dependencies.paystackInitializer,
      });
    } catch (error) {
      return errorResponse(error, requestId);
    }
  };
}

export const handler = createHandler();

async function route(context: RouteContext): Promise<Response> {
  const segments = context.pathname.split("/").filter(Boolean);
  const actionPath = getActionPath(segments);

  if (context.request.method === "GET" && matchesPath(actionPath, ["health"])) {
    return successResponse(
      {
        service: "dare-actions",
        status: "ok",
      },
      context.requestId,
    );
  }

  await enforceActionRateLimit(
    context.request.method,
    actionPath,
    context.getClient,
    context.getServiceClient,
  );

  if (context.request.method === "GET" && matchesPath(actionPath, ["me"])) {
    return successResponse(await getMe(context.getClient()), context.requestId);
  }

  if (
    context.request.method === "GET" &&
    matchesPath(actionPath, ["kyc", "status"])
  ) {
    return successResponse(
      await getKycStatus(context.getClient(), context.getServiceClient()),
      context.requestId,
    );
  }

  if (
    context.request.method === "PATCH" &&
    matchesPath(actionPath, ["profiles", "me", "jury"])
  ) {
    const result = await updateMyJuryProfile(
      context.request,
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "PATCH" &&
    matchesPath(actionPath, ["profiles", "me"])
  ) {
    const result = await updateMyProfile(context.request, context.getClient());
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    matchesPath(actionPath, ["notifications", "read-all"])
  ) {
    const result = await markAllNotificationsRead(
      context.request,
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "PATCH" &&
    actionPath.length === 3 &&
    actionPath[0] === "notifications" &&
    actionPath[2] === "read"
  ) {
    const result = await markNotificationRead(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "PATCH" &&
    matchesPath(actionPath, ["responsible-gaming", "settings"])
  ) {
    const result = await updateResponsibleGamingSettings(
      context.request,
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    matchesPath(actionPath, ["responsible-gaming", "self-exclude"])
  ) {
    const result = await selfExclude(
      context.request,
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    matchesPath(actionPath, ["wallet", "deposits", "init"])
  ) {
    const result = await initializeDeposit(
      context.request,
      context.getClient(),
      context.getServiceClient(),
      context.paystackInitializer,
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    matchesPath(actionPath, ["wallet", "withdrawals"])
  ) {
    const result = await requestWithdrawal(
      context.request,
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 4 &&
    actionPath[0] === "admin" &&
    actionPath[1] === "kyc" &&
    actionPath[3] === "decide"
  ) {
    const result = await decideKycVerification(
      context.request,
      actionPath[2],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    matchesPath(actionPath, ["kyc", "submit"])
  ) {
    const result = await submitKycRequest(
      context.request,
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (context.request.method === "POST" && matchesPath(actionPath, ["dares"])) {
    const result = await createDare(
      context.request,
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 3 &&
    actionPath[0] === "court" &&
    actionPath[2] === "heartbeat"
  ) {
    const result = await recordCourtHeartbeat(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "GET" &&
    actionPath.length === 3 &&
    actionPath[0] === "court" &&
    actionPath[2] === "question"
  ) {
    return successResponse(
      await getCurrentCourtQuestion(
        actionPath[1],
        context.getClient(),
        context.getServiceClient(),
      ),
      context.requestId,
    );
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 3 &&
    actionPath[0] === "dares" &&
    actionPath[2] === "cancel"
  ) {
    const result = await cancelDare(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 3 &&
    actionPath[0] === "dares" &&
    actionPath[2] === "accept"
  ) {
    const result = await acceptDare(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 3 &&
    actionPath[0] === "dares" &&
    actionPath[2] === "forfeit"
  ) {
    const result = await forfeitDare(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 3 &&
    actionPath[0] === "dares" &&
    actionPath[2] === "ready"
  ) {
    const result = await markDareReady(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 3 &&
    actionPath[0] === "dares" &&
    actionPath[2] === "answers"
  ) {
    const result = await submitAnswer(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 3 &&
    actionPath[0] === "dares" &&
    actionPath[2] === "complete"
  ) {
    const result = await completeDare(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 3 &&
    actionPath[0] === "dares" &&
    actionPath[2] === "settle"
  ) {
    const result = await settleDare(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 3 &&
    actionPath[0] === "dares" &&
    actionPath[2] === "disputes"
  ) {
    const result = await fileDispute(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 3 &&
    actionPath[0] === "dares" &&
    actionPath[2] === "evidence"
  ) {
    const result = await requestEvidenceUpload(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 4 &&
    actionPath[0] === "dares" &&
    actionPath[2] === "evidence" &&
    actionPath[3] === "confirm"
  ) {
    const result = await confirmEvidenceUpload(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 4 &&
    actionPath[0] === "admin" &&
    actionPath[1] === "jury-cases" &&
    actionPath[3] === "resolve"
  ) {
    const result = await resolveJuryCase(
      context.request,
      actionPath[2],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 4 &&
    actionPath[0] === "admin" &&
    actionPath[1] === "jury-cases" &&
    actionPath[3] === "assign"
  ) {
    const result = await assignJuryCase(
      context.request,
      actionPath[2],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (
    context.request.method === "POST" &&
    actionPath.length === 3 &&
    actionPath[0] === "jury-cases" &&
    actionPath[2] === "votes"
  ) {
    const result = await castJuryVote(
      context.request,
      actionPath[1],
      context.getClient(),
      context.getServiceClient(),
    );
    return successResponse(result.data, result.requestId);
  }

  if (!["GET", "POST", "PATCH"].includes(context.request.method)) {
    throw new ActionError("METHOD_NOT_ALLOWED");
  }

  throw new ActionError("NOT_FOUND");
}

function getActionPath(segments: string[]): string[] {
  const actionIndex = segments.lastIndexOf("actions");
  return actionIndex >= 0 ? segments.slice(actionIndex + 1) : segments;
}

function matchesPath(segments: string[], expected: string[]): boolean {
  return segments.length === expected.length &&
    expected.every((segment, index) => segments[index] === segment);
}
