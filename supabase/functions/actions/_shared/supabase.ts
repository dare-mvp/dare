import { createClient } from "@supabase/supabase-js";

import { ActionError } from "./errors.ts";
import {
  createServiceClient,
  type QueryResponse,
  type SupabaseActionClient,
  type SupabaseFilterBuilder,
  type SupabaseQueryError,
} from "../../_shared/supabase.ts";

export {
  createServiceClient,
  type QueryResponse,
  type SupabaseActionClient,
  type SupabaseFilterBuilder,
  type SupabaseQueryError,
};

export function createUserClient(request: Request): SupabaseActionClient {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    throw new ActionError("UNAUTHENTICATED");
  }

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseKey) {
    throw new ActionError("INTERNAL_ERROR", {
      message: "Supabase publishable key is not configured.",
    });
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
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
