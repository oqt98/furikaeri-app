export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

function readEnv(name: string) {
  const value = (process.env as Record<string, string | undefined>)[name]?.trim();
  return value && !value.includes('your-') ? value : null;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = readEnv('EXPO_PUBLIC_SUPABASE_URL');
  const anonKey = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseEnabled() {
  return getSupabaseEnv() !== null;
}
