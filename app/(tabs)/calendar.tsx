import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SwipeTabPage from '../../components/SwipeTabPage';
import {
  deleteReview,
  getReviews,
  ReviewItem,
  toggleFavoriteReview,
} from '../../lib/storage';

type CalendarCell = {
  date: Date;
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
};

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarScreen() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    toDateKey(new Date())
  );

  const loadReviews = async () => {
    const data = await getReviews();
    setReviews(data);
  };

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [])
  );

  const reviewsByDate = useMemo(() => {
    const grouped: Record<string, ReviewItem[]> = {};

    for (const item of reviews) {
      const key = toDateKey(new Date(item.createdAt));

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(item);
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => {
        const favoriteA = a.isFavorite ? 1 : 0;
        const favoriteB = b.isFavorite ? 1 : 0;

        if (favoriteA !== favoriteB) {
          return favoriteB - favoriteA;
        }

        return (
          new Date(b.updatedAt ?? b.createdAt).getTime() -
          new Date(a.updatedAt ?? a.createdAt).getTime()
        );
      });
    }

    return grouped;
  }, [reviews]);

  const calendarCells = useMemo(() => {
    return buildCalendarCells(currentMonth);
  }, [currentMonth]);

  const selectedReviews = useMemo(() => {
    return reviewsByDate[selectedDateKey] ?? [];
  }, [reviewsByDate, selectedDateKey]);

  const monthLabel = useMemo(() => {
    return `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;
  }, [currentMonth]);

  const selectedDateLabel = useMemo(() => {
    return formatSelectedDateLabel(selectedDateKey);
  }, [selectedDateKey]);

  const goPrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const goNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const handlePressDate = (dateKey: string, date: Date) => {
    setSelectedDateKey(dateKey);

    if (
      date.getFullYear() !== currentMonth.getFullYear() ||
      date.getMonth() !== currentMonth.getMonth()
    ) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const handleCreate = () => {
    router.push({
      pathname: '/entry',
      params: {
        date: selectedDateKey,
      },
    });
  };

  const handleEdit = (item: ReviewItem) => {
    router.push({
      pathname: '/entry',
      params: {
        reviewId: item.id,
      },
    });
  };

  const executeDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteReview(id);
      await loadReviews();
    } catch (error) {
      console.error(error);
      Alert.alert('削除に失敗しました', '時間をおいてもう一度お試しください。');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (item: ReviewItem) => {
    Alert.alert(
      'この振り返りを削除しますか？',
      `「${item.templateName}」を削除します。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            void executeDelete(item.id);
          },
        },
      ]
    );
  };

  const handleToggleFavorite = async (item: ReviewItem) => {
    try {
      setFavoriteLoadingId(item.id);
      await toggleFavoriteReview(item.id);
      await loadReviews();
    } catch (error) {
      console.error(error);
      Alert.alert(
        'お気に入り更新に失敗しました',
        '時間をおいてもう一度お試しください。'
      );
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPreviewAnswers = (answers: Record<string, string>) => {
    const entries = Object.entries(answers).filter(
      ([, value]) => value && value.trim() !== ''
    );

    return entries.slice(0, 2);
  };

  const truncateText = (text: string, maxLength = 42) => {
    if (!text) return '（未入力）';
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const getCategoryBadgeStyle = (category: '仕事' | 'プラベ') => {
    return category === '仕事' ? styles.workBadge : styles.privateBadge;
  };

  const getHeatLevel = (count: number) => {
    if (count >= 4) return 4;
    if (count >= 3) return 3;
    if (count >= 2) return 2;
    if (count >= 1) return 1;
    return 0;
  };

  const getHeatCellStyle = (level: number, isSelected: boolean) => {
    if (isSelected) return null;

    switch (level) {
      case 4:
        return styles.dayCellHeat4;
      case 3:
        return styles.dayCellHeat3;
      case 2:
        return styles.dayCellHeat2;
      case 1:
        return styles.dayCellHeat1;
      default:
        return null;
    }
  };

  return (
    <SwipeTabPage tabKey="calendar">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>カレンダー</Text>
        <Text style={styles.subtitle}>日付ごとに振り返りを見返せます</Text>

        <View style={styles.headerCard}>
          <Pressable style={styles.monthNavButton} onPress={goPrevMonth}>
            <Text style={styles.monthNavButtonText}>←</Text>
          </Pressable>

          <Text style={styles.monthLabel}>{monthLabel}</Text>

          <Pressable style={styles.monthNavButton} onPress={goNextMonth}>
            <Text style={styles.monthNavButtonText}>→</Text>
          </Pressable>
        </View>

        <View style={styles.heatLegendRow}>
          <Text style={styles.heatLegendLabel}>記録量</Text>
          <View style={styles.heatLegendItems}>
            <View style={[styles.heatLegendBox, styles.heatLegend0]} />
            <View style={[styles.heatLegendBox, styles.heatLegend1]} />
            <View style={[styles.heatLegendBox, styles.heatLegend2]} />
            <View style={[styles.heatLegendBox, styles.heatLegend3]} />
            <View style={[styles.heatLegendBox, styles.heatLegend4]} />
          </View>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.weekRow}>
            {WEEK_LABELS.map((label, index) => (
              <View key={label} style={styles.weekCell}>
                <Text
                  style={[
                    styles.weekLabel,
                    index === 0 && styles.sundayText,
                    index === 6 && styles.saturdayText,
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarCells.map((cell) => {
              const dayReviews = reviewsByDate[cell.dateKey] ?? [];
              const reviewCount = dayReviews.length;
              const isSelected = selectedDateKey === cell.dateKey;
              const isToday = cell.dateKey === toDateKey(new Date());
              const weekday = cell.date.getDay();
              const heatLevel = getHeatLevel(reviewCount);

              return (
                <Pressable
                  key={cell.dateKey}
                  style={[
                    styles.dayCell,
                    getHeatCellStyle(heatLevel, isSelected),
                    isSelected && styles.dayCellSelected,
                    !cell.isCurrentMonth && styles.dayCellOutside,
                  ]}
                  onPress={() => handlePressDate(cell.dateKey, cell.date)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      weekday === 0 && !isSelected && styles.sundayText,
                      weekday === 6 && !isSelected && styles.saturdayText,
                      !cell.isCurrentMonth && styles.dayTextOutside,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                    ]}
                  >
                    {cell.day}
                  </Text>

                  <View style={styles.markerArea}>
                    {reviewCount > 0 ? (
                      <Text
                        style={[
                          styles.marker,
                          isSelected && styles.markerSelected,
                        ]}
                      >
                        {reviewCount}
                      </Text>
                    ) : (
                      <Text style={styles.markerPlaceholder}> </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <View style={styles.listHeaderTextArea}>
              <Text style={styles.listTitle}>選択中: {selectedDateLabel}</Text>
              <Text style={styles.listCount}>
                {selectedReviews.length}件の振り返り
              </Text>
            </View>

            <Pressable style={styles.createButton} onPress={handleCreate}>
              <Text style={styles.createButtonText}>この日で作成</Text>
            </Pressable>
          </View>

          {selectedReviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>この日の記録はありません。</Text>
            </View>
          ) : (
            selectedReviews.map((item) => {
              const previewAnswers = getPreviewAnswers(item.answers);
              const isDeleting = deletingId === item.id;
              const isFavoriteLoading = favoriteLoadingId === item.id;

              return (
                <View key={item.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeaderRow}>
                    <View style={styles.reviewHeaderTextArea}>
                      <Text style={styles.reviewTitle}>{item.templateName}</Text>
                      <Text style={styles.reviewDate}>
                        {formatDateTime(item.createdAt)}
                      </Text>
                    </View>

                    <Pressable
                      style={styles.favoriteButton}
                      onPress={() => handleToggleFavorite(item)}
                      disabled={isFavoriteLoading}
                    >
                      <Text style={styles.favoriteButtonText}>
                        {item.isFavorite ? '★' : '☆'}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.categoryBadge,
                        getCategoryBadgeStyle(item.category),
                      ]}
                    >
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>

                    {item.mood ? (
                      <View style={styles.moodBadge}>
                        <Text style={styles.moodBadgeText}>{item.mood}</Text>
                      </View>
                    ) : null}
                  </View>

                  {item.tags && item.tags.length > 0 ? (
                    <View style={styles.tagsContainer}>
                      {item.tags.map((tag) => (
                        <View key={`${item.id}-${tag}`} style={styles.tagChip}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {item.photoUri ? (
                    <Image
                      source={{ uri: item.photoUri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : null}

                  <View style={styles.previewBox}>
                    {previewAnswers.length > 0 ? (
                      previewAnswers.map(([key, value]) => (
                        <View key={key} style={styles.answerBlock}>
                          <Text style={styles.answerKey}>{key}</Text>
                          <Text style={styles.answerValue}>
                            {truncateText(value)}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noAnswerText}>
                        未入力の振り返りです。
                      </Text>
                    )}
                  </View>

                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => handleEdit(item)}
                    >
                      <Text style={styles.editButtonText}>編集</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.deleteButton,
                        isDeleting && styles.deleteButtonDisabled,
                      ]}
                      onPress={() => confirmDelete(item)}
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
        </View>
      </ScrollView>
    </SwipeTabPage>
  );
}

function buildCalendarCells(baseMonth: Date): CalendarCell[] {
  const firstDayOfMonth = new Date(
    baseMonth.getFullYear(),
    baseMonth.getMonth(),
    1
  );
  const startDay = firstDayOfMonth.getDay();

  const calendarStartDate = new Date(firstDayOfMonth);
  calendarStartDate.setDate(firstDayOfMonth.getDate() - startDay);

  const cells: CalendarCell[] = [];

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(calendarStartDate);
    date.setDate(calendarStartDate.getDate() + i);

    cells.push({
      date,
      dateKey: toDateKey(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === baseMonth.getMonth(),
    });
  }

  return cells;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatSelectedDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f7f8fa',
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3e6eb',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#f5f7fb',
    borderWidth: 1,
    borderColor: '#dfe5ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  heatLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  heatLegendLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
  },
  heatLegendItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heatLegendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  heatLegend0: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  heatLegend1: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  heatLegend2: {
    backgroundColor: '#93c5fd',
    borderColor: '#60a5fa',
  },
  heatLegend3: {
    backgroundColor: '#60a5fa',
    borderColor: '#3b82f6',
  },
  heatLegend4: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3e6eb',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekCell: {
    width: '14.2857%',
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
  },
  sundayText: {
    color: '#dc2626',
  },
  saturdayText: {
    color: '#2563eb',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dayCellSelected: {
    backgroundColor: '#111827',
  },
  dayCellHeat1: {
    backgroundColor: '#eff6ff',
  },
  dayCellHeat2: {
    backgroundColor: '#dbeafe',
  },
  dayCellHeat3: {
    backgroundColor: '#93c5fd',
  },
  dayCellHeat4: {
    backgroundColor: '#60a5fa',
  },
  dayCellOutside: {
    opacity: 0.35,
  },
  dayText: {
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
  },
  dayTextOutside: {
    color: '#888',
  },
  dayTextSelected: {
    color: '#fff',
  },
  dayTextToday: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  markerArea: {
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  marker: {
    fontSize: 10,
    color: '#1d4ed8',
    lineHeight: 12,
    fontWeight: '700',
  },
  markerSelected: {
    color: '#fff',
  },
  markerPlaceholder: {
    fontSize: 10,
    color: 'transparent',
    lineHeight: 12,
  },
  listSection: {
    marginTop: 4,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  listHeaderTextArea: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  listCount: {
    fontSize: 13,
    color: '#666',
  },
  createButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e6eb',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e3e6eb',
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  reviewHeaderTextArea: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  reviewDate: {
    fontSize: 13,
    color: '#666',
  },
  favoriteButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButtonText: {
    fontSize: 22,
    color: '#f59e0b',
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  moodBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  moodBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  workBadge: {
    backgroundColor: '#eef4ff',
  },
  privateBadge: {
    backgroundColor: '#fff4ea',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: '#f5f7fb',
    borderWidth: 1,
    borderColor: '#e1e6ef',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tagText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#eef2f7',
  },
  previewBox: {
    backgroundColor: '#fafbfc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#edf0f4',
  },
  answerBlock: {
    marginBottom: 10,
  },
  answerKey: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  answerValue: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111',
  },
  noAnswerText: {
    color: '#666',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  editButton: {
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#bfd3ff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  editButtonText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#be123c',
    fontSize: 13,
    fontWeight: '700',
  },
});