import { ensureAnonymousSession } from './supabase/auth';
import { getSupabaseClient } from './supabase/client';
import type { WeeklySummarySource } from './weeklySummary';

export type WeeklyAiSummary = {
  headline: string;
  pattern: string;
  positive: string;
  nextAction: string;
};

export type WeeklyAiSummaryResponse = {
  summary: WeeklyAiSummary;
  generatedAt: string;
  model: string;
};

export class WeeklyAiSummaryError extends Error {
  code: 'backend-disabled' | 'unauthorized' | 'remote-error' | 'invalid-response';

  constructor(
    code: WeeklyAiSummaryError['code'],
    message: string
  ) {
    super(message);
    this.name = 'WeeklyAiSummaryError';
    this.code = code;
  }
}

export async function generateWeeklyAiSummary(
  payload: WeeklySummarySource
): Promise<WeeklyAiSummaryResponse> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new WeeklyAiSummaryError(
      'backend-disabled',
      'Supabase is not configured.'
    );
  }

  const session = await ensureAnonymousSession();
  if (session.status !== 'ready') {
    throw new WeeklyAiSummaryError('unauthorized', 'Anonymous session is unavailable.');
  }

  const { data, error } = await supabase.functions.invoke('weekly-summary', {
    body: payload,
  });

  if (error) {
    throw new WeeklyAiSummaryError('remote-error', error.message);
  }

  if (!isWeeklyAiSummaryResponse(data)) {
    throw new WeeklyAiSummaryError(
      'invalid-response',
      'Edge Function returned an unexpected payload.'
    );
  }

  return data;
}

function isWeeklyAiSummaryResponse(value: unknown): value is WeeklyAiSummaryResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as Record<string, unknown>;
  const summary = response.summary as Record<string, unknown> | undefined;

  return (
    typeof response.generatedAt === 'string' &&
    typeof response.model === 'string' &&
    summary !== undefined &&
    typeof summary.headline === 'string' &&
    typeof summary.pattern === 'string' &&
    typeof summary.positive === 'string' &&
    typeof summary.nextAction === 'string'
  );
}
