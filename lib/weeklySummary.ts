import { getTagLabelMap, type TagCatalog, type ReviewItem } from './storage';

export type WeeklySummaryEntry = {
  date: string;
  mood: number | null;
  category: string;
  templateName: string;
  answers: Record<string, string>;
  actionTags: string[];
  stateTags: string[];
  favorite: boolean;
};

export type WeeklySummarySource = {
  weekStart: string;
  weekEnd: string;
  reviewCount: number;
  recordedDays: number;
  missingDays: number;
  entries: WeeklySummaryEntry[];
};

export function buildWeeklySummarySource(
  reviews: ReviewItem[],
  tagCatalog: TagCatalog,
  anchorDate = new Date()
): WeeklySummarySource {
  const { start, end } = getWeekRange(anchorDate);
  const startKey = toLocalDateKey(start);
  const endKey = toLocalDateKey(end);
  const tagLabelMap = getTagLabelMap(tagCatalog);

  const entries = reviews
    .filter((review) => isDateWithinWeek(review.createdAt, start, end))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map<WeeklySummaryEntry>((review) => ({
      date: toLocalDateKey(new Date(review.createdAt)),
      mood: review.mood ?? null,
      category: review.category,
      templateName: review.templateName,
      answers: cleanAnswers(review.answers),
      actionTags: review.actionTagIds
        .map((id) => tagLabelMap.get(id))
        .filter((value): value is string => Boolean(value)),
      stateTags: review.stateTagIds
        .map((id) => tagLabelMap.get(id))
        .filter((value): value is string => Boolean(value)),
      favorite: Boolean(review.isFavorite),
    }));

  const recordedDays = new Set(entries.map((entry) => entry.date)).size;

  return {
    weekStart: startKey,
    weekEnd: endKey,
    reviewCount: entries.length,
    recordedDays,
    missingDays: Math.max(7 - recordedDays, 0),
    entries,
  };
}

export function getWeekRange(anchorDate = new Date()) {
  const start = new Date(anchorDate);
  start.setHours(0, 0, 0, 0);

  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function toLocalDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatWeekLabel(weekStart: string, weekEnd: string) {
  const start = weekStart.slice(5).replace('-', '/');
  const end = weekEnd.slice(5).replace('-', '/');
  return `${start} - ${end}`;
}

function isDateWithinWeek(isoDate: string, start: Date, end: Date) {
  const target = new Date(isoDate).getTime();
  return target >= start.getTime() && target <= end.getTime();
}

function cleanAnswers(answers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(answers).filter(([, value]) => value.trim().length > 0)
  );
}
