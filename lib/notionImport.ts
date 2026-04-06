import { CATEGORIES, type CategoryOption, type MoodValue } from '../data/reviewOptions';
import { templates } from '../data/templates';

export type NotionImportIssue = {
  rowNumber: number;
  reason: string;
};

export type NotionImportDraft = {
  sourceRowNumber: number;
  createdAt: string;
  category: CategoryOption;
  mood: MoodValue;
  templateId: string;
  templateName: string;
  answers: Record<string, string>;
  importSource: 'notion-import';
  importFingerprint: string;
};

export type NotionImportParseResult = {
  drafts: NotionImportDraft[];
  issues: NotionImportIssue[];
  readCount: number;
};

const REQUIRED_HEADERS = {
  title: ['タイトル', 'title'],
  mood: ['今日の気分', 'mood'],
  date: ['日付', 'date'],
} as const;

const DEFAULT_TEMPLATE =
  templates.find((template) => template.id === 'diary') ?? templates[0];

export function parseNotionCsv(csvText: string): NotionImportParseResult {
  const rows = parseCsv(csvText);

  if (rows.length === 0) {
    return {
      drafts: [],
      issues: [{ rowNumber: 1, reason: 'CSV が空です。' }],
      readCount: 0,
    };
  }

  const [headerRow, ...dataRows] = rows;
  const normalizedHeaders = headerRow.map((value) => normalizeHeader(value));
  const headerIndex = {
    title: findRequiredHeaderIndex(normalizedHeaders, REQUIRED_HEADERS.title),
    mood: findRequiredHeaderIndex(normalizedHeaders, REQUIRED_HEADERS.mood),
    date: findRequiredHeaderIndex(normalizedHeaders, REQUIRED_HEADERS.date),
  };

  const missingHeaders = Object.entries(headerIndex)
    .filter(([, index]) => index === undefined)
    .map(([key]) => key);

  if (missingHeaders.length > 0) {
    return {
      drafts: [],
      issues: [
        {
          rowNumber: 1,
          reason: `必須列が不足しています: ${missingHeaders.join(', ')}`,
        },
      ],
      readCount: 0,
    };
  }

  const titleIndex = headerIndex.title as number;
  const moodIndex = headerIndex.mood as number;
  const dateIndex = headerIndex.date as number;

  const drafts: NotionImportDraft[] = [];
  const issues: NotionImportIssue[] = [];
  let readCount = 0;

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const title = readCell(row, titleIndex).trim();
    const moodValue = readCell(row, moodIndex).trim();
    const dateValue = readCell(row, dateIndex).trim();

    if (!title && !moodValue && !dateValue) {
      return;
    }

    readCount += 1;

    if (!title) {
      issues.push({ rowNumber, reason: 'タイトルが空です。' });
      return;
    }

    const createdAt = parseNotionDate(dateValue);
    if (!createdAt) {
      issues.push({ rowNumber, reason: '日付を解釈できませんでした。' });
      return;
    }

    const mood = mapNotionMood(moodValue);

    drafts.push({
      sourceRowNumber: rowNumber,
      createdAt,
      category: CATEGORIES[0],
      mood,
      templateId: DEFAULT_TEMPLATE.id,
      templateName: DEFAULT_TEMPLATE.name,
      answers: {
        title,
      },
      importSource: 'notion-import',
      importFingerprint: buildNotionFingerprint({
        dateKey: toDateKey(new Date(createdAt)),
        title,
        mood,
      }),
    });
  });

  drafts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    drafts,
    issues,
    readCount,
  };
}

function parseCsv(text: string) {
  const source = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase();
}

function findRequiredHeaderIndex(headers: string[], aliases: readonly string[]) {
  const normalizedAliases = aliases.map((alias) => alias.trim().toLowerCase());
  const index = headers.findIndex((header) => normalizedAliases.includes(header));
  return index >= 0 ? index : undefined;
}

function readCell(row: string[], index: number) {
  return row[index] ?? '';
}

function parseNotionDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const slashMatch = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return buildIsoDate(Number(year), Number(month), Number(day));
  }

  const dashMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashMatch) {
    const [, year, month, day] = dashMatch;
    return buildIsoDate(Number(year), Number(month), Number(day));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapNotionMood(value: string): MoodValue {
  const normalized = value.replace(/\s+/g, '');

  if (normalized === '☀') return 5;
  if (normalized === '☀,☁' || normalized === '☀,☁,' || normalized === '☀,☁︎') {
    return 4;
  }
  if (normalized === '☁') return 3;
  if (normalized === '☔') return 2;

  return 3;
}

function buildNotionFingerprint({
  dateKey,
  title,
  mood,
}: {
  dateKey: string;
  title: string;
  mood: MoodValue;
}) {
  return ['notion-import', dateKey, normalizeFingerprintValue(title), String(mood)].join(
    '::'
  );
}

function normalizeFingerprintValue(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildIsoDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.toISOString();
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
