import type { AppLocale } from './appPreferencesRepository';

export function getWeeklySummaryLabels(locale: AppLocale) {
  if (locale === 'en') {
    return {
      cardTitle: 'Weekly AI Summary',
      cardSubtitle: 'A gentle look back at this week from your saved records.',
      countLabel: 'Records',
      daysLabel: 'Recorded days',
      missingLabel: 'No-record days',
      generate: 'Create summary',
      regenerate: 'Create again',
      loading: 'Creating a short weekly summary...',
      emptyTitle: 'No records yet this week',
      emptyBody:
        'No need to force a summary. Saving even one short record is enough to restart the week.',
      unavailable:
        'Supabase is not configured yet, so AI summary is currently unavailable.',
      error:
        'The summary could not be created right now. Please try again after a moment.',
      continuityNone:
        'This week has no records yet. Starting again from one day is enough.',
      continuityFew:
        'You recorded {count} items this week. Even a lighter week is still worth looking back on.',
      continuityMany:
        'You recorded {count} items this week. That steady pace gives the summary more shape.',
      headline: 'One-line summary',
      pattern: 'Patterns that stood out',
      positive: 'What went well',
      nextAction: 'A small action for next week',
      lastUpdatedPrefix: 'Generated',
    };
  }

  return {
    cardTitle: '週次AI要約',
    cardSubtitle: '今週の記録を、やさしく短く振り返ります。',
    countLabel: '記録件数',
    daysLabel: '記録した日',
    missingLabel: '未記録の日',
    generate: '今週のAI要約をつくる',
    regenerate: 'もう一度つくる',
    loading: '今週の記録をもとに短い要約を作成しています…',
    emptyTitle: '今週の記録はまだありません',
    emptyBody:
      '無理に要約しなくて大丈夫です。1件だけでも残せたら、それで十分です。',
    unavailable:
      'Supabase の設定がまだないため、AI要約はまだ使えません。',
    error:
      'AI要約を作れませんでした。少し時間をおいて、もう一度お試しください。',
    continuityNone:
      '今週はまだ記録がありません。次の1件から、また始めれば十分です。',
    continuityFew:
      '今週は{count}件記録できました。少ない週でも、残せたぶんから十分に振り返れます。',
    continuityMany:
      '今週は{count}件記録できました。続けて残せていること自体が、すでに良い流れです。',
    headline: '今週のひとこと要約',
    pattern: '見えてきた傾向',
    positive: 'よかった点',
    nextAction: '来週の小さなアクション',
    lastUpdatedPrefix: '生成',
  };
}

export function getContinuityMessage(locale: AppLocale, reviewCount: number) {
  const labels = getWeeklySummaryLabels(locale);
  const template =
    reviewCount === 0
      ? labels.continuityNone
      : reviewCount <= 2
        ? labels.continuityFew
        : labels.continuityMany;

  return template.replace('{count}', String(reviewCount));
}
