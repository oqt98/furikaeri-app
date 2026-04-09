import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { ImportantDay } from './importantDays';

export type ImportantDayIconName = ComponentProps<typeof Ionicons>['name'];

type ImportantDayIconRule = {
  icon: ImportantDayIconName;
  matches: (item: ImportantDay) => boolean;
};

const RULES: ImportantDayIconRule[] = [
  {
    icon: 'gift-outline',
    matches: (item) =>
      item.type === '誕生日' || containsKeyword(item, ['誕生日', 'birthday', 'バースデー']),
  },
  {
    icon: 'heart-outline',
    matches: (item) =>
      item.type === '記念日' || containsKeyword(item, ['記念日', 'anniversary']),
  },
  {
    icon: 'airplane-outline',
    matches: (item) => containsKeyword(item, ['旅行', 'trip', 'travel']),
  },
  {
    icon: 'calendar-outline',
    matches: (item) => containsKeyword(item, ['イベント', 'event', 'ライブ', 'concert']),
  },
];

export function getImportantDayIconName(item: ImportantDay): ImportantDayIconName {
  return RULES.find((rule) => rule.matches(item))?.icon ?? 'sparkles-outline';
}

export function getImportantDayMarker(item: ImportantDay) {
  if (RULES[0].matches(item)) return '🎂';
  if (RULES[1].matches(item)) return '♡';
  if (RULES[2].matches(item)) return '✈';
  if (RULES[3].matches(item)) return '★';
  return '✦';
}

function containsKeyword(item: ImportantDay, keywords: string[]) {
  const haystack = `${item.name} ${item.type}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}
