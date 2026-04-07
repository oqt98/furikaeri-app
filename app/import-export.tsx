import { Directory, File } from 'expo-file-system';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BackHeader from '../components/BackHeader';
import { parseNotionCsv } from '../lib/notionImport';
import { getReviews, importReviews } from '../lib/storage';
import { useAppTheme } from '../lib/theme-context';
import { createCardShadow } from '../lib/theme';

export default function ImportExportScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleImport = async () => {
    try {
      setIsImporting(true);
      const selected = await File.pickFileAsync(undefined, 'text/*');
      const pickedFile = Array.isArray(selected) ? selected[0] : selected;
      const csvText = await pickedFile.text();
      const parsed = parseNotionCsv(csvText);
      const imported = await importReviews(parsed.drafts);

      Alert.alert(
        'インポート結果',
        `読み込んだ行数: ${parsed.readCount}\n追加: ${imported.importedCount}\nスキップ: ${imported.skipped.length}\n形式エラー: ${parsed.issues.length}`
      );
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) {
        return;
      }
      console.error(error);
      Alert.alert('インポートに失敗しました。');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const directory = await Directory.pickDirectoryAsync();
      const reviews = await getReviews();
      const fileName = `furikaeri-export-${new Date().toISOString().slice(0, 10)}.json`;
      const exportFile = new File(directory.uri, fileName);
      exportFile.create({ overwrite: true, intermediates: true });
      exportFile.write(JSON.stringify(reviews, null, 2));

      Alert.alert('エクスポートしました。', `${fileName} を保存しました。`);
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) {
        return;
      }
      console.error(error);
      Alert.alert('エクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackHeader
        title="インポート / エクスポート"
        subtitle="たまに使う機能なので、ここにまとめています。"
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notion CSV を取り込む</Text>
        <Text style={styles.cardBody}>
          Notion から出した CSV を選ぶと、既存の記録に追加できます。
        </Text>
        <Pressable
          style={[styles.primaryButton, isImporting && styles.buttonDisabled]}
          onPress={() => void handleImport()}
          disabled={isImporting}
        >
          <Text style={styles.primaryButtonText}>
            {isImporting ? '読み込み中...' : 'CSV を選ぶ'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>記録を書き出す</Text>
        <Text style={styles.cardBody}>
          現在の記録を JSON 形式で保存できます。バックアップ用の最低限の書き出しです。
        </Text>
        <Pressable
          style={[styles.secondaryButton, isExporting && styles.buttonDisabled]}
          onPress={() => void handleExport()}
          disabled={isExporting}
        >
          <Text style={styles.secondaryButtonText}>
            {isExporting ? '書き出し中...' : '保存先を選ぶ'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
      paddingBottom: 80,
    },
    card: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    cardTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    cardBody: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.lg,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryButtonText: {
      ...theme.typography.caption,
      color: theme.colors.white,
    },
    secondaryButton: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.lg,
      paddingVertical: 14,
      alignItems: 'center',
    },
    secondaryButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
}
