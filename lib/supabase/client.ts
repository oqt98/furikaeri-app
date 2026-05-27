import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import type { Database } from './database.types';
import { getSupabaseEnv } from './env';

let client: SupabaseClient<Database> | null = null;

export function getSupabaseClient() {
  const env = getSupabaseEnv();
  if (!env) {
    return null;
  }

  if (!client) {
    client = createClient<Database>(env.url, env.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}
