export const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: 'かなり低め' },
  { value: 2, emoji: '😕', label: 'やや低め' },
  { value: 3, emoji: '😐', label: 'ふつう' },
  { value: 4, emoji: '🙂', label: 'よかった' },
  { value: 5, emoji: '😄', label: 'かなりよかった' },
] as const;

export const MOOD_VALUES = MOOD_OPTIONS.map((item) => item.value) as [
  1,
  2,
  3,
  4,
  5,
];

export const CATEGORIES = ['仕事', 'プライベート'] as const;
export const CATEGORY_FILTER_OPTIONS = ['すべて', ...CATEGORIES] as const;

export type MoodValue = (typeof MOOD_VALUES)[number];
export type MoodOption = (typeof MOOD_OPTIONS)[number];
export type CategoryOption = (typeof CATEGORIES)[number];
export type CategoryFilterOption = (typeof CATEGORY_FILTER_OPTIONS)[number];

export function getMoodOption(value?: number | null) {
  return MOOD_OPTIONS.find((item) => item.value === value) ?? MOOD_OPTIONS[2];
}
