import {
  CATEGORIES,
  MOOD_OPTIONS,
  type CategoryOption,
  type MoodValue,
} from '../data/reviewOptions';
import { templates } from '../data/templates';

export type NotionImportIssue = {
  rowNumber: number;
  reason: string;
};

export type NotionImportDraft = {
  sourceRowNumber: number;
  createdAt: string;
  category: CategoryOption;
  mood?: MoodValue;
  templateId: string;
  templateName: string;
  actionTags: string[];
  stateTags: string[];
  answers: Record<string, string>;
  isFavorite: boolean;
};

export type NotionImportParseResult = {
  drafts: NotionImportDraft[];
  issues: NotionImportIssue[];
};

export const NOTION_IMPORT_COLUMNS = {
  required: ['date', 'template'],
  optional: ['category', 'mood', 'favorite', 'action_tags', 'state_tags'],
  note: 'Template answer columns should use the existing field keys such as keep, problem, try, title, memo, glad, sad, mad.',
} as const;

const HEADER_ALIASES: Record<string, string[]> = {
  date: ['date', '日付', 'created_at', 'created at'],
  template: ['template', 'テンプレート', 'review template', 'template_name'],
  category: ['category', 'カテゴリ'],
  mood: ['mood', '気分', 'mood_value'],
  favorite: ['favorite', 'is_favorite', 'favorite_flag', 'お気に入り'],
  action_tags: ['action_tags', 'action tags', 'action tag', '行動タグ'],
  state_tags: ['state_tags', 'state tags', 'state tag', '状態タグ'],
};

const RAW_TEMPLATE_ALIASES: Array<[string, string[]]> = [
  ['diary', ['diary', 'journal', 'memo']],
  ['kpt', ['kpt']],
  ['ywt', ['ywt']],
  ['good3', ['good3', 'good 3', 'good-3']],
  ['ssc', ['ssc', 'start stop continue', 'start / stop / continue']],
  ['4ls', ['4ls', 'liked learned lacked longed for']],
  ['rose-thorn-bud', ['rose thorn bud', 'rose / thorn / bud']],
  ['sailboat', ['sailboat']],
  ['starfish', ['starfish']],
  ['glad-sad-mad', ['glad sad mad', 'glad / sad / mad']],
];

const TEMPLATE_ALIASES = new Map<string, string[]>(
  RAW_TEMPLATE_ALIASES.map(([id, aliases]) => [id, aliases.map(normalizeLookupValue)])
);

export function parseNotionCsv(csvText: string): NotionImportParseResult {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return {
      drafts: [],
      issues: [{ rowNumber: 1, reason: 'CSV が空です。' }],
    };
  }

  const [headerRow, ...dataRows] = rows;
  const normalizedHeaders = headerRow.map((value) => normalizeHeader(value));
  const headerLookup = new Map<string, number>();

  normalizedHeaders.forEach((header, index) => {
    if (!header || headerLookup.has(header)) return;
    headerLookup.set(header, index);
  });

  const missingRequiredHeaders = NOTION_IMPORT_COLUMNS.required.filter(
    (header) => findHeaderIndex(headerLookup, header) === undefined
  );

  if (missingRequiredHeaders.length > 0) {
    return {
      drafts: [],
      issues: [
        {
          rowNumber: 1,
          reason: `必須列が不足しています: ${missingRequiredHeaders.join(', ')}`,
        },
      ],
    };
  }

  const drafts: NotionImportDraft[] = [];
  const issues: NotionImportIssue[] = [];

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const record = buildRecord(normalizedHeaders, row);

    if (Object.values(record).every((value) => value.trim() === '')) {
      return;
    }

    const dateValue = findValue(record, 'date');
    const parsedDate = parseDateValue(dateValue);
    if (!parsedDate) {
      issues.push({ rowNumber, reason: 'date が不正です。' });
      return;
    }

    const matchedTemplate = findTemplate(findValue(record, 'template'));
    if (!matchedTemplate) {
      issues.push({ rowNumber, reason: 'template が既存テンプレートに一致しません。' });
      return;
    }

    const category = parseCategory(findValue(record, 'category'));
    const mood = parseMood(findValue(record, 'mood'));
    const actionTags = splitTagValue(findValue(record, 'action_tags'));
    const stateTags = splitTagValue(findValue(record, 'state_tags'));
    const answers = extractAnswers(record, matchedTemplate.id);

    const hasContent =
      Object.values(answers).some((value) => value.trim()) ||
      actionTags.length > 0 ||
      stateTags.length > 0;

    if (!hasContent) {
      issues.push({
        rowNumber,
        reason: '回答またはタグが空のため取り込み対象外です。',
      });
      return;
    }

    drafts.push({
      sourceRowNumber: rowNumber,
      createdAt: parsedDate,
      category,
      mood,
      templateId: matchedTemplate.id,
      templateName: matchedTemplate.name,
      actionTags,
      stateTags,
      answers,
      isFavorite: parseBoolean(findValue(record, 'favorite')),
    });
  });

  return { drafts, issues };
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

function buildRecord(headers: string[], row: string[]) {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    if (!header) return acc;
    acc[header] = (row[index] ?? '').trim();
    return acc;
  }, {});
}

function findValue(record: Record<string, string>, canonicalHeader: string) {
  const aliases = HEADER_ALIASES[canonicalHeader] ?? [canonicalHeader];
  const matchedHeader = aliases
    .map((alias) => normalizeHeader(alias))
    .find((header) => record[header] !== undefined);

  return matchedHeader ? record[matchedHeader] : '';
}

function findHeaderIndex(headerLookup: Map<string, number>, canonicalHeader: string) {
  const aliases = HEADER_ALIASES[canonicalHeader] ?? [canonicalHeader];
  return aliases
    .map((alias) => headerLookup.get(normalizeHeader(alias)))
    .find((value) => value !== undefined);
}

function findTemplate(value: string) {
  const normalized = normalizeLookupValue(value);
  if (!normalized) return null;

  return (
    templates.find((template) => {
      if (normalizeLookupValue(template.id) === normalized) return true;
      if (normalizeLookupValue(template.name) === normalized) return true;

      const aliases = TEMPLATE_ALIASES.get(template.id) ?? [];
      return aliases.includes(normalized);
    }) ?? null
  );
}

function parseDateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const localDate = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    return Number.isNaN(localDate.getTime()) ? null : localDate.toISOString();
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseCategory(value: string): CategoryOption {
  const normalized = normalizeLookupValue(value);

  return (
    CATEGORIES.find((category) => normalizeLookupValue(category) === normalized) ??
    CATEGORIES[0]
  );
}

function parseMood(value: string): MoodValue | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const numeric = Number(trimmed);
  if (Number.isInteger(numeric)) {
    const matched = MOOD_OPTIONS.find((item) => item.value === numeric);
    if (matched) return matched.value;
  }

  const normalized = normalizeLookupValue(trimmed);
  return MOOD_OPTIONS.find((item) => {
    const label = normalizeLookupValue(item.label);
    const emojiLabel = normalizeLookupValue(`${item.emoji} ${item.label}`);
    return normalized === label || normalized === emojiLabel;
  })?.value;
}

function parseBoolean(value: string) {
  const normalized = normalizeLookupValue(value);
  return ['true', '1', 'yes', 'y', 'on', 'favorite', '★', '☆'].includes(normalized);
}

function splitTagValue(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n/|、]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function extractAnswers(record: Record<string, string>, templateId: string) {
  const template = templates.find((item) => item.id === templateId);
  if (!template) return {};

  return template.fields.reduce<Record<string, string>>((acc, field) => {
    const fieldKeys = [
      normalizeHeader(field.key),
      normalizeHeader(field.label),
      normalizeHeader(`${template.id}_${field.key}`),
    ];
    const matchedKey = fieldKeys.find((key) => record[key] !== undefined);
    if (!matchedKey) return acc;

    const value = record[matchedKey].trim();
    if (!value) return acc;

    acc[field.key] = value;
    return acc;
  }, {});
}

function normalizeHeader(value: string) {
  const trimmed = value.replace(/^\uFEFF/, '').trim();
  const matchedAlias = Object.entries(HEADER_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalizeLookupValue(alias) === normalizeLookupValue(trimmed))
  );

  if (matchedAlias) return matchedAlias[0];
  return normalizeLookupValue(trimmed).replace(/\s+/g, '_');
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
