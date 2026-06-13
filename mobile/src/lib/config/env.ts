type EnvKey =
  | 'EXPO_PUBLIC_LIVEKIT_WS_URL'
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

export type BackendConfig = {
  actionsFunctionUrl: string | null;
  isConfigured: boolean;
  liveKitWsUrl: string | null;
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

function normalizeWebSocketUrl(value: string | null) {
  if (!value) return null;
  const normalized = normalizeUrl(value);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'wss:' && parsed.protocol !== 'ws:') return null;
    return normalized;
  } catch {
    return null;
  }
}

function readEnv(key: EnvKey) {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

const liveKitWsUrl = normalizeWebSocketUrl(readEnv('EXPO_PUBLIC_LIVEKIT_WS_URL'));
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
  liveKitWsUrl,
  missing,
  supabaseAnonKey,
  supabaseUrl,
};

export class BackendConfigError extends Error {
  missingKeys: string[];

  constructor(missingKeys: string[]) {
    super('App setup is incomplete.');
    this.name = 'BackendConfigError';
    this.missingKeys = missingKeys;
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
