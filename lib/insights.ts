import { getMoodOption, type MoodValue } from '../data/reviewOptions';
import type { ReviewItem } from './storage';

type InsightSummary = {
  weeklyTitle: string;
  weeklyBody: string;
  nextTitle: string;
  nextBody: string;
  weeklyStats: Array<{ label: string; value: string }>;
};

type InsightOptions = {
  tagLabelMap?: Map<string, string>;
};

export function buildInsightSummary(
  reviews: ReviewItem[],
  options: InsightOptions = {}
): InsightSummary {
  if (reviews.length === 0) {
    return {
      weeklyTitle: 'まずは1件から始めましょう',
      weeklyBody: '長く書かなくても大丈夫です。今日のことを少しだけ残すところから始められます。',
      nextTitle: '次の一歩',
      nextBody: 'テンプレートを1つ選んで、ひとことだけでも記録してみましょう。',
      weeklyStats: [
        { label: '今週の記録', value: '0件' },
        { label: '連続日数', value: '0日' },
      ],
    };
  }

  const sorted = [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const last7Days = getLast7DaysReviews(sorted);
  const streak = calculateCurrentStreak(
    Array.from(new Set(sorted.map((item) => toDateKey(new Date(item.createdAt))))).sort(
      (a, b) => (a < b ? 1 : -1)
    )
  );
  const topMoodValue = mostCommon(
    last7Days
      .map((item) => item.mood)
      .filter((value): value is MoodValue => value !== undefined)
  );
  const topTemplate = mostCommon(last7Days.map((item) => item.templateName));
  const topActionTag = mostCommon(last7Days.flatMap((item) => item.actionTagIds));
  const topStateTag = mostCommon(last7Days.flatMap((item) => item.stateTagIds));
  const topActionTagLabel = topActionTag ? options.tagLabelMap?.get(topActionTag) : undefined;

  const parts = [
    `${last7Days.length}件の記録`,
    streak > 0 ? `連続 ${streak}日` : null,
    topMoodValue ? `気分は「${getMoodOption(topMoodValue).label}」が多めです` : null,
    topActionTagLabel ? `よく使っている行動タグは「${topActionTagLabel}」です` : null,
  ].filter(Boolean);

  return {
    weeklyTitle: '今週のふりかえりメモ',
    weeklyBody: parts.join('。') + '。',
    nextTitle: '次の一歩',
    nextBody: buildNextHint({ topMoodValue, topStateTag, topTemplate, streak }),
    weeklyStats: [
      { label: '今週の記録', value: `${last7Days.length}件` },
      { label: '連続日数', value: `${streak}日` },
      { label: 'よく使う行動タグ', value: topActionTagLabel ?? 'まだなし' },
    ],
  };
}

function buildNextHint({
  topMoodValue,
  topStateTag,
  topTemplate,
  streak,
}: {
  topMoodValue?: number;
  topStateTag?: string;
  topTemplate?: string;
  streak: number;
}) {
  if (topMoodValue && topMoodValue <= 2) {
    return 'しんどい日は、短いテンプレートでひとことだけ残す形でも十分です。';
  }

  if (topStateTag) {
    return `最近は状態タグ「${topStateTag}」が続いています。次の記録でも気分の変化を見てみましょう。`;
  }

  if (topTemplate) {
    return `最近は「${topTemplate}」が合っているようです。迷う日は同じ型で続けてみるのもおすすめです。`;
  }

  if (streak >= 3) {
    return '続いているので、今日は無理せず短く書いてリズムを保つのがよさそうです。';
  }

  return '気分とひとことだけでも残すと、次の日の自分が見返しやすくなります。';
}

function getLast7DaysReviews(reviews: ReviewItem[]) {
  const threshold = new Date();
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - 6);

  return reviews.filter(
    (item) => new Date(item.createdAt).getTime() >= threshold.getTime()
  );
}

function mostCommon<T>(values: T[]) {
  if (values.length === 0) return undefined;

  const counts = values.reduce((map, value) => {
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map<T, number>());

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateCurrentStreak(sortedDateKeysDesc: string[]) {
  if (sortedDateKeysDesc.length === 0) return 0;

  const dateSet = new Set(sortedDateKeysDesc);
  const todayKey = toDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  let baseKey: string | null = null;

  if (dateSet.has(todayKey)) {
    baseKey = todayKey;
  } else if (dateSet.has(yesterdayKey)) {
    baseKey = yesterdayKey;
  } else {
    return 0;
  }

  let streak = 0;
  const cursor = new Date(baseKey);

  while (dateSet.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
