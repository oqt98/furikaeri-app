import asyncStorage from './async-storage-mock.cjs';
import {
  createTag,
  deleteTag,
  getReviews,
  getTagCatalog,
  getTemplateOrder,
  importReviews,
  replaceAllReviews,
  replaceTagCatalog,
  reorderTags,
  saveReview,
} from '../lib/storage';
import { CATEGORIES } from '../data/reviewOptions';
import { templates } from '../data/templates';

function createReview(overrides = {}) {
  return {
    id: 'review-1',
    createdAt: '2026-04-06T08:00:00.000Z',
    updatedAt: '2026-04-06T08:00:00.000Z',
    category: CATEGORIES[0],
    mood: 4 as const,
    templateId: 'diary',
    templateName: templates[0].name,
    actionTagIds: ['action-reading'],
    stateTagIds: ['state-relaxed'],
    answers: { title: 'テスト' },
    photos: [],
    isFavorite: false,
    ...overrides,
  };
}

beforeEach(async () => {
  await asyncStorage.clear();
});

describe('lib/storage', () => {
  it('reads legacy saved data and normalizes category, mood, tags, and photos', async () => {
    await asyncStorage.setItem(
      'furikaeri-history',
      JSON.stringify([
        {
          id: 'legacy-1',
          createdAt: '2026-04-05T09:00:00',
          category: 'プライベート',
          mood: '😊 よかった',
          templateId: 'kpt',
          tags: ['読書', '忙しい'],
          answers: { note: 'legacy' },
          photoUri: 'file:///legacy.jpg',
        },
      ])
    );

    const reviews = await getReviews();

    expect(reviews).toHaveLength(1);
    expect(reviews[0].category).toBe('プライベート');
    expect(reviews[0].mood).toBe(4);
    expect(reviews[0].templateName).toBe('KPT');
    expect(reviews[0].actionTagIds).toEqual(['action-reading']);
    expect(reviews[0].stateTagIds).toEqual(['state-busy']);
    expect(reviews[0].photos).toHaveLength(1);
    expect(reviews[0].photos[0].uri).toBe('file:///legacy.jpg');
    expect(reviews[0].isFavorite).toBe(false);
  });

  it('saveReview stores normalized records and allows multiple records per day', async () => {
    await saveReview(
      createReview({
        actionTagIds: ['action-reading', 'action-reading'],
        stateTagIds: ['state-relaxed', 'state-relaxed'],
        photos: [
          { id: 'photo-2', uri: 'file:///b.jpg', comment: 'B', order: 2 },
          { id: 'photo-1', uri: 'file:///a.jpg', comment: 'A', order: 0 },
        ],
      })
    );

    const saved = await getReviews();
    expect(saved).toHaveLength(1);
    expect(saved[0].actionTagIds).toEqual(['action-reading']);
    expect(saved[0].stateTagIds).toEqual(['state-relaxed']);
    expect(saved[0].photos.map((photo) => ({ id: photo.id, order: photo.order }))).toEqual([
      { id: 'photo-1', order: 0 },
      { id: 'photo-2', order: 1 },
    ]);

    await saveReview(
      createReview({
        id: 'review-2',
        createdAt: '2026-04-06T22:30:00',
      })
    );

    const nextSaved = await getReviews();
    expect(nextSaved).toHaveLength(2);
    expect(nextSaved.map((item) => item.id)).toEqual(['review-2', 'review-1']);
  });

  it('importReviews imports valid rows, skips invalid duplicate fingerprints, and creates missing tags', async () => {
    await asyncStorage.setItem(
      'furikaeri-tag-catalog',
      JSON.stringify({
        action: [
          {
            id: 'action-focus',
            label: '集中',
            type: 'action',
            isArchived: true,
          },
        ],
        state: [],
      })
    );
    await saveReview(
      createReview({
        id: 'existing-1',
        createdAt: '2026-04-01T09:00:00',
      })
    );

    const result = await importReviews([
      {
        sourceRowNumber: 1,
        createdAt: '2026-04-03T09:00:00',
        category: CATEGORIES[0],
        mood: 5,
        templateName: 'CSV取り込み',
        actionTags: ['集中', '新しいタグ'],
        stateTags: ['疲れた'],
        answers: { note: 'imported' },
        importSource: 'notion-import',
        importFingerprint: 'fp-new',
      },
      {
        sourceRowNumber: 2,
        createdAt: 'not-a-date',
        category: CATEGORIES[0],
        templateName: 'invalid',
        answers: {},
        importSource: 'notion-import',
        importFingerprint: 'fp-invalid',
      },
      {
        sourceRowNumber: 3,
        createdAt: '2026-04-01T19:00:00',
        category: CATEGORIES[0],
        templateName: 'same-day-existing',
        answers: {},
        importSource: 'notion-import',
        importFingerprint: 'fp-same-day',
      },
      {
        sourceRowNumber: 4,
        createdAt: '2026-04-03T18:00:00',
        category: CATEGORIES[0],
        templateName: 'duplicate-in-file',
        answers: {},
        importSource: 'notion-import',
        importFingerprint: 'fp-new',
      },
    ]);

    expect(result.importedCount).toBe(2);
    expect(result.skipped.map((item) => item.sourceRowNumber)).toEqual([2, 4]);

    const reviews = await getReviews();
    expect(reviews).toHaveLength(3);
    expect(reviews[0].templateName).toBe('CSV取り込み');
    expect(reviews[0].actionTagIds).toHaveLength(2);
    expect(reviews[0].stateTagIds).toHaveLength(1);
    expect(reviews[0].importFingerprint).toBe('fp-new');

    const tagCatalog = await getTagCatalog();
    const focusTag = tagCatalog.action.find((tag) => tag.id === 'action-focus');
    const newActionTag = tagCatalog.action.find((tag) => tag.label === '新しいタグ');
    const tiredTag = tagCatalog.state.find((tag) => tag.label === '疲れた');

    expect(focusTag?.isArchived).toBe(false);
    expect(newActionTag).toBeTruthy();
    expect(tiredTag).toBeTruthy();
  });

  it('template order appends missing templates while preserving valid custom order', async () => {
    await asyncStorage.setItem(
      'furikaeri-template-order',
      JSON.stringify(['kpt', 'unknown-template', 'diary', 'kpt'])
    );

    const order = await getTemplateOrder();

    expect(order.slice(0, 2)).toEqual(['kpt', 'diary']);
    expect(order).toContain('ywt');
    expect(new Set(order).size).toBe(order.length);
  });

  it('createTag restores an archived matching tag instead of duplicating it', async () => {
    await asyncStorage.setItem(
      'furikaeri-tag-catalog',
      JSON.stringify({
        action: [
          {
            id: 'action-custom',
            label: '整理',
            type: 'action',
            isArchived: true,
          },
        ],
        state: [],
      })
    );

    const created = await createTag('action', '  整理  ');
    const tagCatalog = await getTagCatalog();

    expect(created?.id).toBe('action-custom');
    expect(tagCatalog.action.filter((tag) => tag.label === '整理')).toHaveLength(1);
    expect(tagCatalog.action.find((tag) => tag.id === 'action-custom')?.isArchived).toBe(
      false
    );
  });

  it('reorderTags persists the custom order and deleteTag removes tag references from reviews', async () => {
    await reorderTags('action', ['action-study', 'action-reading']);

    let tagCatalog = await getTagCatalog();
    expect(tagCatalog.action[0].id).toBe('action-study');

    await saveReview(
      createReview({
        actionTagIds: ['action-reading', 'action-study'],
      })
    );

    await deleteTag('action-reading');

    const reviews = await getReviews();
    expect(reviews[0].actionTagIds).toEqual(['action-study']);

    tagCatalog = await getTagCatalog();
    expect(tagCatalog.action.find((tag) => tag.id === 'action-reading')).toBeFalsy();
  });

  it('replaceAllReviews rewrites the local cache in createdAt order', async () => {
    await replaceAllReviews([
      createReview({
        id: 'review-older',
        createdAt: '2026-04-01T08:00:00.000Z',
      }),
      createReview({
        id: 'review-newer',
        createdAt: '2026-04-08T08:00:00.000Z',
      }),
    ]);

    const reviews = await getReviews();
    expect(reviews.map((item) => item.id)).toEqual(['review-newer', 'review-older']);
  });

  it('replaceTagCatalog rewrites the local tag catalog', async () => {
    await replaceTagCatalog({
      action: [
        {
          id: 'action-remote',
          label: '遠隔同期',
          type: 'action',
          isArchived: false,
          createdAt: '2026-04-01T00:00:00.000Z',
        },
      ],
      state: [],
    });

    const catalog = await getTagCatalog();
    expect(catalog.action.find((item) => item.id === 'action-remote')?.label).toBe(
      '遠隔同期'
    );
  });
});
