import { ActionError } from "./errors.ts";
import { type SupabaseActionClient } from "./supabase.ts";

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

export async function requireAuthenticatedUser(
  client: SupabaseActionClient,
): Promise<AuthenticatedUser> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new ActionError("UNAUTHENTICATED");
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
}

export async function requireAdminUser(
  client: SupabaseActionClient,
): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedUser(client);

  const { data, error } = await client
    .from<{ is_admin: boolean }>("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data || !data.is_admin) {
    throw new ActionError("FORBIDDEN");
  }

  return user;
}
