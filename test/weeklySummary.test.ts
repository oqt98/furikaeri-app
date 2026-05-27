import { CATEGORIES } from '../data/reviewOptions';
import {
  buildWeeklySummarySource,
  getWeekRange,
  toLocalDateKey,
} from '../lib/weeklySummary';
import type { TagCatalog } from '../lib/storage';

describe('weeklySummary', () => {
  const tagCatalog: TagCatalog = {
    action: [
      {
        id: 'action-1',
        label: '整理',
        type: 'action',
        isArchived: false,
        createdAt: '2026-04-01',
      },
    ],
    state: [
      {
        id: 'state-1',
        label: '落ち着き',
        type: 'state',
        isArchived: false,
        createdAt: '2026-04-01',
      },
    ],
  };

  it('uses Monday as the start of the week', () => {
    const { start, end } = getWeekRange(new Date('2026-04-09T12:00:00+09:00'));

    expect(toLocalDateKey(start)).toBe('2026-04-06');
    expect(toLocalDateKey(end)).toBe('2026-04-12');
  });

  it('collects only reviews from the current week and resolves tag labels', () => {
    const source = buildWeeklySummarySource(
      [
        {
          id: 'review-1',
          createdAt: '2026-04-07T10:00:00+09:00',
          category: CATEGORIES[0],
          mood: 4,
          templateName: '仕事メモ',
          actionTagIds: ['action-1'],
          stateTagIds: ['state-1'],
          answers: { good: '集中できた', skip: '' },
          photos: [],
          isFavorite: true,
        },
        {
          id: 'review-2',
          createdAt: '2026-04-13T10:00:00+09:00',
          category: CATEGORIES[1],
          templateName: '生活メモ',
          actionTagIds: [],
          stateTagIds: [],
          answers: { note: '週外の記録' },
          photos: [],
          isFavorite: false,
        },
      ],
      tagCatalog,
      new Date('2026-04-09T12:00:00+09:00')
    );

    expect(source.weekStart).toBe('2026-04-06');
    expect(source.weekEnd).toBe('2026-04-12');
    expect(source.reviewCount).toBe(1);
    expect(source.recordedDays).toBe(1);
    expect(source.entries[0]).toEqual({
      date: '2026-04-07',
      mood: 4,
      category: CATEGORIES[0],
      templateName: '仕事メモ',
      answers: { good: '集中できた' },
      actionTags: ['整理'],
      stateTags: ['落ち着き'],
      favorite: true,
    });
  });
});
