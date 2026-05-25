type EnvKey = 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

export type BackendConfig = {
  actionsFunctionUrl: string | null;
  isConfigured: boolean;
  missing: string[];
  supabaseAnonKey: string | null;
  supabaseUrl: string | null;
};

function normalizeUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function readEnv(key: EnvKey) {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

const supabaseUrl = normalizeUrl(readEnv('EXPO_PUBLIC_SUPABASE_URL') ?? undefined);
const supabaseAnonKey = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
const explicitActionsUrl = normalizeUrl(process.env.EXPO_PUBLIC_ACTIONS_FUNCTION_URL);
const actionsFunctionUrl = explicitActionsUrl ?? (supabaseUrl ? `${supabaseUrl}/functions/v1/actions` : null);

const missing = [
  !supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL' : null,
  !supabaseAnonKey ? 'EXPO_PUBLIC_SUPABASE_ANON_KEY' : null,
].filter((key): key is string => Boolean(key));

export const backendConfig: BackendConfig = {
  actionsFunctionUrl,
  isConfigured: missing.length === 0 && Boolean(actionsFunctionUrl),
  missing,
  supabaseAnonKey,
  supabaseUrl,
};

export class BackendConfigError extends Error {
  constructor(missingKeys: string[]) {
    super(`Backend is not configured. Missing: ${missingKeys.join(', ')}`);
    this.name = 'BackendConfigError';
  }
}

export function assertBackendConfigured() {
  if (!backendConfig.isConfigured) {
    throw new BackendConfigError(backendConfig.missing);
  }

  return backendConfig as BackendConfig & {
    actionsFunctionUrl: string;
    supabaseAnonKey: string;
    supabaseUrl: string;
  };
}
