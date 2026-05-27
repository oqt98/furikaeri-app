import {
  deleteReview,
  DuplicateReviewDateError,
  getReviewById,
  getReviews,
  replaceAllReviews,
  saveReview,
  toggleFavoriteReview,
  updateReview,
  type ReviewItem,
} from './storage';
import { getTagCatalog } from './storage';
import { ensureAnonymousSession } from './supabase/auth';
import { getSupabaseClient } from './supabase/client';
import { isSupabaseEnabled } from './supabase/env';
import {
  createSignedPhotoUrl,
  removeReviewPhotosFromStorage,
  uploadReviewPhoto,
} from './supabase/storage';
import { toLocalTagId, toRemoteTagId } from './supabase/tagIds';
import { toDateKey } from './reviewDate';

type RemoteReviewRow = {
  id: string;
  user_id: string;
  review_date: string;
  created_at: string;
  updated_at: string;
  category: string;
  mood: number | null;
  template_id: string | null;
  template_name: string | null;
  answers_json: Record<string, string>;
  is_favorite: boolean;
  import_source: 'notion-import' | null;
  import_fingerprint: string | null;
};

type RemoteReviewPhotoRow = {
  id: string;
  review_id: string;
  storage_path: string;
  comment: string | null;
  sort_order: number;
  created_at: string;
};

type RemoteReviewTagRow = {
  review_id: string;
  tag_id: string;
};

type RemoteTagRow = {
  id: string;
  label: string;
  type: 'action' | 'state';
};

export type ReviewRepository = {
  list: () => Promise<ReviewItem[]>;
  getById: (id: string) => Promise<ReviewItem | null>;
  create: (item: ReviewItem) => Promise<void>;
  update: (item: ReviewItem) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
};

export class ReviewSyncError extends Error {
  operation: 'create' | 'update' | 'remove' | 'toggleFavorite';
  localSaved: boolean;

  constructor(
    operation: ReviewSyncError['operation'],
    message: string,
    localSaved = true
  ) {
    super(message);
    this.name = 'ReviewSyncError';
    this.operation = operation;
    this.localSaved = localSaved;
  }
}

export const localReviewRepository: ReviewRepository = {
  list: () => getReviews(),
  getById: (id) => getReviewById(id),
  create: (item) => saveReview(item),
  update: (item) => updateReview(item),
  remove: (id) => deleteReview(id),
  toggleFavorite: (id) => toggleFavoriteReview(id),
};

async function getRemoteContext() {
  if (!isSupabaseEnabled()) {
    return null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const session = await ensureAnonymousSession();
  if (session.status !== 'ready' || !session.userId) {
    return null;
  }

  return {
    supabase: supabase as any,
    userId: session.userId,
  };
}

async function mapRemoteReview(
  row: RemoteReviewRow,
  photos: RemoteReviewPhotoRow[],
  reviewTags: RemoteReviewTagRow[],
  tagsById: Map<string, RemoteTagRow>,
  userId: string
): Promise<ReviewItem> {
  const relatedPhotos = photos
    .filter((photo) => photo.review_id === row.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const resolvedPhotos = await Promise.all(
    relatedPhotos.map(async (photo) => ({
      id: photo.id,
      uri: await createSignedPhotoUrl(photo.storage_path),
      storagePath: photo.storage_path,
      comment: photo.comment ?? '',
      order: photo.sort_order,
    }))
  );

  const relatedTags = reviewTags.filter((item) => item.review_id === row.id);
  const actionTagIds = relatedTags
    .filter((item) => tagsById.get(item.tag_id)?.type === 'action')
    .map((item) => toLocalTagId(userId, item.tag_id));
  const stateTagIds = relatedTags
    .filter((item) => tagsById.get(item.tag_id)?.type === 'state')
    .map((item) => toLocalTagId(userId, item.tag_id));

  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: row.category as ReviewItem['category'],
    mood: (row.mood ?? undefined) as ReviewItem['mood'],
    templateId: row.template_id ?? undefined,
    templateName: row.template_name ?? '',
    actionTagIds,
    stateTagIds,
    answers: row.answers_json ?? {},
    photos: resolvedPhotos,
    isFavorite: row.is_favorite,
    importSource: row.import_source ?? undefined,
    importFingerprint: row.import_fingerprint ?? undefined,
  };
}

function mergeReviews(remote: ReviewItem[], local: ReviewItem[]) {
  const merged = new Map<string, ReviewItem>();

  remote.forEach((item) => {
    merged.set(item.id, item);
  });

  local.forEach((item) => {
    if (!merged.has(item.id)) {
      merged.set(item.id, item);
    }
  });

  return [...merged.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function listRemoteReviews(): Promise<ReviewItem[] | null> {
  const context = await getRemoteContext();
  if (!context) {
    return null;
  }

  const { supabase, userId } = context;
  const { data: reviewRows, error: reviewError } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .order('review_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (reviewError) {
    throw reviewError;
  }

  const reviews = (reviewRows ?? []) as RemoteReviewRow[];
  if (reviews.length === 0) {
    return [];
  }

  const reviewIds = reviews.map((item) => item.id);
  const { data: photoRows, error: photoError } = await supabase
    .from('review_photos')
    .select('*')
    .in('review_id', reviewIds)
    .order('sort_order', { ascending: true });

  if (photoError) {
    throw photoError;
  }

  const { data: reviewTagRows, error: reviewTagError } = await supabase
    .from('review_tags')
    .select('*')
    .in('review_id', reviewIds);

  if (reviewTagError) {
    throw reviewTagError;
  }

  const tagIds = Array.from(
    new Set(((reviewTagRows ?? []) as RemoteReviewTagRow[]).map((item) => item.tag_id))
  );
  let tagsById = new Map<string, RemoteTagRow>();

  if (tagIds.length > 0) {
    const { data: tagRows, error: tagError } = await supabase
      .from('tags')
      .select('id, label, type')
      .in('id', tagIds);

    if (tagError) {
      throw tagError;
    }

    tagsById = new Map(
      ((tagRows ?? []) as RemoteTagRow[]).map((item) => [item.id, item] as const)
    );
  }

  return Promise.all(
    reviews.map((row) =>
      mapRemoteReview(
        row,
        (photoRows ?? []) as RemoteReviewPhotoRow[],
        (reviewTagRows ?? []) as RemoteReviewTagRow[],
        tagsById,
        userId
      )
    )
  );
}

async function getRemoteReviewById(id: string): Promise<ReviewItem | null> {
  const remoteReviews = await listRemoteReviews();
  return remoteReviews?.find((item) => item.id === id) ?? null;
}

async function upsertRemoteReview(item: ReviewItem) {
  const context = await getRemoteContext();
  if (!context) {
    return;
  }

  const { supabase, userId } = context;
  const reviewRow = {
    id: item.id,
    user_id: userId,
    review_date: toDateKey(new Date(item.createdAt)),
    created_at: item.createdAt,
    updated_at: item.updatedAt ?? new Date().toISOString(),
    category: item.category,
    mood: item.mood ?? null,
    template_id: item.templateId ?? null,
    template_name: item.templateName,
    answers_json: item.answers,
    is_favorite: Boolean(item.isFavorite),
    import_source: item.importSource ?? null,
    import_fingerprint: item.importFingerprint ?? null,
  };

  const { error: reviewError } = await supabase
    .from('reviews')
    .upsert(reviewRow, { onConflict: 'id' });

  if (reviewError) {
    throw reviewError;
  }

  const localTagCatalog = await getTagCatalog();
  const tagDefinitions = new Map(
    [...localTagCatalog.action, ...localTagCatalog.state].map((tag) => [tag.id, tag] as const)
  );
  const selectedTagIds = [...item.actionTagIds, ...item.stateTagIds];
  const tagRows = selectedTagIds.map((tagId) => {
    const definition = tagDefinitions.get(tagId);
    return {
      id: toRemoteTagId(userId, tagId),
      user_id: userId,
      label: definition?.label ?? tagId,
      type: definition?.type ?? (item.actionTagIds.includes(tagId) ? 'action' : 'state'),
      is_archived: Boolean(definition?.isArchived),
      created_at: definition?.createdAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  if (tagRows.length > 0) {
    const { error: tagError } = await supabase
      .from('tags')
      .upsert(tagRows, { onConflict: 'id' });

    if (tagError) {
      throw tagError;
    }
  }

  const { error: clearReviewTagsError } = await supabase
    .from('review_tags')
    .delete()
    .eq('review_id', item.id);

  if (clearReviewTagsError) {
    throw clearReviewTagsError;
  }

  if (selectedTagIds.length > 0) {
    const { error: reviewTagError } = await supabase.from('review_tags').insert(
      selectedTagIds.map((tagId) => ({
        review_id: item.id,
        tag_id: toRemoteTagId(userId, tagId),
      }))
    );

    if (reviewTagError) {
      throw reviewTagError;
    }
  }

  const { data: existingPhotoRows, error: existingPhotoError } = await supabase
    .from('review_photos')
    .select('storage_path')
    .eq('review_id', item.id);

  if (existingPhotoError) {
    throw existingPhotoError;
  }

  const { error: clearPhotoError } = await supabase
    .from('review_photos')
    .delete()
    .eq('review_id', item.id);

  if (clearPhotoError) {
    throw clearPhotoError;
  }

  const nextStoragePaths = new Set(
    item.photos
      .map((photo) => photo.storagePath)
      .filter((value): value is string => Boolean(value))
  );
  const staleStoragePaths = ((existingPhotoRows ?? []) as Array<{ storage_path: string }>)
    .map((row) => row.storage_path)
    .filter((storagePath) => !nextStoragePaths.has(storagePath));

  if (staleStoragePaths.length > 0) {
    await removeReviewPhotosFromStorage(staleStoragePaths);
  }

  if (item.photos.length > 0) {
    const uploadedPhotos = await Promise.all(
      item.photos.map(async (photo) => ({
        ...photo,
        storagePath: await uploadReviewPhoto(userId, item.id, photo),
      }))
    );

    const { error: photoError } = await supabase.from('review_photos').insert(
      uploadedPhotos.map((photo, index) => ({
        id: photo.id,
        review_id: item.id,
        storage_path: photo.storagePath,
        comment: photo.comment,
        sort_order: typeof photo.order === 'number' ? photo.order : index,
      }))
    );

    if (photoError) {
      throw photoError;
    }
  }
}

async function removeRemoteReview(id: string) {
  const context = await getRemoteContext();
  if (!context) {
    return;
  }

  const { supabase } = context;
  const { data: photoRows, error: photoReadError } = await supabase
    .from('review_photos')
    .select('storage_path')
    .eq('review_id', id);

  if (photoReadError) {
    throw photoReadError;
  }

  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) {
    throw error;
  }

  await removeReviewPhotosFromStorage(
    ((photoRows ?? []) as Array<{ storage_path: string }>).map((row) => row.storage_path)
  );
}

export const reviewRepository: ReviewRepository = {
  async list() {
    const local = await localReviewRepository.list();

    try {
      const remote = await listRemoteReviews();
      if (!remote) {
        return local;
      }

      return mergeReviews(remote, local);
    } catch (error) {
      console.error('reviewRepository.list remote error:', error);
      return local;
    }
  },
  async getById(id) {
    const local = await localReviewRepository.getById(id);

    try {
      const remote = await getRemoteReviewById(id);
      return remote ?? local;
    } catch (error) {
      console.error('reviewRepository.getById remote error:', error);
      return local;
    }
  },
  async create(item) {
    await localReviewRepository.create(item);

    try {
      await upsertRemoteReview(item);
    } catch (error) {
      if (error instanceof DuplicateReviewDateError) {
        throw error;
      }
      console.error('reviewRepository.create remote error:', error);
      throw new ReviewSyncError(
        'create',
        '端末には保存しましたが、クラウド保存に失敗しました。通信状況を確認してもう一度試してください。'
      );
    }
  },
  async update(item) {
    await localReviewRepository.update(item);

    try {
      await upsertRemoteReview(item);
    } catch (error) {
      if (error instanceof DuplicateReviewDateError) {
        throw error;
      }
      console.error('reviewRepository.update remote error:', error);
      throw new ReviewSyncError(
        'update',
        '端末では更新しましたが、クラウド反映に失敗しました。時間をおいて再試行してください。'
      );
    }
  },
  async remove(id) {
    await localReviewRepository.remove(id);

    try {
      await removeRemoteReview(id);
    } catch (error) {
      console.error('reviewRepository.remove remote error:', error);
      throw new ReviewSyncError(
        'remove',
        '端末では削除しましたが、クラウド反映に失敗しました。'
      );
    }
  },
  async toggleFavorite(id) {
    await localReviewRepository.toggleFavorite(id);
    const next = await localReviewRepository.getById(id);

    if (!next) {
      return;
    }

    try {
      await upsertRemoteReview(next);
    } catch (error) {
      console.error('reviewRepository.toggleFavorite remote error:', error);
      throw new ReviewSyncError(
        'toggleFavorite',
        'お気に入りは端末で更新しましたが、クラウド反映に失敗しました。'
      );
    }
  },
};

export async function hydrateReviewsFromRemoteToLocal() {
  try {
    const [local, remote] = await Promise.all([
      localReviewRepository.list(),
      listRemoteReviews(),
    ]);

    if (!remote) {
      return;
    }

    await replaceAllReviews(mergeReviews(remote, local));
  } catch (error) {
    console.error('hydrateReviewsFromRemoteToLocal error:', error);
  }
}
