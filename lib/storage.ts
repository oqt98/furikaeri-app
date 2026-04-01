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
};

export async function getReviews(): Promise<ReviewItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReviewItem[];
  } catch (error) {
    console.error('getReviews error:', error);
    return [];
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