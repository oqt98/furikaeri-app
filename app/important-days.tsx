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
  isValidImportantDayDate,
  type ImportantDay,
  type ImportantDayType,
} from '../lib/importantDays';
import { saveImportantDay } from '../lib/importantDays';
import { useAppTheme } from '../lib/theme-context';
import { createCardShadow } from '../lib/theme';

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

type CalendarCell = {
  date: Date;
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
};

export default function ImportantDaysScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState<ImportantDay[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [yearInput, setYearInput] = useState('');
  const [monthInput, setMonthInput] = useState('');
  const [dayInput, setDayInput] = useState('');
  const [type, setType] = useState<ImportantDayType>('大切な日');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const load = useCallback(async () => {
    setItems(await getImportantDays());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDate('');
    setYearInput('');
    setMonthInput('');
    setDayInput('');
    setType('大切な日');
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const syncInputsFromDate = (nextDate: string) => {
    setDate(nextDate);
    if (!isValidImportantDayDate(nextDate)) return;

    const [year, month, day] = nextDate.split('-');
    setYearInput(year);
    setMonthInput(String(Number(month)));
    setDayInput(String(Number(day)));
    setCalendarMonth(new Date(Number(year), Number(month) - 1, 1));
  };

  const syncDateFromParts = (nextYear: string, nextMonth: string, nextDay: string) => {
    setYearInput(nextYear);
    setMonthInput(nextMonth);
    setDayInput(nextDay);

    if (nextYear.length !== 4 || !nextMonth || !nextDay) {
      setDate('');
      return;
    }

    const normalized = `${nextYear}-${nextMonth.padStart(2, '0')}-${nextDay.padStart(2, '0')}`;
    setDate(normalized);

    if (isValidImportantDayDate(normalized)) {
      setCalendarMonth(new Date(Number(nextYear), Number(nextMonth) - 1, 1));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('名前を入力してください');
      return;
    }
    if (!isValidImportantDayDate(date)) {
      Alert.alert('日付を正しく入力してください');
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
        subtitle="カレンダーでも、年・月・日入力でも登録できます。"
      />

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>{editingId ? '大切な日を編集' : '大切な日を追加'}</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例: 誕生日"
          placeholderTextColor={theme.colors.textSoft}
        />

        <Text style={styles.fieldLabel}>日付</Text>
        <View style={styles.partsRow}>
          <TextInput
            style={[styles.input, styles.partInputYear]}
            value={yearInput}
            onChangeText={(value) => syncDateFromParts(value.replace(/[^\d]/g, '').slice(0, 4), monthInput, dayInput)}
            placeholder="年"
            keyboardType="number-pad"
            placeholderTextColor={theme.colors.textSoft}
          />
          <TextInput
            style={[styles.input, styles.partInput]}
            value={monthInput}
            onChangeText={(value) => syncDateFromParts(yearInput, value.replace(/[^\d]/g, '').slice(0, 2), dayInput)}
            placeholder="月"
            keyboardType="number-pad"
            placeholderTextColor={theme.colors.textSoft}
          />
          <TextInput
            style={[styles.input, styles.partInput]}
            value={dayInput}
            onChangeText={(value) => syncDateFromParts(yearInput, monthInput, value.replace(/[^\d]/g, '').slice(0, 2))}
            placeholder="日"
            keyboardType="number-pad"
            placeholderTextColor={theme.colors.textSoft}
          />
        </View>

        <TextInput
          style={styles.input}
          value={date}
          onChangeText={syncInputsFromDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textSoft}
          autoCapitalize="none"
        />

        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <Pressable
              style={styles.monthButton}
              onPress={() =>
                setCalendarMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                )
              }
            >
              <Ionicons name="chevron-back" size={18} color={theme.colors.primaryDark} />
            </Pressable>
            <Text style={styles.monthLabel}>
              {calendarMonth.getFullYear()}年 {calendarMonth.getMonth() + 1}月
            </Text>
            <Pressable
              style={styles.monthButton}
              onPress={() =>
                setCalendarMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                )
              }
            >
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primaryDark} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEK_LABELS.map((label) => (
              <View key={label} style={styles.weekCell}>
                <Text style={styles.weekLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarCells.map((cell) => {
              const active = cell.dateKey === date;
              return (
                <Pressable
                  key={cell.dateKey}
                  style={[
                    styles.dayCell,
                    active && styles.dayCellActive,
                    !cell.isCurrentMonth && styles.dayCellOutside,
                  ]}
                  onPress={() => syncInputsFromDate(cell.dateKey)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      active && styles.dayTextActive,
                      !cell.isCurrentMonth && styles.dayTextOutside,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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
          <Text style={styles.emptyBody}>気になる日を1件だけでも追加しておくと見返しやすくなります。</Text>
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
                  setType(item.type);
                  syncInputsFromDate(item.date);
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

function buildCalendarCells(baseMonth: Date): CalendarCell[] {
  const firstDayOfMonth = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1);
  const startDay = firstDayOfMonth.getDay();
  const calendarStartDate = new Date(firstDayOfMonth);
  calendarStartDate.setDate(firstDayOfMonth.getDate() - startDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStartDate);
    date.setDate(calendarStartDate.getDate() + index);
    return {
      date,
      dateKey: toDateKey(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === baseMonth.getMonth(),
    };
  });
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    fieldLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: theme.spacing.sm,
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
    partsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    partInputYear: {
      flex: 1.4,
    },
    partInput: {
      flex: 1,
    },
    calendarCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    monthButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    monthLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '700',
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
    },
    weekCell: {
      width: '14.2857%',
      alignItems: 'center',
    },
    weekLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.2857%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      marginBottom: 6,
    },
    dayCellActive: {
      backgroundColor: theme.colors.primary,
    },
    dayCellOutside: {
      opacity: 0.35,
    },
    dayText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    dayTextActive: {
      color: theme.colors.white,
    },
    dayTextOutside: {
      color: theme.colors.textSoft,
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
