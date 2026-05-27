import { getSupabaseClient } from './client';

const REVIEW_PHOTO_BUCKET = 'review-photos';

export function getReviewPhotoBucket() {
  return REVIEW_PHOTO_BUCKET;
}

export function buildReviewPhotoStoragePath(
  userId: string,
  reviewId: string,
  photoId: string,
  uri: string
) {
  const extension = inferFileExtension(uri);
  return `${userId}/${reviewId}/${photoId}.${extension}`;
}

export async function createSignedPhotoUrl(storagePath: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return storagePath;
  }

  const { data, error } = await (supabase as any)
    .storage
    .from(REVIEW_PHOTO_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error) {
    throw error;
  }

  return data?.signedUrl ?? storagePath;
}

export async function uploadReviewPhoto(
  userId: string,
  reviewId: string,
  photo: { id: string; uri: string; storagePath?: string }
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (photo.storagePath) {
    return photo.storagePath;
  }

  const response = await fetch(photo.uri);
  const arrayBuffer = await response.arrayBuffer();
  const storagePath = buildReviewPhotoStoragePath(userId, reviewId, photo.id, photo.uri);
  const contentType = guessMimeType(photo.uri);

  const { error } = await (supabase as any)
    .storage
    .from(REVIEW_PHOTO_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return storagePath;
}

export async function removeReviewPhotosFromStorage(storagePaths: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase || storagePaths.length === 0) {
    return;
  }

  const { error } = await (supabase as any)
    .storage
    .from(REVIEW_PHOTO_BUCKET)
    .remove(storagePaths);

  if (error) {
    throw error;
  }
}

function inferFileExtension(uri: string) {
  const match = uri.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/);
  const ext = match?.[1];
  if (ext === 'png' || ext === 'webp' || ext === 'heic') {
    return ext;
  }
  return 'jpg';
}

function guessMimeType(uri: string) {
  const ext = inferFileExtension(uri);
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}
