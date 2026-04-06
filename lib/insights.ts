import { getMoodOption, type MoodValue } from '../data/reviewOptions';
import type { ReviewItem } from './storage';

type InsightSummary = {
  weeklyTitle: string;
  weeklyBody: string;
  nextTitle: string;
  nextBody: string;
  weeklyStats: Array<{ label: string; value: string }>;
};

export function buildInsightSummary(reviews: ReviewItem[]): InsightSummary {
  if (reviews.length === 0) {
    return {
      weeklyTitle: '最初の1件から始めましょう',
      weeklyBody: '短くても十分です。今日のことを一つだけ残せば見返す土台になります。',
      nextTitle: 'まずは軽く続ける',
      nextBody: '長く書くより、続けやすいテンプレートをひとつ決める方が効果的です。',
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
  const topStateTag = mostCommon(last7Days.flatMap((item) => item.stateTagIds));

  const weeklyParts = [
    `${last7Days.length}件の記録`,
    streak > 0 ? `連続 ${streak}日` : null,
    topMoodValue ? `気分は ${getMoodOption(topMoodValue).label} が多め` : null,
    topTemplate ? `${topTemplate} をよく使用` : null,
  ].filter(Boolean);

  return {
    weeklyTitle: '直近1週間のメモ',
    weeklyBody: weeklyParts.join(' / '),
    nextTitle: '次の日へのヒント',
    nextBody: buildNextHint({ topMoodValue, topStateTag, topTemplate, streak }),
    weeklyStats: [
      { label: '今週の記録', value: `${last7Days.length}件` },
      { label: '連続日数', value: `${streak}日` },
      { label: 'よく使う型', value: topTemplate ?? 'まだなし' },
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
    return '入力を増やしすぎず、短いテンプレートで済ませる日にしておくと続けやすいです。';
  }

  if (topStateTag) {
    return '状態タグが偏っているなら、その背景を1行だけ本文に残すと後で見返しやすくなります。';
  }

  if (topTemplate) {
    return `${topTemplate} が合っていそうです。迷う日は同じ型を続ける方が負荷が低くなります。`;
  }

  if (streak >= 3) {
    return '連続して残せているので、写真やタグは必要な日だけ足す運用で十分です。';
  }

  return '気分とひとことだけでも残すと、次の日の比較材料になります。';
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
