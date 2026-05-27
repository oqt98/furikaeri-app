import { getSupabaseUserId } from './auth';
import { getSupabaseClient } from './client';
import type { Database } from './database.types';

type AppPreferencesUpdate =
  Database['public']['Tables']['app_preferences']['Update'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type AppPreferencesRow = Database['public']['Tables']['app_preferences']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export async function getRemoteProfile(): Promise<ProfileRow | null> {
  const supabase = getSupabaseClient();
  const userId = await getSupabaseUserId();
  if (!supabase || !userId) {
    return null;
  }

  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as ProfileRow | null;
}

export async function getRemoteAppPreferences(): Promise<AppPreferencesRow | null> {
  const supabase = getSupabaseClient();
  const userId = await getSupabaseUserId();
  if (!supabase || !userId) {
    return null;
  }

  const { data, error } = await (supabase as any)
    .from('app_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as AppPreferencesRow | null;
}

export async function upsertRemoteAppPreferences(
  patch: Omit<AppPreferencesUpdate, 'user_id'>
) {
  const supabase = getSupabaseClient();
  const userId = await getSupabaseUserId();
  if (!supabase || !userId) {
    return;
  }

  const { error } = await (supabase as any).from('app_preferences').upsert(
    {
      user_id: userId,
      ...patch,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw error;
  }
}

export async function updateRemoteProfile(patch: ProfileUpdate) {
  const supabase = getSupabaseClient();
  const userId = await getSupabaseUserId();
  if (!supabase || !userId) {
    return;
  }

  const { error } = await (supabase as any)
    .from('profiles')
    .update(patch)
    .eq('id', userId);

  if (error) {
    throw error;
  }
}
