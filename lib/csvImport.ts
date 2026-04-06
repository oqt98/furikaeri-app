import { File } from 'expo-file-system';
import { parseNotionCsv, type NotionImportIssue } from './notionImport';
import { importReviews } from './storage';

export type CsvImportPicker = () => Promise<string | null>;

export type CsvImportResult = {
  kind: 'success' | 'error';
  title: string;
  message: string;
  importedCount: number;
  issues: NotionImportIssue[];
};

export async function pickCsvTextFromDevice() {
  const selected = await File.pickFileAsync(undefined, 'text/*');
  const pickedFile = Array.isArray(selected) ? selected[0] : selected;
  return pickedFile ? pickedFile.text() : null;
}

export async function runCsvReviewImport({
  pickCsvText = pickCsvTextFromDevice,
}: {
  pickCsvText?: CsvImportPicker;
} = {}): Promise<CsvImportResult | null> {
  try {
    const csvText = await pickCsvText();
    if (!csvText) return null;

    const parsed = parseNotionCsv(csvText);

    if (parsed.drafts.length === 0) {
      return {
        kind: 'error',
        title: 'CSV を取り込めませんでした',
        message: buildImportResultMessage(0, parsed.issues),
        importedCount: 0,
        issues: parsed.issues,
      };
    }

    const imported = await importReviews(parsed.drafts);
    const issues = parsed.issues.concat(
      imported.skipped.map((item) => ({
        rowNumber: item.sourceRowNumber ?? 0,
        reason: item.reason,
      }))
    );

    return {
      kind: 'success',
      title: 'CSV を取り込みました',
      message: buildImportResultMessage(imported.importedCount, issues),
      importedCount: imported.importedCount,
      issues,
    };
  } catch (error) {
    if (isCancelledFilePick(error)) {
      return null;
    }

    throw error;
  }
}

export function isCancelledFilePick(error: unknown) {
  return error instanceof Error && /cancel/i.test(error.message);
}

export function buildImportResultMessage(
  importedCount: number,
  issues: NotionImportIssue[]
) {
  const issueLines = issues
    .filter((item) => item.reason)
    .slice(0, 5)
    .map((item) =>
      item.rowNumber > 0 ? `${item.rowNumber} 行目: ${item.reason}` : item.reason
    );

  return [
    `${importedCount} 件を取り込みました。`,
    issues.length > 0
      ? `${issues.length} 件はスキップされました。`
      : 'スキップはありません。',
    issueLines.length > 0 ? '' : null,
    ...issueLines,
  ]
    .filter(Boolean)
    .join('\n');
}
