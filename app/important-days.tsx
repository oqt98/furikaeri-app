import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import BackHeader from '../components/BackHeader';
import {
  deleteImportantDay,
  formatImportantDayCountdown,
  getImportantDays,
  IMPORTANT_DAY_TYPES,
  type ImportantDay,
  type ImportantDayType,
  saveImportantDay,
} from '../lib/importantDays';
import { useAppTheme } from '../lib/theme-context';
import { createCardShadow } from '../lib/theme';

export default function ImportantDaysScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState<ImportantDay[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<ImportantDayType>('記念日');

  const load = useCallback(async () => {
    setItems(await getImportantDays());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDate('');
    setType('記念日');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('名前を入力してください。');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('日付は YYYY-MM-DD で入力してください。');
      return;
    }

    await saveImportantDay({
      id: editingId ?? undefined,
      name,
      date,
      type,
    });
    resetForm();
    await load();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackHeader
        title="大切な日"
        subtitle="主役ではないので、登録も一覧もできるだけシンプルにしています。"
      />

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>{editingId ? '大切な日を編集' : '大切な日を追加'}</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例: 家族旅行"
          placeholderTextColor={theme.colors.textSoft}
        />
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textSoft}
        />

        <View style={styles.typeRow}>
          {IMPORTANT_DAY_TYPES.map((item) => {
            const active = item === type;
            return (
              <Pressable
                key={item}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => setType(item)}
              >
                <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.formActions}>
          {editingId ? (
            <Pressable style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.saveButton} onPress={() => void handleSubmit()}>
            <Text style={styles.saveButtonText}>{editingId ? '更新する' : '追加する'}</Text>
          </Pressable>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>まだ登録はありません</Text>
          <Text style={styles.emptyBody}>必要なときだけ、1件ずつ追加していけます。</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemText}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.type} ・ {item.date} ・ {formatImportantDayCountdown(item.date)}
                </Text>
              </View>
              <Pressable
                style={styles.iconButton}
                onPress={() => {
                  setEditingId(item.id);
                  setName(item.name);
                  setDate(item.date);
                  setType(item.type);
                }}
              >
                <Ionicons name="create-outline" size={18} color={theme.colors.primaryDark} />
              </Pressable>
            </View>

            <Pressable
              style={styles.deleteButton}
              onPress={() =>
                Alert.alert('この大切な日を削除しますか？', '', [
                  { text: 'キャンセル', style: 'cancel' },
                  {
                    text: '削除する',
                    style: 'destructive',
                    onPress: () => {
                      void deleteImportantDay(item.id).then(load);
                    },
                  },
                ])
              }
            >
              <Text style={styles.deleteButtonText}>削除</Text>
            </Pressable>
          </View>
        ))
      )}
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
    formCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    input: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 14,
      color: theme.colors.text,
      fontSize: 15,
      marginBottom: theme.spacing.md,
    },
    typeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    typeChip: {
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    typeChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    typeChipText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    typeChipTextActive: {
      color: theme.colors.white,
    },
    formActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: theme.spacing.sm,
    },
    cancelButton: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelButtonText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 12,
    },
    saveButtonText: {
      ...theme.typography.caption,
      color: theme.colors.white,
    },
    emptyCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
    },
    emptyTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    emptyBody: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    itemCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    itemHeader: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    itemText: {
      flex: 1,
    },
    itemName: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: 4,
    },
    itemMeta: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    deleteButton: {
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
    },
    deleteButtonText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
  });
}
