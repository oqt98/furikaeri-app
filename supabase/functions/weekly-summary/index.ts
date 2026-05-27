// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type WeeklySummaryRequest = {
  weekStart: string;
  weekEnd: string;
  reviewCount: number;
  recordedDays: number;
  missingDays: number;
  entries: Array<{
    date: string;
    mood: number | null;
    category: string;
    templateName: string;
    answers: Record<string, string>;
    actionTags: string[];
    stateTags: string[];
    favorite: boolean;
  }>;
};

type WeeklySummaryResponse = {
  headline: string;
  pattern: string;
  positive: string;
  nextAction: string;
};

const SUMMARY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    pattern: { type: 'string' },
    positive: { type: 'string' },
    nextAction: { type: 'string' },
  },
  required: ['headline', 'pattern', 'positive', 'nextAction'],
} as const;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = await requireUser(request);
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const payload = (await request.json()) as WeeklySummaryRequest;
    const validationError = validatePayload(payload);
    if (validationError) {
      return jsonResponse({ error: validationError }, 400);
    }

    if (payload.reviewCount === 0) {
      return jsonResponse({ error: 'No reviews found for the selected week.' }, 400);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return jsonResponse({ error: 'OPENAI_API_KEY is not configured.' }, 500);
    }

    const model = Deno.env.get('OPENAI_WEEKLY_SUMMARY_MODEL') ?? 'gpt-4.1-mini';
    const summary = await createWeeklySummary(apiKey, model, payload, user.id);

    return jsonResponse(
      {
        summary,
        model,
        generatedAt: new Date().toISOString(),
      },
      200
    );
  } catch (error) {
    console.error('weekly-summary error', error);
    return jsonResponse({ error: 'Unexpected error occurred.' }, 500);
  }
});

async function requireUser(request: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = request.headers.get('Authorization');

  if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('weekly-summary auth error', error);
    return null;
  }

  return user;
}

function validatePayload(payload: WeeklySummaryRequest) {
  if (!payload || typeof payload !== 'object') {
    return 'Request body is required.';
  }

  if (!Array.isArray(payload.entries)) {
    return 'entries must be an array.';
  }

  if (typeof payload.weekStart !== 'string' || typeof payload.weekEnd !== 'string') {
    return 'weekStart and weekEnd are required.';
  }

  if (typeof payload.reviewCount !== 'number' || payload.reviewCount < 0) {
    return 'reviewCount must be a non-negative number.';
  }

  if (payload.entries.length !== payload.reviewCount) {
    return 'reviewCount does not match entries length.';
  }

  return null;
}

async function createWeeklySummary(
  apiKey: string,
  model: string,
  payload: WeeklySummaryRequest,
  userId: string
) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_output_tokens: 400,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'You are writing a Japanese weekly reflection summary for a self-review app. ' +
                'Be gentle, concise, and natural. Do not blame, preach, overstate, or diagnose. ' +
                'Avoid medical or psychological diagnosis wording. ' +
                'If there are only a few entries, still stay positive and work only from available records. ' +
                'Use short, readable Japanese sentences.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                userId,
                instruction: {
                  locale: 'ja-JP',
                  goal: 'Summarize one week of reflection records for review, not for daily input.',
                  outputFields: [
                    'headline',
                    'pattern',
                    'positive',
                    'nextAction',
                  ],
                  outputRules: [
                    'Each field should be 1-2 short sentences.',
                    'Keep the wording soft and non-judgmental.',
                    'Ground the summary in the provided records only.',
                    'When suggesting a next action, make it small and realistic.',
                  ],
                },
                week: payload,
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'weekly_summary',
          schema: SUMMARY_SCHEMA,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const outputText = typeof data.output_text === 'string' ? data.output_text : '';
  const parsed = JSON.parse(outputText) as WeeklySummaryResponse;

  if (!isValidSummary(parsed)) {
    throw new Error('OpenAI response did not match the expected summary shape.');
  }

  return parsed;
}

function isValidSummary(summary: WeeklySummaryResponse) {
  return (
    typeof summary?.headline === 'string' &&
    typeof summary?.pattern === 'string' &&
    typeof summary?.positive === 'string' &&
    typeof summary?.nextAction === 'string'
  );
}

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
