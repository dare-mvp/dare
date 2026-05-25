import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { backendConfig } from '../config/env';

export const supabaseClient: SupabaseClient | null = backendConfig.isConfigured
  ? createClient(backendConfig.supabaseUrl as string, backendConfig.supabaseAnonKey as string, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: AsyncStorage,
      },
    })
  : null;
