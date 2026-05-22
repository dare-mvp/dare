import { createClient } from "@supabase/supabase-js";

import { ActionError } from "./errors.ts";

export type SupabaseQueryError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export type QueryResponse<T> = {
  data: T;
  error: SupabaseQueryError | null;
};

export type SupabaseFilterBuilder<T> = {
  select(columns: string): SupabaseFilterBuilder<T>;
  insert(values: Record<string, unknown>): Promise<QueryResponse<null>>;
  update(values: Record<string, unknown>): SupabaseFilterBuilder<T>;
  eq(column: string, value: unknown): SupabaseFilterBuilder<T>;
  maybeSingle(): Promise<QueryResponse<T | null>>;
};

export type SupabaseActionClient = {
  auth: {
    getUser(): Promise<{
      data: {
        user: {
          id: string;
          email?: string | null;
        } | null;
      };
      error: SupabaseQueryError | null;
    }>;
  };
  from<T = unknown>(table: string): SupabaseFilterBuilder<T>;
  rpc<T = unknown>(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<QueryResponse<T>>;
  storage?: {
    from(bucket: string): {
      createSignedUploadUrl(
        path: string,
      ): Promise<
        QueryResponse<
          {
            signedUrl: string;
            path: string;
            token: string;
          } | null
        >
      >;
      download(path: string): Promise<QueryResponse<Blob | null>>;
    };
  };
};

// Privileged client: bypasses RLS. Use only for server-side writes that require
// service-role access (idempotency table, Postgres function calls via rpc).
// Never expose this client or its key to the mobile app.
export function createServiceClient(): SupabaseActionClient {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  }) as unknown as SupabaseActionClient;
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new ActionError("INTERNAL_ERROR", {
      message: `${name} is not configured.`,
    });
  }

  return value;
}
