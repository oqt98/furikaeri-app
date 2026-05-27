import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CATEGORIES,
  MOOD_OPTIONS,
  type CategoryOption,
  type MoodValue,
} from '../data/reviewOptions';
import {
  DEFAULT_TAGS,
  type TagDefinition,
  type TagType,
} from '../data/tags';
import { templates } from '../data/templates';
import {
  createImportedReviewId,
  createLocalId,
  createLocalTagId,
} from './localIds';
import { toDateKey } from './reviewDate';

const STORAGE_KEY = 'furikaeri-history';
const TEMPLATE_ORDER_KEY = 'furikaeri-template-order';
const TAG_CATALOG_KEY = 'furikaeri-tag-catalog';
const TAG_DELETED_DEFAULTS_KEY = 'furikaeri-tag-deleted-defaults';

export type { TagDefinition } from '../data/tags';

export type ReviewPhoto = {
  id: string;
  uri: string;
  storagePath?: string;
  comment: string;
  order: number;
};

export type ReviewItem = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  category: CategoryOption;
  mood?: MoodValue;
  templateId?: string;
  templateName: string;
  actionTagIds: string[];
  stateTagIds: string[];
  answers: Record<string, string>;
  photos: ReviewPhoto[];
  isFavorite?: boolean;
  importSource?: 'notion-import';
  importFingerprint?: string;
};

export type ImportReviewDraft = {
  sourceRowNumber?: number;
  createdAt: string;
  category: CategoryOption;
  mood?: MoodValue;
  templateId?: string;
  templateName: string;
  actionTags?: string[];
  stateTags?: string[];
  answers: Record<string, string>;
  isFavorite?: boolean;
  importSource?: 'notion-import';
  importFingerprint?: string;
};

export type ImportReviewsResult = {
  importedCount: number;
  skipped: Array<{
    sourceRowNumber?: number;
    reason: string;
    existingReviewId?: string;
  }>;
};

type LegacyReviewItem = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  category?: string;
  mood?: string | number;
  templateId?: string;
  templateName?: string;
  tags?: string[];
  answers?: Record<string, string>;
  photoUri?: string;
  photos?: Array<Partial<ReviewPhoto> & { uri?: string }>;
  isFavorite?: boolean;
  actionTagIds?: string[];
  stateTagIds?: string[];
  importSource?: 'notion-import';
  importFingerprint?: string;
};

export type TagCatalog = Record<TagType, TagDefinition[]>;

export async function getReviews(): Promise<ReviewItem[]> {
  try {
    const [rawReviews, tagCatalog] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      getTagCatalog(),
    ]);
    if (!rawReviews) return [];

    const parsed = JSON.parse(rawReviews) as LegacyReviewItem[];
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => normalizeReview(item, tagCatalog));
  } catch (error) {
    console.error('getReviews error:', error);
    return [];
  }
}

export async function getReviewById(id: string): Promise<ReviewItem | null> {
  const current = await getReviews();
  return current.find((item) => item.id === id) ?? null;
}

export async function getReviewByDateKey(
  dateKey: string,
  excludeId?: string
): Promise<ReviewItem | null> {
  const current = await getReviews();
  return (
    current.find((item) => {
      if (excludeId && item.id === excludeId) return false;
      return toDateKey(new Date(item.createdAt)) === dateKey;
    }) ?? null
  );
}

export async function saveReview(item: ReviewItem): Promise<void> {
  const current = await getReviews();
  const next = [normalizeReviewForSave(item), ...current.filter((review) => review.id !== item.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next.sort(sortReviewsByCreatedAtDesc)));
}

export async function updateReview(updatedItem: ReviewItem): Promise<void> {
  const current = await getReviews();
  const normalized = normalizeReviewForSave(updatedItem);
  const hasExisting = current.some((item) => item.id === updatedItem.id);
  const next = hasExisting
    ? current.map((item) => (item.id === updatedItem.id ? normalized : item))
    : [normalized, ...current];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next.sort(sortReviewsByCreatedAtDesc)));
}

export async function deleteReview(id: string): Promise<void> {
  const current = await getReviews();
  const next = current.filter((item) => item.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearAllReviews(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function replaceAllReviews(reviews: ReviewItem[]): Promise<void> {
  const normalized = reviews.map((item) => normalizeReviewForSave(item));
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalized.sort(sortReviewsByCreatedAtDesc))
  );
}

export async function importReviews(
  drafts: ImportReviewDraft[]
): Promise<ImportReviewsResult> {
  const [current, tagCatalog] = await Promise.all([getReviews(), getTagCatalog()]);
  const skipped: ImportReviewsResult['skipped'] = [];
  const existingFingerprintMap = new Map(
    current
      .filter((item) => item.importFingerprint)
      .map((item) => [item.importFingerprint as string, item.id] as const)
  );
  const tagLookup = buildLegacyTagLookup(tagCatalog);
  const accepted: ReviewItem[] = [];
  let catalogChanged = false;

  const ensureTagIds = (
    labels: string[] | undefined,
    type: TagType
  ): string[] => {
    const nextIds: string[] = [];

    for (const rawLabel of labels ?? []) {
      const trimmed = rawLabel.trim();
      if (!trimmed) continue;

      let existing = tagCatalog[type].find(
        (item) => item.label.trim().toLowerCase() === trimmed.toLowerCase()
      );

      if (!existing) {
        existing = {
          id: createLocalTagId(type),
          label: trimmed,
          type,
          isArchived: false,
          createdAt: new Date().toISOString(),
        };
        tagCatalog[type] = [existing, ...tagCatalog[type]];
        tagLookup.set(existing.label, existing.id);
        catalogChanged = true;
      } else if (existing.isArchived) {
        existing.isArchived = false;
        catalogChanged = true;
      }

      nextIds.push(existing.id);
    }

    return dedupe(nextIds);
  };

  drafts.forEach((draft, index) => {
    const createdAt = new Date(draft.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      skipped.push({
        sourceRowNumber: draft.sourceRowNumber,
        reason: '日付が不正なため取り込めませんでした。',
      });
      return;
    }

    const existingReviewId = draft.importFingerprint
      ? existingFingerprintMap.get(draft.importFingerprint)
      : undefined;
    if (existingReviewId) {
      skipped.push({
        sourceRowNumber: draft.sourceRowNumber,
        reason: '同じ Notion データが既に取り込まれているためスキップしました。',
        existingReviewId,
      });
      return;
    }

    const duplicateDraft = accepted.find(
      (item) => item.importFingerprint && item.importFingerprint === draft.importFingerprint
    );
    if (duplicateDraft) {
      skipped.push({
        sourceRowNumber: draft.sourceRowNumber,
        reason: 'CSV 内で同じデータが重複しているためスキップしました。',
      });
      return;
    }

    accepted.push(
      normalizeReviewForSave({
        id: createImportedReviewId(),
        createdAt: createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
        category: draft.category,
        mood: draft.mood,
        templateId: draft.templateId,
        templateName: draft.templateName,
        actionTagIds: ensureTagIds(draft.actionTags, 'action'),
        stateTagIds: ensureTagIds(draft.stateTags, 'state'),
        answers: draft.answers,
        photos: [],
        isFavorite: draft.isFavorite ?? false,
        importSource: draft.importSource,
        importFingerprint: draft.importFingerprint,
      })
    );
    if (draft.importFingerprint) {
      existingFingerprintMap.set(draft.importFingerprint, accepted[accepted.length - 1].id);
    }
  });

  if (accepted.length > 0) {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...accepted, ...current].sort(sortReviewsByCreatedAtDesc))
    );
  }

  if (catalogChanged) {
    await saveTagCatalog(tagCatalog);
  }

  return {
    importedCount: accepted.length,
    skipped,
  };
}

export async function toggleFavoriteReview(id: string): Promise<void> {
  const current = await getReviews();
  const next = current.map((item) =>
    item.id === id
      ? {
          ...item,
          isFavorite: !item.isFavorite,
          updatedAt: new Date().toISOString(),
        }
      : item
  );

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function getTemplateOrder(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(TEMPLATE_ORDER_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return mergeTemplateOrder(parsed);
  } catch (error) {
    console.error('getTemplateOrder error:', error);
    return templates.map((item) => item.id);
  }
}

export async function saveTemplateOrder(order: string[]): Promise<void> {
  await AsyncStorage.setItem(
    TEMPLATE_ORDER_KEY,
    JSON.stringify(mergeTemplateOrder(order))
  );
}

export async function getTagCatalog(): Promise<TagCatalog> {
  try {
    const [raw, deletedRaw] = await Promise.all([
      AsyncStorage.getItem(TAG_CATALOG_KEY),
      AsyncStorage.getItem(TAG_DELETED_DEFAULTS_KEY),
    ]);
    const deletedIds = new Set<string>(deletedRaw ? (JSON.parse(deletedRaw) as string[]) : []);
    if (!raw) return cloneDefaultTagCatalog();

    const parsed = JSON.parse(raw) as Partial<TagCatalog>;
    return {
      action: mergeTagDefinitions(parsed.action, DEFAULT_TAGS.action, deletedIds),
      state: mergeTagDefinitions(parsed.state, DEFAULT_TAGS.state, deletedIds),
    };
  } catch (error) {
    console.error('getTagCatalog error:', error);
    return cloneDefaultTagCatalog();
  }
}

export async function saveTagCatalog(catalog: TagCatalog): Promise<void> {
  await AsyncStorage.setItem(TAG_CATALOG_KEY, JSON.stringify(catalog));
}

export async function replaceTagCatalog(catalog: TagCatalog): Promise<void> {
  await saveTagCatalog({
    action: catalog.action.map((item) => ({ ...item })),
    state: catalog.state.map((item) => ({ ...item })),
  });
}

export async function createTag(
  type: TagType,
  label: string
): Promise<TagDefinition | null> {
  const trimmed = label.trim();
  if (!trimmed) return null;

  const catalog = await getTagCatalog();
  const existing = catalog[type].find(
    (item) => item.label.trim().toLowerCase() === trimmed.toLowerCase()
  );

  if (existing) {
    if (existing.isArchived) {
      existing.isArchived = false;
      await saveTagCatalog(catalog);
    }
    return existing;
  }

  const nextTag: TagDefinition = {
    id: createLocalTagId(type),
    label: trimmed,
    type,
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  catalog[type] = [...catalog[type], nextTag];
  await saveTagCatalog(catalog);
  return nextTag;
}

export async function deleteTag(tagId: string): Promise<void> {
  const catalog = await getTagCatalog();
  const deletedDefaultIds = await loadDeletedDefaultTagIds();
  const nextCatalog: TagCatalog = {
    action: catalog.action.filter((item) => item.id !== tagId),
    state: catalog.state.filter((item) => item.id !== tagId),
  };

  const reviews = await getReviews();
  const nextReviews = reviews.map((item) => ({
    ...item,
    actionTagIds: item.actionTagIds.filter((id) => id !== tagId),
    stateTagIds: item.stateTagIds.filter((id) => id !== tagId),
  }));

  const isDefaultTag = [...DEFAULT_TAGS.action, ...DEFAULT_TAGS.state].some((item) => item.id === tagId);
  const nextDeletedDefaultIds = isDefaultTag
    ? Array.from(new Set([...deletedDefaultIds, tagId]))
    : deletedDefaultIds;

  await Promise.all([
    saveTagCatalog(nextCatalog),
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextReviews.sort(sortReviewsByCreatedAtDesc))),
    AsyncStorage.setItem(TAG_DELETED_DEFAULTS_KEY, JSON.stringify(nextDeletedDefaultIds)),
  ]);
}

export async function reorderTags(type: TagType, orderedIds: string[]): Promise<void> {
  const catalog = await getTagCatalog();
  const current = catalog[type];
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));

  catalog[type] = [...current].sort((a, b) => {
    const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (indexA !== indexB) return indexA - indexB;
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  });

  await saveTagCatalog(catalog);
}

export async function setTagArchived(
  tagId: string,
  isArchived: boolean
): Promise<void> {
  const catalog = await getTagCatalog();

  (['action', 'state'] as const).forEach((type) => {
    catalog[type] = catalog[type].map((item) =>
      item.id === tagId ? { ...item, isArchived } : item
    );
  });

  await saveTagCatalog(catalog);
}

export function getOrderedTemplates(order: string[]) {
  const map = new Map(templates.map((template) => [template.id, template]));
  return mergeTemplateOrder(order)
    .map((id) => map.get(id))
    .filter((item): item is (typeof templates)[number] => Boolean(item));
}

export function getTagLabelMap(catalog: TagCatalog) {
  return new Map(
    [...catalog.action, ...catalog.state].map((tag) => [tag.id, tag.label])
  );
}

function normalizeReview(item: LegacyReviewItem, tagCatalog: TagCatalog): ReviewItem {
  const category = normalizeCategory(item.category);
  const mood = normalizeMood(item.mood);
  const templateName = normalizeTemplateName(item.templateId, item.templateName);
  const tagLookup = buildLegacyTagLookup(tagCatalog);
  const legacyTagIds = (item.tags ?? []).map((tag) => tagLookup.get(tag) ?? '');
  const actionTagIds = dedupe(
    (item.actionTagIds ?? []).concat(
      legacyTagIds.filter((id) => id.startsWith('action-'))
    )
  );
  const stateTagIds = dedupe(
    (item.stateTagIds ?? []).concat(
      legacyTagIds.filter((id) => id.startsWith('state-'))
    )
  );

  const photos = normalizePhotos(item);

  return {
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    category,
    mood,
    templateId: item.templateId,
    templateName,
    actionTagIds,
    stateTagIds,
    answers: item.answers ?? {},
    photos,
    isFavorite: item.isFavorite ?? false,
    importSource: item.importSource,
    importFingerprint: item.importFingerprint,
  };
}

function normalizeReviewForSave(item: ReviewItem): ReviewItem {
  return {
    ...item,
    category: normalizeCategory(item.category),
    mood: normalizeMood(item.mood),
    actionTagIds: dedupe(item.actionTagIds ?? []),
    stateTagIds: dedupe(item.stateTagIds ?? []),
    photos: normalizePhotos(item),
    isFavorite: item.isFavorite ?? false,
    importSource: item.importSource,
    importFingerprint: item.importFingerprint,
  };
}

function normalizePhotos(
  item: Pick<LegacyReviewItem, 'photos' | 'photoUri'>
): ReviewPhoto[] {
  const rawPhotos =
    item.photos && item.photos.length > 0
      ? item.photos
      : item.photoUri
        ? [{ id: 'legacy-photo', uri: item.photoUri, comment: '', order: 0 }]
        : [];

  return rawPhotos
    .filter((photo) => typeof photo.uri === 'string' && photo.uri.trim())
    .map((photo, index) => ({
      id: photo.id ?? createLocalId(`normalized-photo-${index}`),
      uri: photo.uri as string,
      storagePath:
        typeof (photo as ReviewPhoto).storagePath === 'string'
          ? (photo as ReviewPhoto).storagePath
          : undefined,
      comment: typeof photo.comment === 'string' ? photo.comment : '',
      order: typeof photo.order === 'number' ? photo.order : index,
    }))
    .sort((a, b) => a.order - b.order)
    .map((photo, index) => ({ ...photo, order: index }));
}

function normalizeCategory(value?: string): CategoryOption {
  return CATEGORIES.includes(value as CategoryOption)
    ? (value as CategoryOption)
    : CATEGORIES[1];
}

function normalizeMood(value?: string | number): MoodValue | undefined {
  if (typeof value === 'number') {
    return MOOD_OPTIONS.some((item) => item.value === value)
      ? (value as MoodValue)
      : undefined;
  }

  if (typeof value === 'string') {
    const index = MOOD_OPTIONS.findIndex(
      (item) => item.label === value || `${item.emoji} ${item.label}` === value
    );
    if (index >= 0) return MOOD_OPTIONS[index].value;
  }

  return undefined;
}

function normalizeTemplateName(templateId?: string, fallbackName?: string) {
  if (templateId) {
    const matched = templates.find((template) => template.id === templateId);
    if (matched) return matched.name;
  }

  return fallbackName ?? '記録';
}

function mergeTemplateOrder(order: string[]) {
  const seen = new Set<string>();
  const merged = [...order, ...templates.map((template) => template.id)].filter(
    (id) => {
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return templates.some((template) => template.id === id);
    }
  );
  return merged;
}

function cloneDefaultTagCatalog(): TagCatalog {
  return {
    action: DEFAULT_TAGS.action.map((item) => ({ ...item })),
    state: DEFAULT_TAGS.state.map((item) => ({ ...item })),
  };
}

function mergeTagDefinitions(
  current: TagDefinition[] | undefined,
  defaults: TagDefinition[],
  deletedIds: Set<string>
): TagDefinition[] {
  const currentItems = (current ?? []).filter((item) => item?.id && item?.label);
  const seen = new Set(currentItems.map((item) => item.id));
  const merged = currentItems.map((item) => ({ ...item }));

  defaults.forEach((item) => {
    if (!seen.has(item.id) && !deletedIds.has(item.id)) {
      merged.push({ ...item, isArchived: false });
    }
  });

  return merged;
}

async function loadDeletedDefaultTagIds() {
  try {
    const raw = await AsyncStorage.getItem(TAG_DELETED_DEFAULTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch (error) {
    console.error('loadDeletedDefaultTagIds error:', error);
    return [];
  }
}

function buildLegacyTagLookup(catalog: TagCatalog) {
  return new Map(
    [...catalog.action, ...catalog.state].map((tag) => [tag.label, tag.id] as const)
  );
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sortReviewsByCreatedAtDesc(a: ReviewItem, b: ReviewItem) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
