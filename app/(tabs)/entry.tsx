import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  CATEGORIES,
  MOOD_OPTIONS,
  type CategoryOption,
  type MoodValue,
} from '../../data/reviewOptions';
import { templates } from '../../data/templates';
import type { TagDefinition } from '../../data/tags';
import {
  DuplicateReviewDateError,
  getReviewByDateKey,
  getReviewById,
  getTagCatalog,
  saveReview,
  updateReview,
  type ReviewItem,
  type ReviewPhoto,
} from '../../lib/storage';
import { brand, cardShadow, theme } from '../../lib/theme';

type CalendarCell = {
  date: Date;
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
};

type TagCatalogState = {
  action: TagDefinition[];
  state: TagDefinition[];
};

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function EntryScreen() {
  const navigation = useNavigation();
  const { templateId, reviewId, date } = useLocalSearchParams<{
    templateId?: string;
    reviewId?: string;
    date?: string;
  }>();

  const initialDateKey = date && isValidDateKey(date) ? date : toDateKey(new Date());
  const initialTemplateId =
    templateId === 'random'
      ? templates[Math.floor(Math.random() * templates.length)].id
      : templateId ?? templates[0].id;

  const isEditMode = Boolean(reviewId);

  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [category, setCategory] = useState<CategoryOption>(CATEGORIES[0]);
  const [mood, setMood] = useState<MoodValue>(3);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [actionTagIds, setActionTagIds] = useState<string[]>([]);
  const [stateTagIds, setStateTagIds] = useState<string[]>([]);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(dateKeyToMonth(initialDateKey));
  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [tagCatalog, setTagCatalog] = useState<TagCatalogState>({ action: [], state: [] });
  const initialSnapshotRef = useRef('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const catalog = await getTagCatalog();
        if (!isMounted) return;
        setTagCatalog(catalog);

        if (reviewId) {
          const review = await getReviewById(reviewId);
          if (!review) {
            Alert.alert('記録が見つかりませんでした');
            router.replace('/(tabs)/history');
            return;
          }

          if (!isMounted) return;

          const reviewDateKey = toDateKey(new Date(review.createdAt));
          setEditingReview(review);
          setSelectedTemplateId(review.templateId ?? initialTemplateId);
          setCategory(review.category);
          setMood(review.mood ?? 3);
          setAnswers(review.answers ?? {});
          setActionTagIds(review.actionTagIds ?? []);
          setStateTagIds(review.stateTagIds ?? []);
          setSelectedDateKey(reviewDateKey);
          setPickerMonth(dateKeyToMonth(reviewDateKey));
          setPhotos(review.photos ?? []);
          initialSnapshotRef.current = buildSnapshot({
            category: review.category,
            mood: review.mood ?? 3,
            answers: review.answers ?? {},
            actionTagIds: review.actionTagIds ?? [],
            stateTagIds: review.stateTagIds ?? [],
            selectedDateKey: reviewDateKey,
            selectedTemplateId: review.templateId ?? initialTemplateId,
            photos: review.photos ?? [],
          });
        } else {
          initialSnapshotRef.current = buildSnapshot({
            category: CATEGORIES[0],
            mood: 3,
            answers: {},
            actionTagIds: [],
            stateTagIds: [],
            selectedDateKey: initialDateKey,
            selectedTemplateId: initialTemplateId,
            photos: [],
          });
        }
      } catch (error) {
        console.error(error);
        Alert.alert('読み込みに失敗しました');
        router.replace('/(tabs)/history');
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [initialDateKey, initialTemplateId, reviewId]);

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId]
  );

  const pickerCells = useMemo(() => buildCalendarCells(pickerMonth), [pickerMonth]);
  const isDirty =
    !isInitializing &&
    initialSnapshotRef.current !==
      buildSnapshot({
        category,
        mood,
        answers,
        actionTagIds,
        stateTagIds,
        selectedDateKey,
        selectedTemplateId,
        photos,
      });

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!isDirty) return;

      event.preventDefault();
      Alert.alert('未保存の変更があります', '保存せずに移動しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '保存せず移動',
          style: 'destructive',
          onPress: () => navigation.dispatch(event.data.action),
        },
      ]);
    });

    return unsubscribe;
  }, [isDirty, navigation]);

  const handlePickImage = async () => {
    try {
      if (photos.length >= 6) {
        Alert.alert('写真は最大 6 枚までです');
        return;
      }

      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('写真へのアクセス権限が必要です');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 6 - photos.length,
        quality: 0.8,
      });

      if (!result.canceled) {
        const nextPhotos = result.assets.slice(0, 6 - photos.length).map((asset, index) => ({
          id: `photo-${Date.now()}-${index}`,
          uri: asset.uri,
          comment: '',
          order: photos.length + index,
        }));
        setPhotos((prev) => [...prev, ...nextPhotos].map((photo, index) => ({ ...photo, order: index })));
      }
    } catch (error) {
      console.error(error);
      Alert.alert('写真の追加に失敗しました');
    }
  };

  const handleSave = async () => {
    const hasAnyInput =
      Object.values(answers).some((value) => value.trim()) ||
      photos.some((photo) => photo.comment.trim()) ||
      actionTagIds.length > 0 ||
      stateTagIds.length > 0;

    if (!hasAnyInput) {
      Alert.alert('入力がありません', '本文、タグ、写真コメントのどれかを入れてください。');
      return;
    }

    try {
      const now = new Date().toISOString();
      const targetCreatedAt = mergeDateWithTime(selectedDateKey, editingReview?.createdAt);
      const existingReview = await getReviewByDateKey(selectedDateKey, editingReview?.id);

      if (existingReview) {
        Alert.alert(
          '同じ日付の記録があります',
          '1 日 1 件の前提なので、その日の既存記録を編集してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '既存記録を開く',
              onPress: () => {
                router.replace({
                  pathname: '/entry',
                  params: { reviewId: existingReview.id },
                });
              },
            },
          ]
        );
        return;
      }

      const payload: ReviewItem = {
        id: editingReview?.id ?? Date.now().toString(),
        createdAt: targetCreatedAt,
        updatedAt: now,
        category,
        mood,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        actionTagIds,
        stateTagIds,
        answers,
        photos: photos.map((photo, index) => ({ ...photo, order: index })),
        isFavorite: editingReview?.isFavorite ?? false,
      };

      if (isEditMode && editingReview) {
        await updateReview(payload);
      } else {
        await saveReview(payload);
      }

      initialSnapshotRef.current = buildSnapshot({
        category,
        mood,
        answers,
        actionTagIds,
        stateTagIds,
        selectedDateKey,
        selectedTemplateId,
        photos,
      });

      router.replace('/(tabs)/history');
    } catch (error) {
      console.error(error);

      if (error instanceof DuplicateReviewDateError) {
        Alert.alert('同じ日付の記録があります');
        return;
      }

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
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.primaryDark} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.brand}>{brand.name}</Text>
          <Text style={styles.title}>
            {isEditMode ? '記録を編集' : selectedTemplate.name}
          </Text>
          <Text style={styles.subtitle}>{selectedTemplate.description}</Text>
        </View>
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>{selectedTemplate.mode}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>{brand.subtitle}</Text>
        <Text style={styles.infoText}>
          気分やタグは軽く、本文は必要な分だけ。写真コメントも短く残せます。
        </Text>
      </View>

      <Section title="日付">
        <Pressable
          style={styles.dateButton}
          onPress={() => setIsDatePickerOpen((value) => !value)}
        >
          <Text style={styles.dateButtonText}>{formatSelectedDateLabel(selectedDateKey)}</Text>
          <Ionicons
            name={isDatePickerOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.colors.textSoft}
          />
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
                <Ionicons name="chevron-back" size={18} color={theme.colors.primaryDark} />
              </Pressable>

              <Text style={styles.pickerMonthLabel}>
                {pickerMonth.getFullYear()}年 {pickerMonth.getMonth() + 1}月
              </Text>

              <Pressable
                style={styles.monthNavButton}
                onPress={() =>
                  setPickerMonth(
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
              {pickerCells.map((cell) => {
                const selected = selectedDateKey === cell.dateKey;

                return (
                  <Pressable
                    key={cell.dateKey}
                    style={[
                      styles.dayCell,
                      selected && styles.dayCellSelected,
                      !cell.isCurrentMonth && styles.dayCellOutside,
                    ]}
                    onPress={() => {
                      setSelectedDateKey(cell.dateKey);
                      setPickerMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                      setIsDatePickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selected && styles.dayTextSelected,
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
        ) : null}
      </Section>

      <Section title="写真">
        <View style={styles.photoHeaderRow}>
          <Text style={styles.helperText}>最大 6 枚。コメント付きで並び替えできます。</Text>
          <Pressable style={styles.secondaryButton} onPress={handlePickImage}>
            <Ionicons name="image-outline" size={16} color={theme.colors.primaryDark} />
            <Text style={styles.secondaryButtonText}>写真を追加</Text>
          </Pressable>
        </View>

        {photos.length > 0 ? (
          <DraggableFlatList
            data={photos}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            activationDistance={16}
            onDragEnd={({ data }) =>
              setPhotos(data.map((photo, index) => ({ ...photo, order: index })))
            }
            renderItem={({ item, drag, isActive }: RenderItemParams<ReviewPhoto>) => (
              <ScaleDecorator>
                <View style={[styles.photoCard, isActive && styles.activePhotoCard]}>
                  <Image source={{ uri: item.uri }} style={styles.photoPreview} />
                  <View style={styles.photoActions}>
                    <Pressable style={styles.dragHandle} onLongPress={drag}>
                      <Ionicons
                        name="reorder-three-outline"
                        size={20}
                        color={theme.colors.textSoft}
                      />
                    </Pressable>
                    <Pressable
                      style={styles.removePhotoButton}
                      onPress={() =>
                        setPhotos((prev) => prev.filter((photo) => photo.id !== item.id))
                      }
                    >
                      <Text style={styles.removePhotoButtonText}>削除</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    style={[styles.input, styles.photoCommentInput]}
                    placeholder="写真コメント"
                    placeholderTextColor={theme.colors.textSoft}
                    value={item.comment}
                    onChangeText={(text) =>
                      setPhotos((prev) =>
                        prev.map((photo) =>
                          photo.id === item.id ? { ...photo, comment: text } : photo
                        )
                      )
                    }
                  />
                </View>
              </ScaleDecorator>
            )}
          />
        ) : (
          <View style={styles.emptyPhotoCard}>
            <Text style={styles.emptyPhotoText}>写真は任意です。必要な日だけ追加してください。</Text>
          </View>
        )}
      </Section>

      <Section title="気分">
        <View style={styles.wrapRow}>
          {MOOD_OPTIONS.map((item) => {
            const active = mood === item.value;

            return (
              <Pressable
                key={item.value}
                style={[styles.moodChip, active && styles.choiceChipActive]}
                onPress={() => setMood(item.value)}
              >
                <Text style={styles.moodEmoji}>{item.emoji}</Text>
                <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="カテゴリ">
        <View style={styles.row}>
          {CATEGORIES.map((item) => {
            const active = category === item;

            return (
              <Pressable
                key={item}
                style={[styles.choiceChip, active && styles.choiceChipActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <TagSection
        title="行動タグ"
        helper="その日にやったこと・過ごし方"
        tags={tagCatalog.action.filter((tag) => !tag.isArchived)}
        selectedIds={actionTagIds}
        onToggle={(tagId) =>
          setActionTagIds((prev) =>
            prev.includes(tagId) ? prev.filter((item) => item !== tagId) : [...prev, tagId]
          )
        }
      />

      <TagSection
        title="状態タグ"
        helper="コンディションや背景要因"
        tags={tagCatalog.state.filter((tag) => !tag.isArchived)}
        selectedIds={stateTagIds}
        onToggle={(tagId) =>
          setStateTagIds((prev) =>
            prev.includes(tagId) ? prev.filter((item) => item !== tagId) : [...prev, tagId]
          )
        }
      />

      {selectedTemplate.fields.map((field) => (
        <Section key={field.key} title={field.label}>
          <TextInput
            style={[styles.input, field.multiline && styles.textarea]}
            placeholder={field.label}
            placeholderTextColor={theme.colors.textSoft}
            multiline={field.multiline ?? false}
            value={answers[field.key] ?? ''}
            onChangeText={(text) =>
              setAnswers((prev) => ({
                ...prev,
                [field.key]: text,
              }))
            }
            textAlignVertical="top"
          />
        </Section>
      ))}

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{isEditMode ? '更新する' : '保存する'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TagSection({
  title,
  helper,
  tags,
  selectedIds,
  onToggle,
}: {
  title: string;
  helper: string;
  tags: TagDefinition[];
  selectedIds: string[];
  onToggle: (tagId: string) => void;
}) {
  return (
    <Section title={title}>
      <Text style={styles.helperText}>{helper}</Text>
      <View style={styles.wrapRow}>
        {tags.map((tag) => {
          const selected = selectedIds.includes(tag.id);

          return (
            <Pressable
              key={tag.id}
              onPress={() => onToggle(tag.id)}
              style={[styles.tagChip, selected && styles.tagChipActive]}
            >
              <Text style={[styles.tagChipText, selected && styles.tagChipTextActive]}>
                {tag.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Section>
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

function buildSnapshot(value: {
  category: CategoryOption;
  mood: MoodValue;
  answers: Record<string, string>;
  actionTagIds: string[];
  stateTagIds: string[];
  selectedDateKey: string;
  selectedTemplateId: string;
  photos: ReviewPhoto[];
}) {
  return JSON.stringify({
    ...value,
    actionTagIds: [...value.actionTagIds].sort(),
    stateTagIds: [...value.stateTagIds].sort(),
    answers: Object.keys(value.answers)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        acc[key] = value.answers[key];
        return acc;
      }, {}),
    photos: value.photos.map((photo) => ({
      id: photo.id,
      uri: photo.uri,
      comment: photo.comment,
      order: photo.order,
    })),
  });
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
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    paddingBottom: 96,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  brand: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  modeBadge: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  modeBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  infoCard: {
    ...cardShadow,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  infoTitle: {
    ...theme.typography.section,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  helperText: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    marginBottom: theme.spacing.sm,
  },
  dateButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  datePickerCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  monthNavButton: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  pickerMonthLabel: {
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
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dayCellSelected: {
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
  dayTextSelected: {
    color: theme.colors.white,
  },
  dayTextOutside: {
    color: theme.colors.textSoft,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  photoCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  activePhotoCard: {
    opacity: 0.95,
  },
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceStrong,
    marginBottom: theme.spacing.sm,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  photoCommentInput: {
    marginTop: 0,
  },
  removePhotoButton: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  removePhotoButtonText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
  emptyPhotoCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  emptyPhotoText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  choiceChip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
  },
  moodChip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    minWidth: 108,
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  choiceChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  choiceChipText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  choiceChipTextActive: {
    color: theme.colors.white,
  },
  tagChip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  tagChipActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.accent,
  },
  tagChipText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  tagChipTextActive: {
    color: theme.colors.primaryDark,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  textarea: {
    minHeight: 96,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
