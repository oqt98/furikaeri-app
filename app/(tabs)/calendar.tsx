import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SwipeTabPage from '../../components/SwipeTabPage';
import { getMoodOption } from '../../data/reviewOptions';
import {
  formatImportantDayCountdown,
  getImportantDays,
  getImportantDaysForDateKey,
  type ImportantDay,
} from '../../lib/importantDays';
import {
  deleteReview,
  getReviews,
  getTagCatalog,
  toggleFavoriteReview,
  type ReviewItem,
} from '../../lib/storage';
import { useAppTheme } from '../../lib/theme-context';
import { createCardShadow, getTheme } from '../../lib/theme';

type CalendarCell = {
  date: Date;
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
};

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createCalendarStyles(theme), [theme]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [importantDays, setImportantDays] = useState<ImportantDay[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(new Date()));
  const [tagLabelMap, setTagLabelMap] = useState<Map<string, string>>(new Map());

  const loadData = useCallback(async () => {
    const [data, tagCatalog, importantDayList] = await Promise.all([
      getReviews(),
      getTagCatalog(),
      getImportantDays(),
    ]);
    setReviews(data);
    setImportantDays(importantDayList);
    setTagLabelMap(
      new Map([...tagCatalog.action, ...tagCatalog.state].map((tag) => [tag.id, tag.label]))
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const reviewsByDate = useMemo(() => {
    const grouped: Record<string, ReviewItem[]> = {};
    for (const item of reviews) {
      const key = toDateKey(new Date(item.createdAt));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
    return grouped;
  }, [reviews]);

  const calendarCells = useMemo(() => buildCalendarCells(currentMonth), [currentMonth]);
  const selectedReviews = useMemo(
    () =>
      [...(reviewsByDate[selectedDateKey] ?? [])].sort((a, b) => {
        const favoriteA = a.isFavorite ? 1 : 0;
        const favoriteB = b.isFavorite ? 1 : 0;
        if (favoriteA !== favoriteB) return favoriteB - favoriteA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [reviewsByDate, selectedDateKey]
  );
  const selectedImportantDays = useMemo(
    () => getImportantDaysForDateKey(selectedDateKey, importantDays),
    [importantDays, selectedDateKey]
  );

  const handleCreate = () => {
    router.push({
      pathname: '/templates',
      params: { date: selectedDateKey },
    });
  };

  const handleEdit = (item: ReviewItem) => {
    router.push({
      pathname: '/entry',
      params: { reviewId: item.id },
    });
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteReview(id);
      await loadData();
    } catch (error) {
      console.error(error);
      Alert.alert('削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFavorite = async (item: ReviewItem) => {
    try {
      setFavoriteLoadingId(item.id);
      await toggleFavoriteReview(item.id);
      await loadData();
    } catch (error) {
      console.error(error);
      Alert.alert('お気に入りの更新に失敗しました');
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  return (
    <SwipeTabPage tabKey="calendar">
      <ScrollView
        testID="screen-calendar"
        contentContainerStyle={styles.container}
      >
        <Text style={styles.title}>カレンダー</Text>
        <Text style={styles.subtitle}>
          日付ごとに記録と大切な日をまとめて見返せます。
        </Text>

        <View style={styles.monthCard}>
          <Pressable
            style={styles.monthButton}
            onPress={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
          >
            <Ionicons name="chevron-back" size={18} color={theme.colors.primaryDark} />
          </Pressable>

          <View style={styles.monthHeaderText}>
            <Text style={styles.monthLabel}>
              {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
            </Text>
            <Text style={styles.monthCaption}>記録数と大切な日を日付ごとに表示します</Text>
          </View>

          <Pressable
            style={styles.monthButton}
            onPress={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
          >
            <Ionicons name="chevron-forward" size={18} color={theme.colors.primaryDark} />
          </Pressable>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.weekRow}>
            {WEEK_LABELS.map((label) => (
              <View key={label} style={styles.weekCell}>
                <Text style={styles.weekLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarCells.map((cell) => {
              const dayReviews = reviewsByDate[cell.dateKey] ?? [];
              const dayImportantDays = getImportantDaysForDateKey(cell.dateKey, importantDays);
              const count = dayReviews.length;
              const hasFavorite = dayReviews.some((item) => item.isFavorite);
              const hasImportantDay = dayImportantDays.length > 0;
              const selected = cell.dateKey === selectedDateKey;
              const today = cell.dateKey === toDateKey(new Date());

              return (
                <Pressable
                  key={cell.dateKey}
                  testID={`calendar-day-${cell.dateKey}`}
                  style={[
                    styles.dayCell,
                    getHeatStyle(count, theme.name),
                    selected && styles.dayCellSelected,
                    hasFavorite && !selected && styles.favoriteDayCell,
                    !cell.isCurrentMonth && styles.dayCellOutside,
                  ]}
                  onPress={() => {
                    setSelectedDateKey(cell.dateKey);
                    if (
                      cell.date.getFullYear() !== currentMonth.getFullYear() ||
                      cell.date.getMonth() !== currentMonth.getMonth()
                    ) {
                      setCurrentMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                    }
                  }}
                >
                  {hasFavorite ? (
                    <Ionicons
                      name="heart"
                      size={10}
                      color={selected ? theme.colors.white : theme.colors.danger}
                      style={styles.favoriteDayIcon}
                    />
                  ) : null}

                  {hasImportantDay ? (
                    <View
                      testID={`calendar-important-day-marker-${cell.dateKey}`}
                      style={[
                        styles.importantDayDot,
                        selected && styles.importantDayDotSelected,
                      ]}
                    />
                  ) : null}

                  <Text
                    style={[
                      styles.dayText,
                      selected && styles.dayTextSelected,
                      !cell.isCurrentMonth && styles.dayTextOutside,
                      today && !selected && styles.dayTextToday,
                    ]}
                  >
                    {cell.day}
                  </Text>
                  <Text style={[styles.dayCount, selected && styles.dayCountSelected]}>
                    {count > 0 ? count : ' '}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionLabel}>選択中の日付</Text>
            <Text style={styles.sectionTitle}>{formatDateLabel(selectedDateKey)}</Text>
          </View>

          <Pressable testID="calendar-create-button" style={styles.createButton} onPress={handleCreate}>
            <Ionicons name="add" size={16} color={theme.colors.white} />
            <Text style={styles.createButtonText}>この日に記録</Text>
          </Pressable>
        </View>

        {selectedImportantDays.length > 0 ? (
          <View style={styles.importantDaysCard}>
            <Text style={styles.importantDaysTitle}>大切な日</Text>
            {selectedImportantDays.map((item) => (
              <View key={item.id} style={styles.importantDayRow}>
                <View style={styles.importantDayBadge}>
                  <Ionicons name="sparkles-outline" size={14} color={theme.colors.warning} />
                  <Text style={styles.importantDayBadgeText}>{item.type}</Text>
                </View>
                <Text
                  testID={`selected-important-day-${item.id}`}
                  style={styles.importantDayText}
                >
                  {item.name} ・ {formatImportantDayCountdown(item.date, item.isRecurringAnnual)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {selectedReviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>この日の記録はまだありません</Text>
            <Text style={styles.emptyText}>
              テンプレートを選んで、その日のことを残せます。
            </Text>
          </View>
        ) : (
          selectedReviews.map((item) => {
            const isDeleting = deletingId === item.id;
            const isFavoriteLoading = favoriteLoadingId === item.id;
            const mood = item.mood ? getMoodOption(item.mood) : null;
            const stateTags = item.stateTagIds
              .map((id) => tagLabelMap.get(id))
              .filter(Boolean)
              .join(' / ');

            return (
              <View key={item.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewHeaderText}>
                    <Text style={styles.reviewTitle}>{item.templateName}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(item.createdAt).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.favoriteButton}
                    onPress={() => handleFavorite(item)}
                    disabled={isFavoriteLoading}
                  >
                    <Ionicons
                      name={item.isFavorite ? 'heart' : 'heart-outline'}
                      size={18}
                      color={theme.colors.danger}
                    />
                  </Pressable>
                </View>

                <View style={styles.badgesRow}>
                  <Badge label={item.category} tone="primary" />
                  {mood ? <Badge label={`${mood.emoji} ${mood.label}`} tone="muted" /> : null}
                </View>

                {stateTags ? <Text style={styles.stateSummary}>状態タグ: {stateTags}</Text> : null}

                <View style={styles.answerBox}>
                  {Object.entries(item.answers ?? {})
                    .filter(([, value]) => value.trim())
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <View key={key} style={styles.answerBlock}>
                        <Text style={styles.answerKey}>{key}</Text>
                        <Text style={styles.answerValue}>{value}</Text>
                      </View>
                    ))}
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.editButton} onPress={() => handleEdit(item)}>
                    <Text style={styles.editButtonText}>編集</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
                    onPress={() =>
                      Alert.alert(
                        'この記録を削除しますか？',
                        `${item.templateName} を削除します。`,
                        [
                          { text: 'キャンセル', style: 'cancel' },
                          {
                            text: '削除する',
                            style: 'destructive',
                            onPress: () => {
                              void handleDelete(item.id);
                            },
                          },
                        ]
                      )
                    }
                    disabled={isDeleting}
                  >
                    <Text style={styles.deleteButtonText}>
                      {isDeleting ? '削除中...' : '削除'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SwipeTabPage>
  );
}

function Badge({ label, tone }: { label: string; tone: 'primary' | 'muted' }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createCalendarStyles(theme), [theme]);

  return (
    <View style={[styles.badge, tone === 'primary' ? styles.badgePrimary : styles.badgeMuted]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function buildCalendarCells(baseMonth: Date): CalendarCell[] {
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

export function getHeatStyle(count: number, themeName: keyof typeof themeHeatPalettes) {
  const palette = themeHeatPalettes[themeName] ?? themeHeatPalettes.light;
  if (count >= 4) return { backgroundColor: palette[3] };
  if (count >= 3) return { backgroundColor: palette[2] };
  if (count >= 2) return { backgroundColor: palette[1] };
  if (count >= 1) return { backgroundColor: palette[0] };
  return null;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

const themeHeatPalettes = {
  light: ['#f4ede5', '#eadbcc', '#d7c0ab', '#be9d82'],
  warm: ['#fde8dc', '#f7d2bc', '#eab291', '#d48c64'],
  rose: ['#fde7ed', '#f7cad7', '#eb9db4', '#cf7390'],
  amber: ['#fae9c6', '#f5d796', '#e6b85d', '#c58a2b'],
  green: ['#e3efe1', '#cfe2cb', '#9fc09f', '#6e9a73'],
  mint: ['#dff0eb', '#c0e5db', '#88c6b3', '#4e9c88'],
  blue: ['#e2ebf8', '#c7d8f1', '#90b0de', '#5b82bf'],
  navy: ['#2c3550', '#39456a', '#51608f', '#7087c4'],
};

export function createCalendarStyles(theme = getTheme('light')) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
      paddingBottom: 120,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xl,
    },
    monthCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    monthButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primarySoft,
    },
    monthHeaderText: {
      alignItems: 'center',
      flexShrink: 1,
      paddingHorizontal: theme.spacing.sm,
    },
    monthLabel: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: 4,
    },
    monthCaption: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
    },
    calendarCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
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
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      position: 'relative',
    },
    dayCellSelected: {
      backgroundColor: theme.colors.primary,
    },
    favoriteDayCell: {
      borderWidth: 2,
      borderColor: theme.colors.danger,
    },
    importantDayDot: {
      position: 'absolute',
      top: 6,
      left: 6,
      width: 8,
      height: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.warning,
    },
    importantDayDotSelected: {
      backgroundColor: theme.colors.white,
    },
    favoriteDayIcon: {
      position: 'absolute',
      top: 6,
      right: 6,
    },
    dayCellOutside: {
      opacity: 0.35,
    },
    dayText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    dayTextSelected: {
      color: theme.colors.white,
    },
    dayTextOutside: {
      color: theme.colors.textSoft,
    },
    dayTextToday: {
      textDecorationLine: 'underline',
    },
    dayCount: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.primaryDark,
      marginTop: 2,
    },
    dayCountSelected: {
      color: theme.colors.white,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    sectionLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: 4,
    },
    sectionTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
    },
    createButtonText: {
      ...theme.typography.caption,
      color: theme.colors.white,
    },
    importantDaysCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    importantDaysTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    importantDayRow: {
      marginTop: theme.spacing.sm,
    },
    importantDayBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      marginBottom: 6,
    },
    importantDayBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    importantDayText: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    emptyCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xxl,
    },
    emptyTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    emptyText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    reviewCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.md,
    },
    reviewHeaderText: {
      flex: 1,
    },
    reviewTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    reviewDate: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
    },
    favoriteButton: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.dangerSoft,
    },
    badgesRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    badge: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    badgePrimary: {
      backgroundColor: theme.colors.primarySoft,
    },
    badgeMuted: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    badgeText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    stateSummary: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.md,
    },
    answerBox: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
    },
    answerBlock: {
      marginBottom: theme.spacing.sm,
    },
    answerKey: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: 4,
    },
    answerValue: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
    editButton: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
    },
    editButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    deleteButton: {
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    deleteButtonText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
  });
}
