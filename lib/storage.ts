import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'furikaeri-history';

export type ReviewItem = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  category: '仕事' | 'プラベ';
  mood?: string;
  templateId?: string;
  templateName: string;
  tags?: string[];
  answers: Record<string, string>;
  photoUri?: string;
  isFavorite?: boolean;
};

export async function getReviews(): Promise<ReviewItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ReviewItem[];

    return Array.isArray(parsed)
      ? parsed.map((item) => ({
          ...item,
          tags: item.tags ?? [],
          photoUri: item.photoUri ?? '',
          isFavorite: item.isFavorite ?? false,
        }))
      : [];
  } catch (error) {
    console.error('getReviews error:', error);
    return [];
  }
}

export async function getReviewById(id: string): Promise<ReviewItem | null> {
  try {
    const current = await getReviews();
    return current.find((item) => item.id === id) ?? null;
  } catch (error) {
    console.error('getReviewById error:', error);
    return null;
  }
}

export async function saveReview(item: ReviewItem): Promise<void> {
  try {
    const current = await getReviews();
    const next = [item, ...current];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('saveReview error:', error);
    throw error;
  }
}

export async function updateReview(updatedItem: ReviewItem): Promise<void> {
  try {
    const current = await getReviews();

    const next = current.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('updateReview error:', error);
    throw error;
  }
}

export async function deleteReview(id: string): Promise<void> {
  try {
    const current = await getReviews();
    const next = current.filter((item) => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('deleteReview error:', error);
    throw error;
  }
}

export async function clearAllReviews(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('clearAllReviews error:', error);
    throw error;
  }
}

export async function toggleFavoriteReview(id: string): Promise<void> {
  try {
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
  } catch (error) {
    console.error('toggleFavoriteReview error:', error);
    throw error;
  }
}