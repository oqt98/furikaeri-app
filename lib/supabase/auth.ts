import { getSupabaseClient } from './client';

export async function ensureAnonymousSession() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { status: 'disabled' as const };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (session) {
    return { status: 'ready' as const, userId: session.user.id };
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }

  return { status: 'ready' as const, userId: data.user?.id ?? null };
}

export async function getSupabaseUserId() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}
