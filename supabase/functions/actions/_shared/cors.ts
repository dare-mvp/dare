const BROWSER_ORIGINS_ENV = "DARE_ALLOWED_BROWSER_ORIGINS";
const ADMIN_ORIGINS_ENV = "DARE_ALLOWED_ADMIN_ORIGINS";

export const CORS_HEADERS = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Vary": "Origin",
} as const;

export function isCorsPreflight(request: Request): boolean {
  return request.method === "OPTIONS";
}

export function corsPreflightResponse(request: Request): Response {
  if (!isAllowedCorsRequest(request)) {
    return new Response(null, {
      status: 403,
      headers: CORS_HEADERS,
    });
  }

  return new Response(null, {
    status: 204,
    headers: corsHeadersForRequest(request),
  });
}

export function isAllowedCorsRequest(request: Request): boolean {
  const origin = normalizedRequestOrigin(request);
  if (!origin) return true;

  return allowedOriginsForRequest(request).has(origin);
}

export function withCorsHeaders(
  response: Response,
  request: Request,
): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeadersForRequest(request))) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function corsHeadersForRequest(request: Request): HeadersInit {
  const headers: Record<string, string> = { ...CORS_HEADERS };
  const origin = normalizedRequestOrigin(request);

  if (origin && allowedOriginsForRequest(request).has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function allowedOriginsForRequest(request: Request): Set<string> {
  const envName = isAdminActionRequest(request)
    ? ADMIN_ORIGINS_ENV
    : BROWSER_ORIGINS_ENV;

  return parseOriginList(Deno.env.get(envName) ?? "");
}

function normalizedRequestOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  return origin ? normalizeOrigin(origin) : null;
}

function normalizeOrigin(origin: string): string | null {
  try {
    const url = new URL(origin);
    if (url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function parseOriginList(value: string): Set<string> {
  const origins = new Set<string>();

  for (const entry of value.split(",")) {
    const normalized = normalizeOrigin(entry.trim());
    if (normalized) origins.add(normalized);
  }

  return origins;
}

function isAdminActionRequest(request: Request): boolean {
  const pathname = new URL(request.url).pathname;
  return pathname === "/actions/admin" ||
    pathname.includes("/actions/admin/") ||
    pathname === "/functions/v1/actions/admin" ||
    pathname.includes("/functions/v1/actions/admin/");
}
