import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import BackHeader from '../../components/BackHeader';
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
import { useAppTheme } from '../../lib/theme-context';
import { createCardShadow } from '../../lib/theme';

type TagCatalogState = {
  action: TagDefinition[];
  state: TagDefinition[];
};

export default function EntryScreen() {
  const { templateId, reviewId, date } = useLocalSearchParams<{
    templateId?: string;
    reviewId?: string;
    date?: string;
  }>();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const initialTemplate =
    templates.find((item) => item.id === templateId) ?? templates[0];
  const initialDateKey = isValidDateKey(date) ? date : toDateKey(new Date());
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplate.id);
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const [category, setCategory] = useState<CategoryOption>(CATEGORIES[0]);
  const [mood, setMood] = useState<MoodValue>(3);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [actionTagIds, setActionTagIds] = useState<string[]>([]);
  const [stateTagIds, setStateTagIds] = useState<string[]>([]);
  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [tagCatalog, setTagCatalog] = useState<TagCatalogState>({ action: [], state: [] });
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const selectedTemplate =
    templates.find((item) => item.id === selectedTemplateId) ?? templates[0];
  const mainField =
    selectedTemplate.fields[0] ?? { key: 'memo', label: '本文', multiline: true };
  const secondaryFields = selectedTemplate.fields.slice(1);
  const isEditMode = Boolean(reviewId);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const catalog = await getTagCatalog();
        if (!isMounted) return;
        setTagCatalog(catalog);

        if (!reviewId) return;

        const review = await getReviewById(reviewId);
        if (!review) {
          Alert.alert('記録が見つかりませんでした。');
          router.replace('/(tabs)/history');
          return;
        }

        if (!isMounted) return;

        setEditingReview(review);
        setSelectedTemplateId(review.templateId ?? initialTemplate.id);
        setSelectedDateKey(toDateKey(new Date(review.createdAt)));
        setCategory(review.category);
        setMood(review.mood ?? 3);
        setAnswers(review.answers ?? {});
        setActionTagIds(review.actionTagIds ?? []);
        setStateTagIds(review.stateTagIds ?? []);
        setPhotos(review.photos ?? []);
      } catch (error) {
        console.error(error);
        Alert.alert('記録の読み込みに失敗しました。');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [initialTemplate.id, reviewId]);

  const saveLabel = isEditMode ? '更新する' : '保存する';

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('写真へのアクセスを許可してください。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: Math.max(6 - photos.length, 1),
        quality: 0.8,
      });

      if (result.canceled) return;

      const next = result.assets.slice(0, Math.max(6 - photos.length, 0)).map((asset, index) => ({
        id: `photo-${Date.now()}-${index}`,
        uri: asset.uri,
        comment: '',
        order: photos.length + index,
      }));

      setPhotos((prev) => [...prev, ...next]);
    } catch (error) {
      console.error(error);
      Alert.alert('写真の追加に失敗しました。');
    }
  };

  const handleSave = async () => {
    if (!isValidDateKey(selectedDateKey)) {
      Alert.alert('日付は YYYY-MM-DD で入力してください。');
      return;
    }

    const hasInput =
      Object.values(answers).some((value) => value.trim()) ||
      actionTagIds.length > 0 ||
      stateTagIds.length > 0 ||
      photos.length > 0;

    if (!hasInput) {
      Alert.alert('まだ入力がありません。', 'ひとことだけでも残してから保存してみましょう。');
      return;
    }

    try {
      const existingReview = await getReviewByDateKey(selectedDateKey, editingReview?.id);
      if (existingReview) {
        Alert.alert(
          '同じ日付の記録があります。',
          'その日の記録は1件だけにしたい場合は、既存の記録を編集してください。'
        );
        return;
      }

      const payload: ReviewItem = {
        id: editingReview?.id ?? String(Date.now()),
        createdAt: mergeDateWithTime(selectedDateKey, editingReview?.createdAt),
        updatedAt: new Date().toISOString(),
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

      if (editingReview) {
        await updateReview(payload);
      } else {
        await saveReview(payload);
      }

      router.replace('/(tabs)/history');
    } catch (error) {
      console.error(error);
      if (error instanceof DuplicateReviewDateError) {
        Alert.alert('同じ日付の記録があります。');
        return;
      }
      Alert.alert('保存に失敗しました。');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackHeader
        title={isEditMode ? '記録を編集' : '記録を書く'}
        subtitle="大きめの入力欄で、今日のことを気軽に残せます。"
      />

      <View style={styles.templateCard}>
        <View style={styles.templateHeader}>
          <View style={styles.flexFill}>
            <Text style={styles.sectionLabel}>テンプレート</Text>
            <Text style={styles.templateTitle}>{selectedTemplate.name}</Text>
            <Text style={styles.templateBody}>{selectedTemplate.description}</Text>
          </View>
          <Pressable style={styles.switchTemplateButton} onPress={() => router.replace('/templates')}>
            <Text style={styles.switchTemplateButtonText}>変更</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>日付</Text>
        <TextInput
          style={styles.dateInput}
          value={selectedDateKey}
          onChangeText={setSelectedDateKey}
          placeholder="2026-04-07"
          placeholderTextColor={theme.colors.textSoft}
        />
        <Text style={styles.helperText}>あとから見返しやすいように、日付だけ先に決めます。</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>{mainField.label}</Text>
        <Text style={styles.sectionTitle}>今日のメインメモ</Text>
        <TextInput
          style={styles.mainInput}
          multiline
          textAlignVertical="top"
          placeholder="今日のことを、ひとことでも大丈夫です。"
          placeholderTextColor={theme.colors.textSoft}
          value={answers[mainField.key] ?? ''}
          onChangeText={(text) => setAnswers((prev) => ({ ...prev, [mainField.key]: text }))}
        />
      </View>

      {secondaryFields.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>補足</Text>
          {secondaryFields.map((field) => (
            <View key={field.key} style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={[styles.subInput, field.multiline !== false && styles.subInputMultiline]}
                multiline={field.multiline !== false}
                textAlignVertical="top"
                placeholder={`${field.label}を書く`}
                placeholderTextColor={theme.colors.textSoft}
                value={answers[field.key] ?? ''}
                onChangeText={(text) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [field.key]: text,
                  }))
                }
              />
            </View>
          ))}
        </View>
      ) : null}

      <ChoiceSection title="気分" styles={styles}>
        <View style={styles.choiceWrap}>
          {MOOD_OPTIONS.map((option) => {
            const active = mood === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.moodChip, active && styles.choiceChipActive]}
                onPress={() => setMood(option.value)}
              >
                <Text style={styles.moodEmoji}>{option.emoji}</Text>
                <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ChoiceSection>

      <ChoiceSection title="カテゴリ" styles={styles}>
        <View style={styles.choiceWrap}>
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
      </ChoiceSection>

      <TagChoiceSection
        title="行動タグ"
        tags={tagCatalog.action.filter((tag) => !tag.isArchived)}
        selectedIds={actionTagIds}
        onToggle={(tagId) =>
          setActionTagIds((prev) =>
            prev.includes(tagId) ? prev.filter((item) => item !== tagId) : [...prev, tagId]
          )
        }
      />

      <TagChoiceSection
        title="状態タグ"
        tags={tagCatalog.state.filter((tag) => !tag.isArchived)}
        selectedIds={stateTagIds}
        onToggle={(tagId) =>
          setStateTagIds((prev) =>
            prev.includes(tagId) ? prev.filter((item) => item !== tagId) : [...prev, tagId]
          )
        }
      />

      <View style={styles.sectionCard}>
        <View style={styles.photoHeader}>
          <View style={styles.flexFill}>
            <Text style={styles.sectionLabel}>写真</Text>
            <Text style={styles.helperText}>必要なときだけ添えられます。</Text>
          </View>
          <Pressable style={styles.switchTemplateButton} onPress={handlePickImage}>
            <Text style={styles.switchTemplateButtonText}>追加</Text>
          </Pressable>
        </View>

        {photos.length === 0 ? (
          <Text style={styles.photoEmptyText}>写真はまだありません。</Text>
        ) : (
          photos.map((photo) => (
            <View key={photo.id} style={styles.photoCard}>
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              <Pressable
                style={styles.photoRemoveButton}
                onPress={() =>
                  setPhotos((prev) => prev.filter((item) => item.id !== photo.id))
                }
              >
                <Ionicons name="close" size={16} color={theme.colors.danger} />
              </Pressable>
              <TextInput
                style={styles.photoCommentInput}
                value={photo.comment}
                onChangeText={(text) =>
                  setPhotos((prev) =>
                    prev.map((item) =>
                      item.id === photo.id ? { ...item, comment: text } : item
                    )
                  )
                }
                placeholder="写真のメモ"
                placeholderTextColor={theme.colors.textSoft}
              />
            </View>
          ))
        )}
      </View>

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{saveLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}

function ChoiceSection({
  title,
  children,
  styles,
}: {
  title: string;
  children: ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function TagChoiceSection({
  title,
  tags,
  selectedIds,
  onToggle,
}: {
  title: string;
  tags: TagDefinition[];
  selectedIds: string[];
  onToggle: (tagId: string) => void;
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.choiceWrap}>
        {tags.map((tag) => {
          const active = selectedIds.includes(tag.id);
          return (
            <Pressable
              key={tag.id}
              style={[styles.choiceChip, active && styles.choiceChipActive]}
              onPress={() => onToggle(tag.id)}
            >
              <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                {tag.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateKey(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
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

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
      paddingBottom: 96,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    flexFill: {
      flex: 1,
    },
    templateCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    templateHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    switchTemplateButton: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    switchTemplateButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    sectionCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    sectionLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    templateTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: 6,
    },
    templateBody: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    helperText: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginTop: theme.spacing.sm,
    },
    dateInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 14,
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    mainInput: {
      minHeight: 200,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      color: theme.colors.text,
      fontSize: 17,
      lineHeight: 26,
    },
    fieldBlock: {
      marginTop: theme.spacing.md,
    },
    fieldLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '700',
      marginBottom: theme.spacing.sm,
    },
    subInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      color: theme.colors.text,
      fontSize: 15,
    },
    subInputMultiline: {
      minHeight: 110,
    },
    choiceWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    choiceChip: {
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    moodChip: {
      minWidth: 104,
      alignItems: 'center',
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
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
    photoHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    photoEmptyText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    photoCard: {
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      position: 'relative',
    },
    photoPreview: {
      width: '100%',
      height: 180,
      borderRadius: theme.radius.lg,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceStrong,
    },
    photoRemoveButton: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      width: 28,
      height: 28,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    photoCommentInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      color: theme.colors.text,
      fontSize: 15,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.xl,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xxl,
    },
    saveButtonText: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '700',
      color: theme.colors.white,
    },
  });
}
