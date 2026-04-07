import AsyncStorage from '@react-native-async-storage/async-storage';

const IMPORTANT_DAYS_KEY = 'furikaeri-important-days';

export type ImportantDayType = '記念日' | '誕生日' | '大切な日' | 'その他';

export type ImportantDay = {
  id: string;
  name: string;
  date: string;
  type: ImportantDayType;
  createdAt: string;
  updatedAt: string;
  isRecurringAnnual?: boolean;
};

export const IMPORTANT_DAY_TYPES: ImportantDayType[] = [
  '記念日',
  '誕生日',
  '大切な日',
  'その他',
];

export async function getImportantDays(): Promise<ImportantDay[]> {
  try {
    const raw = await AsyncStorage.getItem(IMPORTANT_DAYS_KEY);
    const parsed = raw ? (JSON.parse(raw) as ImportantDay[]) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item?.id && item?.name && item?.date && item?.type)
      .map(normalizeImportantDay)
      .sort((a, b) => getDaysUntil(a.date, a.isRecurringAnnual) - getDaysUntil(b.date, b.isRecurringAnnual));
  } catch (error) {
    console.error('getImportantDays error:', error);
    return [];
  }
}

export async function saveImportantDay(
  value: Pick<ImportantDay, 'name' | 'date' | 'type' | 'isRecurringAnnual'> & { id?: string }
) {
  const current = await getImportantDays();
  const now = new Date().toISOString();
  const existing = current.find((item) => item.id === value.id);
  const nextItem: ImportantDay = normalizeImportantDay({
    id: value.id ?? `important-day-${Date.now()}`,
    name: value.name.trim(),
    date: value.date,
    type: value.type,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    isRecurringAnnual: value.isRecurringAnnual ?? existing?.isRecurringAnnual ?? true,
  });

  const next = value.id
    ? current.map((item) => (item.id === value.id ? nextItem : item))
    : [nextItem, ...current];

  await AsyncStorage.setItem(IMPORTANT_DAYS_KEY, JSON.stringify(next));
}

export async function deleteImportantDay(id: string) {
  const current = await getImportantDays();
  const next = current.filter((item) => item.id !== id);
  await AsyncStorage.setItem(IMPORTANT_DAYS_KEY, JSON.stringify(next));
}

export function normalizeImportantDay(item: ImportantDay): ImportantDay {
  return {
    ...item,
    isRecurringAnnual: item.isRecurringAnnual ?? true,
  };
}

export function getDaysUntil(dateString: string, isRecurringAnnual = true) {
  const today = new Date();
  const target = getNextOccurrenceDate(dateString, isRecurringAnnual);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetStart = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );

  return Math.round(
    (targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function formatImportantDayCountdown(dateString: string, isRecurringAnnual = true) {
  const diff = getDaysUntil(dateString, isRecurringAnnual);
  if (diff === 0) return '今日です';
  if (diff === 1) return 'あと1日';
  return `あと${diff}日`;
}

export function isValidImportantDayDate(dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;

  const [year, month, day] = dateString.split('-').map(Number);
  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

export function getImportantDaysForDateKey(dateKey: string, items: ImportantDay[]) {
  if (!isValidImportantDayDate(dateKey)) return [];

  const [, targetMonth, targetDay] = dateKey.split('-').map(Number);
  return items.filter((item) => {
    if (!isValidImportantDayDate(item.date)) return false;

    const [year, month, day] = item.date.split('-').map(Number);
    if (item.isRecurringAnnual ?? true) {
      return month === targetMonth && day === targetDay;
    }

    return year === Number(dateKey.slice(0, 4)) && month === targetMonth && day === targetDay;
  });
}

export function getNextOccurrenceDate(dateString: string, isRecurringAnnual = true) {
  const [year, month, day] = dateString.split('-').map(Number);
  const today = new Date();

  if (!isRecurringAnnual) {
    return new Date(year, month - 1, day);
  }

  const candidate = new Date(today.getFullYear(), month - 1, day);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (candidate < todayStart) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }

  if (Number.isNaN(candidate.getTime())) {
    return new Date(year, month - 1, day);
  }

  return candidate;
}
