import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { runCsvReviewImport, type CsvImportPicker, type CsvImportResult } from '../lib/csvImport';
import { theme } from '../lib/theme';

type Props = {
  pickCsvText?: CsvImportPicker;
};

export default function SettingsImportSection({ pickCsvText }: Props) {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);

  const handleImport = async () => {
    try {
      setIsImporting(true);
      const nextResult = await runCsvReviewImport({ pickCsvText });

      if (!nextResult) return;

      setResult(nextResult);
      Alert.alert(nextResult.title, nextResult.message);
    } catch (error) {
      console.error(error);
      const failureResult: CsvImportResult = {
        kind: 'error',
        title: 'CSV の取り込みに失敗しました',
        message: 'CSV の取り込み中にエラーが発生しました。',
        importedCount: 0,
        issues: [],
      };
      setResult(failureResult);
      Alert.alert(failureResult.title, failureResult.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View testID="settings-import-section">
      <Text style={styles.sectionBody}>
        Notion の CSV を読み込んで、現在の振り返り形式に変換して保存します。重複した日付や不正な行はスキップされます。
      </Text>
      <Pressable
        testID="settings-import-button"
        style={[styles.linkButton, isImporting && styles.disabledButton]}
        onPress={() => {
          void handleImport();
        }}
        disabled={isImporting}
      >
        <Text style={styles.linkButtonText}>
          {isImporting ? 'CSV を取り込み中...' : 'CSV を選ぶ'}
        </Text>
      </Pressable>

      {result ? (
        <View
          testID="settings-import-result"
          style={[
            styles.resultCard,
            result.kind === 'success' ? styles.resultSuccess : styles.resultError,
          ]}
        >
          <Text style={styles.resultTitle}>{result.title}</Text>
          <Text style={styles.resultMessage}>{result.message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBody: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },
  linkButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  linkButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  resultCard: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  resultSuccess: {
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.success,
  },
  resultError: {
    backgroundColor: theme.colors.dangerSoft,
    borderColor: theme.colors.danger,
  },
  resultTitle: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  resultMessage: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
});
