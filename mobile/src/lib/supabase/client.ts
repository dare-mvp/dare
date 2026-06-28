import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { backendConfig } from '../config/env';

const webAuthStorage = new Map<string, string>();

const secureAuthStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? webAuthStorage.get(key) ?? null;
      } catch {
        return webAuthStorage.get(key) ?? null;
      }
    }

    return SecureStore.getItemAsync(key);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      webAuthStorage.delete(key);
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        // In-memory fallback was already cleared.
      }
      return;
    }

    return SecureStore.deleteItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      webAuthStorage.set(key, value);
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        // Keep the in-memory fallback for restricted web storage contexts.
      }
      return;
    }

    return SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
};

export const supabaseClient: SupabaseClient | null = backendConfig.isConfigured
  ? createClient(backendConfig.supabaseUrl as string, backendConfig.supabaseAnonKey as string, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: secureAuthStorage,
      },
    })
  : null;
