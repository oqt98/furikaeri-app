import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CategoryOption, MoodValue } from '../data/reviewOptions';
import type { ReviewPhoto } from './storage';

const ENTRY_DRAFTS_KEY = 'furikaeri-entry-drafts';

export type EntryDraft = {
  templateId: string;
  selectedDateKey: string;
  category: CategoryOption;
  mood: MoodValue;
  answers: Record<string, string>;
  actionTagIds: string[];
  stateTagIds: string[];
  photos: ReviewPhoto[];
  updatedAt: string;
};

type DraftMap = Record<string, EntryDraft>;

export async function getEntryDraft(draftKey: string): Promise<EntryDraft | null> {
  const drafts = await loadDrafts();
  return drafts[draftKey] ?? null;
}

export async function saveEntryDraft(
  draftKey: string,
  draft: Omit<EntryDraft, 'updatedAt'>
): Promise<void> {
  const drafts = await loadDrafts();
  drafts[draftKey] = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(ENTRY_DRAFTS_KEY, JSON.stringify(drafts));
}

export async function clearEntryDraft(draftKey: string): Promise<void> {
  const drafts = await loadDrafts();
  if (!drafts[draftKey]) return;
  delete drafts[draftKey];
  await AsyncStorage.setItem(ENTRY_DRAFTS_KEY, JSON.stringify(drafts));
}

async function loadDrafts(): Promise<DraftMap> {
  try {
    const raw = await AsyncStorage.getItem(ENTRY_DRAFTS_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as DraftMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.error('loadEntryDrafts error:', error);
    return {};
  }
}
