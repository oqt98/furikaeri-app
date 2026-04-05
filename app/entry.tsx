import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TAGS } from '../data/tags';
import { templates } from '../data/templates';
import {
  getReviewById,
  ReviewItem,
  saveReview,
  updateReview,
} from '../lib/storage';

const moods = [
  '😊 うれしい',
  '😌 おだやか',
  '🤔 ふつう',
  '😓 つかれた',
  '😢 落ち込み',
] as const;

const categories = ['仕事', 'プラベ'] as const;
const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

type MoodOption = (typeof moods)[number];
type CategoryOption = (typeof categories)[number];

type CalendarCell = {
  date: Date;
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
};

export default function EntryScreen() {
  const { templateId, reviewId, date } = useLocalSearchParams();

  const rawTemplateId = Array.isArray(templateId) ? templateId[0] : templateId;
  const rawReviewId = Array.isArray(reviewId) ? reviewId[0] : reviewId;
  const rawDate = Array.isArray(date) ? date[0] : date;

  const initialDateKey =
    rawDate && isValidDateKey(rawDate) ? rawDate : toDateKey(new Date());

  const isEditMode = Boolean(rawReviewId);

  const [category, setCategory] = useState<CategoryOption>('仕事');
  const [mood, setMood] = useState<MoodOption>('🤔 ふつう');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [isInitializing, setIsInitializing] = useState(isEditMode);
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() =>
    dateKeyToMonth(initialDateKey)
  );
  const [photoUri, setPhotoUri] = useState('');

  useEffect(() => {
    if (!isEditMode || !rawReviewId) {
      setIsInitializing(false);
      return;
    }

    let isMounted = true;

    const loadReview = async () => {
      try {
        const review = await getReviewById(rawReviewId);

        if (!review) {
          Alert.alert('データが見つかりませんでした');
          router.replace('/(tabs)/history');
          return;
        }

        if (!isMounted) return;

        const reviewDateKey = toDateKey(new Date(review.createdAt));

        setEditingReview(review);
        setCategory(review.category);

        const nextMood = moods.includes(review.mood as MoodOption)
          ? (review.mood as MoodOption)
          : '🤔 ふつう';

        setMood(nextMood);
        setAnswers(review.answers ?? {});
        setSelectedTags(review.tags ?? []);
        setSelectedDateKey(reviewDateKey);
        setPickerMonth(dateKeyToMonth(reviewDateKey));
        setPhotoUri(review.photoUri ?? '');
      } catch (error) {
        console.error(error);
        Alert.alert('編集データの読み込みに失敗しました');
        router.replace('/(tabs)/history');
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    void loadReview();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, rawReviewId]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const selectedTemplate = useMemo(() => {
    if (editingReview) {
      const byId = editingReview.templateId
        ? templates.find((t) => t.id === editingReview.templateId)
        : undefined;

      if (byId) return byId;

      const byName = templates.find((t) => t.name === editingReview.templateName);
      if (byName) return byName;
    }

    if (rawTemplateId === 'random') {
      return templates[Math.floor(Math.random() * templates.length)];
    }

    return templates.find((t) => t.id === rawTemplateId) ?? templates[0];
  }, [editingReview, rawTemplateId]);

  const pickerCells = useMemo(() => {
    return buildCalendarCells(pickerMonth);
  }, [pickerMonth]);

  const pickerMonthLabel = useMemo(() => {
    return `${pickerMonth.getFullYear()}年${pickerMonth.getMonth() + 1}月`;
  }, [pickerMonth]);

  const updateAnswer = (fieldKey: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handleSelectDate = (dateKey: string, dateObj: Date) => {
    setSelectedDateKey(dateKey);
    setPickerMonth(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
    setIsDatePickerOpen(false);
  };

  const handlePickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('権限が必要です', '写真ライブラリへのアクセスを許可してください。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('写真の選択に失敗しました');
    }
  };

  const handleRemoveImage = () => {
    setPhotoUri('');
  };

  const handleSave = async () => {
    const hasAnyInput = Object.values(answers).some((value) => value?.trim());

    if (!hasAnyInput) {
      Alert.alert('未入力です', '1つ以上入力してから保存してください。');
      return;
    }

    try {
      const now = new Date().toISOString();
      const targetCreatedAt = mergeDateWithTime(
        selectedDateKey,
        editingReview?.createdAt
      );

      if (isEditMode && editingReview) {
        await updateReview({
          ...editingReview,
          createdAt: targetCreatedAt,
          category,
          mood,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          tags: selectedTags,
          answers,
          photoUri,
          updatedAt: now,
        });

        Alert.alert('更新しました');
      } else {
        await saveReview({
          id: Date.now().toString(),
          createdAt: targetCreatedAt,
          updatedAt: now,
          category,
          mood,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          tags: selectedTags,
          answers,
          photoUri,
          isFavorite: false,
        });

        Alert.alert('保存しました');
      }

      router.replace('/(tabs)/history');
    } catch (error) {
      console.error(error);
      Alert.alert(isEditMode ? '更新に失敗しました' : '保存に失敗しました');
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {isEditMode ? '振り返りを編集' : selectedTemplate.name}
      </Text>
      <Text style={styles.subtitle}>{selectedTemplate.description}</Text>
      <Text style={styles.modeText}>🧭 {selectedTemplate.mode}</Text>

      <View style={styles.dateSection}>
        <Text style={styles.label}>日付</Text>

        <Pressable
          style={styles.dateButton}
          onPress={() => setIsDatePickerOpen((prev) => !prev)}
        >
          <Text style={styles.dateButtonText}>
            {formatSelectedDateLabel(selectedDateKey)}
          </Text>
          <Text style={styles.dateButtonIcon}>
            {isDatePickerOpen ? '▲' : '▼'}
          </Text>
        </Pressable>

        {isDatePickerOpen ? (
          <View style={styles.datePickerCard}>
            <View style={styles.datePickerHeader}>
              <Pressable
                style={styles.monthNavButton}
                onPress={() =>
                  setPickerMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                  )
                }
              >
                <Text style={styles.monthNavButtonText}>←</Text>
              </Pressable>

              <Text style={styles.pickerMonthLabel}>{pickerMonthLabel}</Text>

              <Pressable
                style={styles.monthNavButton}
                onPress={() =>
                  setPickerMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                  )
                }
              >
                <Text style={styles.monthNavButtonText}>→</Text>
              </Pressable>
            </View>

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
              {pickerCells.map((cell) => {
                const isSelected = selectedDateKey === cell.dateKey;
                const weekday = cell.date.getDay();

                return (
                  <Pressable
                    key={cell.dateKey}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      !cell.isCurrentMonth && styles.dayCellOutside,
                    ]}
                    onPress={() => handleSelectDate(cell.dateKey, cell.date)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        weekday === 0 && !isSelected && styles.sundayText,
                        weekday === 6 && !isSelected && styles.saturdayText,
                        !cell.isCurrentMonth && styles.dayTextOutside,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

      <Text style={styles.label}>写真</Text>
      <View style={styles.photoSection}>
        <Pressable style={styles.photoButton} onPress={handlePickImage}>
          <Text style={styles.photoButtonText}>
            {photoUri ? '写真を変更する' : '写真を選ぶ'}
          </Text>
        </Pressable>

        {photoUri ? (
          <View style={styles.photoPreviewCard}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <Pressable style={styles.removePhotoButton} onPress={handleRemoveImage}>
              <Text style={styles.removePhotoButtonText}>写真を削除</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoEmptyCard}>
            <Text style={styles.photoEmptyText}>まだ写真は添付されていません</Text>
          </View>
        )}
      </View>

      <Text style={styles.label}>今日の気分</Text>
      <View style={styles.wrapRow}>
        {moods.map((item) => (
          <Pressable
            key={item}
            style={[styles.chip, mood === item && styles.chipActive]}
            onPress={() => setMood(item)}
          >
            <Text
              style={[
                styles.chipText,
                mood === item && styles.chipTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>カテゴリ</Text>
      <View style={styles.row}>
        {categories.map((item) => (
          <Pressable
            key={item}
            style={[styles.chip, category === item && styles.chipActive]}
            onPress={() => setCategory(item)}
          >
            <Text
              style={[
                styles.chipText,
                category === item && styles.chipTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>タグ</Text>
      <View style={styles.wrapRow}>
        {TAGS.map((tag) => {
          const selected = selectedTags.includes(tag);

          return (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[styles.tagChip, selected && styles.tagChipActive]}
            >
              <Text
                style={[
                  styles.tagChipText,
                  selected && styles.tagChipTextActive,
                ]}
              >
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedTemplate.fields.map((field) => (
        <View key={field.key} style={styles.fieldBlock}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            style={[
              styles.input,
              field.multiline ? styles.textarea : undefined,
            ]}
            placeholder={field.label}
            multiline={field.multiline ?? false}
            value={answers[field.key] ?? ''}
            onChangeText={(text) => updateAnswer(field.key, text)}
            textAlignVertical="top"
          />
        </View>
      ))}

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>
          {isEditMode ? '更新する' : '保存する'}
        </Text>
      </Pressable>
    </ScrollView>
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

function dateKeyToMonth(dateKey: string) {
  const [year, month] = dateKey.split('-');
  return new Date(Number(year), Number(month) - 1, 1);
}

function formatSelectedDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function mergeDateWithTime(dateKey: string, baseIso?: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  const base = baseIso ? new Date(baseIso) : new Date();

  return new Date(
    year,
    month - 1,
    day,
    base.getHours(),
    base.getMinutes(),
    base.getSeconds(),
    base.getMilliseconds()
  ).toISOString();
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f7f8fa',
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f7f8fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
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
    marginBottom: 8,
    lineHeight: 20,
  },
  modeText: {
    fontSize: 13,
    color: '#2f6fed',
    fontWeight: '600',
    marginBottom: 20,
  },
  dateSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dfe7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
  },
  dateButtonIcon: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
  },
  datePickerCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3e6eb',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthNavButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f5f7fb',
    borderWidth: 1,
    borderColor: '#dfe5ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  pickerMonthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
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
    backgroundColor: '#2f6fed',
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
  photoSection: {
    marginBottom: 20,
  },
  photoButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  photoPreviewCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3e6eb',
    borderRadius: 14,
    padding: 12,
  },
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#eef2f7',
    marginBottom: 10,
  },
  removePhotoButton: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  removePhotoButtonText: {
    color: '#be123c',
    fontSize: 13,
    fontWeight: '700',
  },
  photoEmptyCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3e6eb',
    borderRadius: 14,
    padding: 14,
  },
  photoEmptyText: {
    color: '#666',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cfd6df',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  chipActive: {
    backgroundColor: '#2f6fed',
    borderColor: '#2f6fed',
  },
  chipText: {
    color: '#333',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  tagChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cfd6df',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tagChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  tagChipText: {
    color: '#333',
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: '#3730A3',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dfe7',
    borderRadius: 12,
    padding: 12,
    color: '#111',
  },
  textarea: {
    minHeight: 90,
  },
  saveButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});