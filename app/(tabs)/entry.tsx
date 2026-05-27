import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usePreventRemove } from '@react-navigation/native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BackHeader from '../../components/BackHeader';
import { CATEGORIES, MOOD_DISPLAY_OPTIONS, type CategoryOption, type MoodValue } from '../../data/reviewOptions';
import { templates } from '../../data/templates';
import type { TagDefinition } from '../../data/tags';
import { clearEntryDraft, getEntryDraft, saveEntryDraft } from '../../lib/entryDraft';
import { registerEntryLeaveGuard } from '../../lib/entryNavigationGuard';
import { createLocalPhotoId, createLocalReviewId } from '../../lib/localIds';
import { preparePhotoForUpload } from '../../lib/photoProcessing';
import { buildCalendarCells, formatDateLabel, isValidDateKey, mergeDateWithTime, toDateKey } from '../../lib/reviewDate';
import { reviewRepository, ReviewSyncError } from '../../lib/reviewRepository';
import { tagRepository } from '../../lib/tagRepository';
import { DuplicateReviewDateError, type ReviewItem, type ReviewPhoto } from '../../lib/storage';
import { useAppTheme } from '../../lib/theme-context';
import { createCardShadow } from '../../lib/theme';

const MEMO_FIELD_KEY = 'memo';
const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

type TagCatalogState = {
  action: TagDefinition[];
  state: TagDefinition[];
};

type Snapshot = {
  templateId: string;
  selectedDateKey: string;
  category: CategoryOption;
  mood: MoodValue;
  answers: Record<string, string>;
  actionTagIds: string[];
  stateTagIds: string[];
  photos: ReviewPhoto[];
};

export default function EntryScreen() {
  const navigation = useNavigation();
  const { templateId, reviewId, date } = useLocalSearchParams<{ templateId?: string; reviewId?: string; date?: string }>();
  const { theme, t } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isEditMode = Boolean(reviewId);
  const draftKey = isEditMode ? `edit:${reviewId}` : 'new';
  const requestedTemplate = templates.find((item) => item.id === templateId) ?? templates[0];
  const requestedDateKey = isValidDateKey(date) ? date : toDateKey(new Date());

  const [selectedTemplateId, setSelectedTemplateId] = useState(requestedTemplate.id);
  const [selectedDateKey, setSelectedDateKey] = useState(requestedDateKey);
  const [dateInputValue, setDateInputValue] = useState(requestedDateKey);
  const [dateError, setDateError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [category, setCategory] = useState<CategoryOption>(CATEGORIES[0]);
  const [mood, setMood] = useState<MoodValue>(3);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [actionTagIds, setActionTagIds] = useState<string[]>([]);
  const [stateTagIds, setStateTagIds] = useState<string[]>([]);
  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [tagCatalog, setTagCatalog] = useState<TagCatalogState>({ action: [], state: [] });
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecordDetailsOpen, setIsRecordDetailsOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isTemplateQuestionsOpen, setIsTemplateQuestionsOpen] = useState(false);
  const [isPhotosOpen, setIsPhotosOpen] = useState(false);
  const initialSnapshotRef = useRef('');
  const skipLeaveGuardRef = useRef(false);

  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) ?? templates[0];
  const visibleTemplateFields = getVisibleTemplateFields(selectedTemplate.id);
  const currentSnapshot = useMemo(() => JSON.stringify({ templateId: selectedTemplateId, selectedDateKey, category, mood, answers, actionTagIds, stateTagIds, photos } satisfies Snapshot), [selectedTemplateId, selectedDateKey, category, mood, answers, actionTagIds, stateTagIds, photos]);
  const hasUnsavedChanges = !isLoading && isDraftReady && currentSnapshot !== initialSnapshotRef.current;
  const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth]);

  const loadTagCatalog = useCallback(async () => {
    setTagCatalog(await tagRepository.getCatalog());
  }, []);

  useFocusEffect(useCallback(() => {
    void loadTagCatalog();
  }, [loadTagCatalog]));

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [catalog, draft] = await Promise.all([tagRepository.getCatalog(), getEntryDraft(draftKey)]);
        if (!active) return;
        setTagCatalog(catalog);

        if (reviewId) {
          const review = await reviewRepository.getById(reviewId);
          if (!review) {
            Alert.alert('記録が見つかりませんでした');
            router.replace('/(tabs)/history');
            return;
          }
          const nextDateKey = draft?.selectedDateKey && isValidDateKey(draft.selectedDateKey) ? draft.selectedDateKey : toDateKey(new Date(review.createdAt));
          const snapshot = { templateId: draft?.templateId ?? review.templateId ?? templates[0].id, selectedDateKey: nextDateKey, category: draft?.category ?? review.category, mood: draft?.mood ?? review.mood ?? 3, answers: draft?.answers ?? review.answers ?? {}, actionTagIds: draft?.actionTagIds ?? review.actionTagIds ?? [], stateTagIds: draft?.stateTagIds ?? review.stateTagIds ?? [], photos: draft?.photos ?? review.photos ?? [] } satisfies Snapshot;
          setEditingReview(review);
          applySnapshot(snapshot, setSelectedTemplateId, setSelectedDateKey, setDateInputValue, setCalendarMonth, setCategory, setMood, setAnswers, setActionTagIds, setStateTagIds, setPhotos);
          initialSnapshotRef.current = JSON.stringify(snapshot);
        } else {
          const nextDateKey = (isValidDateKey(date) ? date : undefined) ?? draft?.selectedDateKey ?? toDateKey(new Date());
          const snapshot = { templateId: templateId ?? draft?.templateId ?? templates[0].id, selectedDateKey: isValidDateKey(nextDateKey) ? nextDateKey : requestedDateKey, category: draft?.category ?? CATEGORIES[0], mood: draft?.mood ?? 3, answers: draft?.answers ?? {}, actionTagIds: draft?.actionTagIds ?? [], stateTagIds: draft?.stateTagIds ?? [], photos: draft?.photos ?? [] } satisfies Snapshot;
          applySnapshot(snapshot, setSelectedTemplateId, setSelectedDateKey, setDateInputValue, setCalendarMonth, setCategory, setMood, setAnswers, setActionTagIds, setStateTagIds, setPhotos);
          initialSnapshotRef.current = JSON.stringify(snapshot);
        }
      } catch (error) {
        console.error(error);
        Alert.alert('記録の読み込みに失敗しました');
      } finally {
        if (active) {
          setIsLoading(false);
          setIsDraftReady(true);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [date, draftKey, requestedDateKey, reviewId, templateId]);

  useEffect(() => {
    if (isLoading || !isDraftReady || isEditMode) return;
    if (!templateId || templateId === selectedTemplateId) return;
    setSelectedTemplateId(templateId);
  }, [isDraftReady, isEditMode, isLoading, selectedTemplateId, templateId]);

  useEffect(() => {
    if (isLoading || !isDraftReady) return;
    void saveEntryDraft(draftKey, { templateId: selectedTemplateId, selectedDateKey, category, mood, answers, actionTagIds, stateTagIds, photos });
  }, [draftKey, isDraftReady, isLoading, selectedTemplateId, selectedDateKey, category, mood, answers, actionTagIds, stateTagIds, photos]);

  const confirmLeave = useCallback(() => {
    if (!hasUnsavedChanges) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      Alert.alert('移動しますか？', '入力中の内容が失われる可能性があります', [
        { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
        { text: '移動する', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  }, [hasUnsavedChanges]);

  useEffect(() => registerEntryLeaveGuard(confirmLeave), [confirmLeave]);

  usePreventRemove(hasUnsavedChanges, (event) => {
    if (skipLeaveGuardRef.current) {
      skipLeaveGuardRef.current = false;
      return;
    }
    void confirmLeave().then((ok) => {
      if (!ok) return;
      skipLeaveGuardRef.current = true;
      navigation.dispatch(event.data.action);
    });
  });

  const handleDateInputChange = (value: string) => {
    setDateInputValue(value);
    if (!value) {
      setDateError('日付を入力してください');
      return;
    }
    if (isValidDateKey(value)) {
      setSelectedDateKey(value);
      setDateError('');
      setCalendarMonth(new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, 1));
      return;
    }
    setDateError(/^\d{4}-\d{2}-\d{2}$/.test(value) ? '存在しない日付です' : '');
  };

  const handleDateInputBlur = () => {
    if (isValidDateKey(dateInputValue)) {
      setDateError('');
      return;
    }
    setDateError('YYYY-MM-DD 形式で正しい日付を入力してください');
  };

  const handleSelectCalendarDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setDateInputValue(dateKey);
    setDateError('');
    setCalendarMonth(new Date(Number(dateKey.slice(0, 4)), Number(dateKey.slice(5, 7)) - 1, 1));
    setIsCalendarOpen(false);
  };

  const handleOpenTemplatePicker = () => {
    skipLeaveGuardRef.current = true;
    router.push({ pathname: '/templates', params: { date: selectedDateKey } });
  };

  const handleOpenTags = () => {
    skipLeaveGuardRef.current = true;
    router.push({ pathname: '/tags', params: { returnTo: 'entry' } });
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('写真ライブラリへのアクセスを許可してください');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.max(6 - photos.length, 1), quality: 0.8 });
      if (result.canceled) return;
      const preparedAssets = await Promise.all(
        result.assets
          .slice(0, Math.max(6 - photos.length, 0))
          .map(async (asset) => ({
            id: createLocalPhotoId(),
            uri: await preparePhotoForUpload(asset.uri),
          }))
      );
      const next = preparedAssets.map((asset, index) => ({
        id: asset.id,
        uri: asset.uri,
        comment: '',
        order: photos.length + index,
      }));
      setPhotos((prev) => [...prev, ...next]);
    } catch (error) {
      console.error(error);
      Alert.alert('写真の追加に失敗しました');
    }
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    if (!isValidDateKey(selectedDateKey)) {
      setDateError('YYYY-MM-DD 形式で正しい日付を入力してください');
      Alert.alert('日付を確認してください');
      return;
    }
    const answersForSave = getAnswersForSave(answers, selectedTemplate.id);
    const hasInput = Object.values(answersForSave).some((value) => value.trim()) || actionTagIds.length > 0 || stateTagIds.length > 0 || photos.length > 0;
    if (!hasInput) {
      Alert.alert('入力がまだありません', 'ひとつでも内容を入れてから保存してください。');
      return;
    }
    try {
      setIsSaving(true);
      const payload: ReviewItem = { id: editingReview?.id ?? createLocalReviewId(), createdAt: mergeDateWithTime(selectedDateKey, editingReview?.createdAt), updatedAt: new Date().toISOString(), category, mood, templateId: selectedTemplate.id, templateName: selectedTemplate.name, actionTagIds, stateTagIds, answers: answersForSave, photos: photos.map((photo, index) => ({ ...photo, order: index })), isFavorite: editingReview?.isFavorite ?? false };
      if (editingReview) await reviewRepository.update(payload); else await reviewRepository.create(payload);
      await clearEntryDraft(draftKey);
      initialSnapshotRef.current = currentSnapshot;
      skipLeaveGuardRef.current = true;
      router.replace('/(tabs)/history');
    } catch (error) {
      console.error(error);
      if (error instanceof DuplicateReviewDateError) {
        Alert.alert(t('entry.duplicateDateTitle'), t('entry.duplicateDateBody'));
        return;
      }
      if (error instanceof ReviewSyncError) {
        Alert.alert('クラウド同期に失敗しました', `${error.message}\n\n端末側の内容は保持されています。通信状況を確認して、あとでもう一度お試しください。`);
        return;
      }
      Alert.alert('保存に失敗しました', '少し時間をおいて、もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <View style={styles.loadingContainer}><Text style={styles.loadingText}>読み込み中...</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackHeader title={isEditMode ? '記録を編集' : '記録を作成'} subtitle="無理なく振り返れる形で、今日の記録を残しましょう。" />

      <ChoiceSection title="気分" styles={styles}>
        <View style={styles.choiceWrap}>
          {MOOD_DISPLAY_OPTIONS.map((option) => {
            const active = mood === option.value;
            return (
              <Pressable key={option.value} style={[styles.moodChip, active && styles.choiceChipActive]} onPress={() => setMood(option.value)}>
                <Text style={styles.moodEmoji}>{option.emoji}</Text>
                <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ChoiceSection>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>ひとこと</Text>
        <TextInput testID="entry-memo-input" style={styles.memoInput} multiline textAlignVertical="top" placeholder="今日のひとことを自由に書いてください" placeholderTextColor={theme.colors.textSoft} value={answers[MEMO_FIELD_KEY] ?? ''} onChangeText={(text) => setAnswers((prev) => ({ ...prev, [MEMO_FIELD_KEY]: text }))} />
      </View>

      <DisclosureSection
        title="記録の設定"
        summary={`${selectedDateKey} ・ ${category} ・ ${selectedTemplate.name}`}
        isOpen={isRecordDetailsOpen}
        onToggle={() => setIsRecordDetailsOpen((value) => !value)}
        styles={styles}
      >
        <View style={styles.innerBlock}>
          <View style={styles.rowTop}>
            <View style={styles.flexFill}>
              <Text style={styles.sectionLabel}>テンプレート</Text>
              <Text style={styles.sectionTitle}>{selectedTemplate.name}</Text>
              <Text style={styles.helperText}>{selectedTemplate.description}</Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={handleOpenTemplatePicker}><Text style={styles.secondaryButtonText}>選び直す</Text></Pressable>
          </View>
        </View>

        <View style={styles.innerBlock}>
          <Text style={styles.sectionLabel}>日付</Text>
          <TextInput style={[styles.input, dateError ? styles.inputError : null]} value={dateInputValue} onChangeText={handleDateInputChange} onBlur={handleDateInputBlur} placeholder="2026-04-07" placeholderTextColor={theme.colors.textSoft} autoCapitalize="none" />
          {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
          <Text style={styles.helperText}>1日に保存できる記録は1件です。別の日付の記録は作成できます。</Text>
          <Pressable style={styles.calendarToggleButton} onPress={() => setIsCalendarOpen((prev) => !prev)}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.primaryDark} />
            <Text style={styles.calendarToggleText}>{isCalendarOpen ? 'カレンダーを閉じる' : 'カレンダーを開く'}</Text>
          </Pressable>
          {isCalendarOpen ? (
            <>
              <View style={styles.calendarHeader}><Pressable style={styles.iconAction} onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}><Ionicons name="chevron-back" size={16} color={theme.colors.primaryDark} /></Pressable><Text style={styles.calendarTitle}>{formatDateLabel(toDateKey(calendarMonth)).slice(0, -2)}</Text><Pressable style={styles.iconAction} onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}><Ionicons name="chevron-forward" size={16} color={theme.colors.primaryDark} /></Pressable></View>
              <View style={styles.calendarGrid}>
                {WEEK_LABELS.map((label, index) => <Text key={label} style={[styles.weekLabel, index === 0 && styles.sundayText, index === 6 && styles.saturdayText]}>{label}</Text>)}
                {calendarCells.map((cell) => {
                  const isToday = cell.dateKey === toDateKey(new Date());
                  const weekday = cell.date.getDay();
                  return (
                    <Pressable key={cell.dateKey} style={[styles.calendarCell, cell.dateKey === selectedDateKey && styles.calendarCellActive, isToday && styles.todayCell, !cell.isCurrentMonth && styles.calendarCellOutside]} onPress={() => handleSelectCalendarDate(cell.dateKey)}>
                      <Text style={[styles.calendarCellText, weekday === 0 && styles.sundayText, weekday === 6 && styles.saturdayText, cell.dateKey === selectedDateKey && styles.calendarCellTextActive]}>{cell.day}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.innerBlock}>
          <Text style={styles.sectionLabel}>カテゴリ</Text>
          <View style={styles.choiceWrap}>
            {CATEGORIES.map((item) => {
              const active = category === item;
              return <Pressable key={item} style={[styles.choiceChip, active && styles.choiceChipActive]} onPress={() => setCategory(item)}><Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{item}</Text></Pressable>;
            })}
          </View>
        </View>
      </DisclosureSection>

      <DisclosureSection title="タグ" summary="行動や気分を後から探しやすくします" isOpen={isTagsOpen} onToggle={() => setIsTagsOpen((value) => !value)} styles={styles}>
        <TagChoiceSection title="行動タグ" manageLabel="管理" tags={tagCatalog.action.filter((tag) => !tag.isArchived)} selectedIds={actionTagIds} onPressManage={handleOpenTags} onToggle={(tagId) => setActionTagIds((prev) => prev.includes(tagId) ? prev.filter((item) => item !== tagId) : [...prev, tagId])} />
        <TagChoiceSection title="気分タグ" manageLabel="管理" tags={tagCatalog.state.filter((tag) => !tag.isArchived)} selectedIds={stateTagIds} onPressManage={handleOpenTags} onToggle={(tagId) => setStateTagIds((prev) => prev.includes(tagId) ? prev.filter((item) => item !== tagId) : [...prev, tagId])} />
      </DisclosureSection>

      {visibleTemplateFields.length > 0 ? (
        <DisclosureSection title="テンプレ質問" summary={`${selectedTemplate.name}で詳しく振り返る`} isOpen={isTemplateQuestionsOpen} onToggle={() => setIsTemplateQuestionsOpen((value) => !value)} styles={styles}>
          <Text style={styles.sectionLabel}>テンプレ質問</Text>
          <Text style={styles.sectionTitle}>{selectedTemplate.name}の記録</Text>
          {visibleTemplateFields.map((field) => (
            <View key={field.key} style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput style={[styles.input, field.multiline !== false && styles.multiInput]} multiline={field.multiline !== false} textAlignVertical="top" placeholder={`${field.label}を入力`} placeholderTextColor={theme.colors.textSoft} value={answers[field.key] ?? ''} onChangeText={(text) => setAnswers((prev) => ({ ...prev, [field.key]: text }))} />
            </View>
          ))}
        </DisclosureSection>
      ) : null}

      <DisclosureSection title="写真" summary={photos.length === 0 ? '必要なときだけ追加できます' : `${photos.length}枚`} isOpen={isPhotosOpen} onToggle={() => setIsPhotosOpen((value) => !value)} styles={styles}>
        <View style={styles.rowTop}>
          <View style={styles.flexFill}>
            <Text style={styles.sectionLabel}>写真</Text>
            <Text style={styles.helperText}>必要なときだけ追加できます。</Text>
          </View>
          <Pressable style={styles.secondaryButton} onPress={handlePickImage}><Text style={styles.secondaryButtonText}>追加</Text></Pressable>
        </View>
        {photos.length === 0 ? <Text style={styles.helperText}>写真はまだありません。</Text> : photos.map((photo) => (
          <View key={photo.id} style={styles.photoCard}>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            <Pressable style={styles.photoRemoveButton} onPress={() => setPhotos((prev) => prev.filter((item) => item.id !== photo.id))}><Ionicons name="close" size={16} color={theme.colors.danger} /></Pressable>
            <TextInput style={styles.input} value={photo.comment} onChangeText={(text) => setPhotos((prev) => prev.map((item) => item.id === photo.id ? { ...item, comment: text } : item))} placeholder="写真メモ" placeholderTextColor={theme.colors.textSoft} />
          </View>
        ))}
      </DisclosureSection>

      <Pressable
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? '保存しています…' : isEditMode ? '更新する' : '保存する'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function ChoiceSection({ title, children, styles }: { title: string; children: ReactNode; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.sectionCard}><Text style={styles.sectionLabel}>{title}</Text>{children}</View>;
}

function DisclosureSection({ title, summary, isOpen, onToggle, children, styles }: { title: string; summary: string; isOpen: boolean; onToggle: () => void; children: ReactNode; styles: ReturnType<typeof createStyles> }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.sectionCard}>
      <Pressable style={styles.disclosureHeader} onPress={onToggle}>
        <View style={styles.flexFill}>
          <Text style={styles.sectionLabel}>{title}</Text>
          <Text style={styles.helperText}>{summary}</Text>
        </View>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.colors.primaryDark}
        />
      </Pressable>
      {isOpen ? <View style={styles.disclosureBody}>{children}</View> : null}
    </View>
  );
}

function TagChoiceSection({ title, manageLabel, tags, selectedIds, onToggle, onPressManage }: { title: string; manageLabel: string; tags: TagDefinition[]; selectedIds: string[]; onToggle: (tagId: string) => void; onPressManage: () => void }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.innerBlock}>
      <View style={styles.rowTop}><Text style={styles.sectionLabel}>{title}</Text><Pressable onPress={onPressManage}><Text style={styles.manageLink}>{manageLabel}</Text></Pressable></View>
      <View style={styles.choiceWrap}>
        {tags.map((tag) => {
          const active = selectedIds.includes(tag.id);
          return <Pressable key={tag.id} style={[styles.choiceChip, active && styles.choiceChipActive]} onPress={() => onToggle(tag.id)}><Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{tag.label}</Text></Pressable>;
        })}
      </View>
    </View>
  );
}

export function shouldShowMemoField(templateId: string) {
  const template = templates.find((item) => item.id === templateId) ?? templates[0];
  return template.fields.some((field) => field.key === MEMO_FIELD_KEY);
}

export function getVisibleTemplateFields(templateId: string) {
  const template = templates.find((item) => item.id === templateId) ?? templates[0];
  return template.fields.filter((field) => field.key !== MEMO_FIELD_KEY);
}

export function getAnswersForSave(currentAnswers: Record<string, string>, templateId: string) {
  const allowedKeys = new Set(getVisibleTemplateFields(templateId).map((field) => field.key));
  allowedKeys.add(MEMO_FIELD_KEY);
  return Object.fromEntries(Object.entries(currentAnswers).filter(([key, value]) => allowedKeys.has(key) && typeof value === 'string'));
}

function applySnapshot(snapshot: Snapshot, setSelectedTemplateId: (value: string) => void, setSelectedDateKey: (value: string) => void, setDateInputValue: (value: string) => void, setCalendarMonth: (value: Date) => void, setCategory: (value: CategoryOption) => void, setMood: (value: MoodValue) => void, setAnswers: (value: Record<string, string>) => void, setActionTagIds: (value: string[]) => void, setStateTagIds: (value: string[]) => void, setPhotos: (value: ReviewPhoto[]) => void) {
  setSelectedTemplateId(snapshot.templateId);
  setSelectedDateKey(snapshot.selectedDateKey);
  setDateInputValue(snapshot.selectedDateKey);
  setCalendarMonth(new Date(Number(snapshot.selectedDateKey.slice(0, 4)), Number(snapshot.selectedDateKey.slice(5, 7)) - 1, 1));
  setCategory(snapshot.category);
  setMood(snapshot.mood);
  setAnswers(snapshot.answers);
  setActionTagIds(snapshot.actionTagIds);
  setStateTagIds(snapshot.stateTagIds);
  setPhotos(snapshot.photos);
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: theme.colors.background, padding: theme.spacing.xl, paddingBottom: 96 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
    loadingText: { ...theme.typography.body, color: theme.colors.textMuted },
    flexFill: { flex: 1 },
    sectionCard: { ...createCardShadow(theme), backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xl, marginBottom: theme.spacing.md },
    innerBlock: { marginBottom: theme.spacing.md },
    disclosureHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    disclosureBody: { marginTop: theme.spacing.lg },
    rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md, marginBottom: theme.spacing.sm },
    sectionLabel: { ...theme.typography.caption, color: theme.colors.textSoft, marginBottom: theme.spacing.sm },
    sectionTitle: { ...theme.typography.section, color: theme.colors.text, marginBottom: theme.spacing.sm },
    helperText: { ...theme.typography.caption, color: theme.colors.textSoft },
    manageLink: { ...theme.typography.caption, color: theme.colors.primaryDark },
    input: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: theme.spacing.lg, paddingVertical: 14, color: theme.colors.text, fontSize: 15 },
    inputError: { borderColor: theme.colors.danger },
    errorText: { ...theme.typography.caption, color: theme.colors.danger, marginTop: theme.spacing.xs },
    multiInput: { minHeight: 110 },
    calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
    calendarTitle: { ...theme.typography.body, color: theme.colors.text, fontWeight: '700' },
    calendarToggleButton: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, alignSelf: 'flex-start', marginTop: theme.spacing.md, backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: 10 },
    calendarToggleText: { ...theme.typography.caption, color: theme.colors.primaryDark },
    iconAction: { width: 34, height: 34, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceMuted },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
    weekLabel: { width: '12%', textAlign: 'center', ...theme.typography.caption, color: theme.colors.textSoft },
    calendarCell: { width: '12%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted, borderWidth: 1, borderColor: theme.colors.border },
    calendarCellActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    todayCell: { borderWidth: 2, borderColor: theme.colors.primaryDark, backgroundColor: theme.colors.primarySoft },
    calendarCellOutside: { opacity: 0.4 },
    calendarCellText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
    calendarCellTextActive: { color: theme.colors.white },
    sundayText: { color: theme.colors.danger },
    saturdayText: { color: '#3b82f6' },
    choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    choiceChip: { borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted, paddingHorizontal: theme.spacing.md, paddingVertical: 10 },
    moodChip: { minWidth: 104, alignItems: 'center', borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted, paddingHorizontal: theme.spacing.md, paddingVertical: 12 },
    moodEmoji: { fontSize: 20, marginBottom: 4 },
    choiceChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    choiceChipText: { ...theme.typography.caption, color: theme.colors.textMuted },
    choiceChipTextActive: { color: theme.colors.white },
    memoInput: { minHeight: 140, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xl, color: theme.colors.text, fontSize: 17, lineHeight: 26 },
    fieldBlock: { marginTop: theme.spacing.md },
    fieldLabel: { ...theme.typography.body, color: theme.colors.text, fontWeight: '700', marginBottom: theme.spacing.sm },
    secondaryButton: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: theme.colors.border },
    secondaryButtonText: { ...theme.typography.caption, color: theme.colors.primaryDark },
    photoCard: { marginTop: theme.spacing.md, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md, position: 'relative' },
    photoPreview: { width: '100%', height: 180, borderRadius: theme.radius.lg, marginBottom: theme.spacing.sm, backgroundColor: theme.colors.surfaceStrong },
    photoRemoveButton: { position: 'absolute', top: theme.spacing.md, right: theme.spacing.md, width: 28, height: 28, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
    saveButton: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.xl, paddingVertical: 18, alignItems: 'center', marginTop: theme.spacing.sm, marginBottom: theme.spacing.xxl },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: theme.colors.white },
  });
}
