const { beforeEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');

const asyncStorage = require('./async-storage-mock.cjs');
const {
  DuplicateReviewDateError,
  createTag,
  getReviews,
  getTagCatalog,
  getTemplateOrder,
  importReviews,
  saveReview,
} = require('../lib/storage.ts');

function createReview(overrides = {}) {
  return {
    id: 'review-1',
    createdAt: '2026-04-06T08:00:00',
    updatedAt: '2026-04-06T08:00:00',
    category: '仕事',
    mood: 4,
    templateId: 'diary',
    templateName: 'ひとことメモ',
    actionTagIds: ['action-reading'],
    stateTagIds: ['state-relaxed'],
    answers: { memo: 'メモ' },
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
          category: '不明',
          mood: '🙂 よかった',
          templateId: 'kpt',
          tags: ['読書', '忙しい'],
          answers: { note: 'legacy' },
          photoUri: 'file:///legacy.jpg',
        },
      ])
    );

    const reviews = await getReviews();

    assert.equal(reviews.length, 1);
    assert.equal(reviews[0].category, 'プライベート');
    assert.equal(reviews[0].mood, 4);
    assert.equal(reviews[0].templateName, 'KPT');
    assert.deepEqual(reviews[0].actionTagIds, ['action-reading']);
    assert.deepEqual(reviews[0].stateTagIds, ['state-busy']);
    assert.equal(reviews[0].photos.length, 1);
    assert.equal(reviews[0].photos[0].uri, 'file:///legacy.jpg');
    assert.equal(reviews[0].isFavorite, false);
  });

  it('saveReview stores a normalized record and rejects another review on the same date', async () => {
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
    assert.equal(saved.length, 1);
    assert.deepEqual(saved[0].actionTagIds, ['action-reading']);
    assert.deepEqual(saved[0].stateTagIds, ['state-relaxed']);
    assert.deepEqual(
      saved[0].photos.map((photo) => ({ id: photo.id, order: photo.order })),
      [
        { id: 'photo-1', order: 0 },
        { id: 'photo-2', order: 1 },
      ]
    );

    await assert.rejects(
      () =>
        saveReview(
          createReview({
            id: 'review-2',
            createdAt: '2026-04-06T22:30:00',
          })
        ),
      (error) => {
        assert.ok(error instanceof DuplicateReviewDateError);
        assert.equal(error.existingReviewId, 'review-1');
        return true;
      }
    );
  });

  it('importReviews imports valid rows, skips invalid duplicates, and creates missing tags', async () => {
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
        category: '仕事',
        mood: 5,
        templateName: 'CSV取込',
        actionTags: ['集中', '新規タグ'],
        stateTags: ['疲れた'],
        answers: { note: 'imported' },
      },
      {
        sourceRowNumber: 2,
        createdAt: 'not-a-date',
        category: '仕事',
        templateName: 'invalid',
        answers: {},
      },
      {
        sourceRowNumber: 3,
        createdAt: '2026-04-01T19:00:00',
        category: '仕事',
        templateName: 'duplicate-existing',
        answers: {},
      },
      {
        sourceRowNumber: 4,
        createdAt: '2026-04-03T18:00:00',
        category: '仕事',
        templateName: 'duplicate-in-file',
        answers: {},
      },
    ]);

    assert.equal(result.importedCount, 1);
    assert.deepEqual(
      result.skipped.map((item) => item.sourceRowNumber),
      [2, 3, 4]
    );

    const reviews = await getReviews();
    assert.equal(reviews.length, 2);
    assert.equal(reviews[0].templateName, 'CSV取込');
    assert.equal(reviews[0].actionTagIds.length, 2);
    assert.equal(reviews[0].stateTagIds.length, 1);

    const tagCatalog = await getTagCatalog();
    const focusTag = tagCatalog.action.find((tag) => tag.id === 'action-focus');
    const newActionTag = tagCatalog.action.find((tag) => tag.label === '新規タグ');
    const tiredTag = tagCatalog.state.find((tag) => tag.label === '疲れた');

    assert.equal(focusTag?.isArchived, false);
    assert.ok(newActionTag);
    assert.ok(tiredTag);
  });

  it('template order appends missing templates while preserving valid custom order', async () => {
    await asyncStorage.setItem(
      'furikaeri-template-order',
      JSON.stringify(['kpt', 'unknown-template', 'diary', 'kpt'])
    );

    const order = await getTemplateOrder();

    assert.deepEqual(order.slice(0, 2), ['kpt', 'diary']);
    assert.ok(order.includes('ywt'));
    assert.equal(new Set(order).size, order.length);
  });

  it('createTag restores an archived matching tag instead of duplicating it', async () => {
    await asyncStorage.setItem(
      'furikaeri-tag-catalog',
      JSON.stringify({
        action: [
          {
            id: 'action-custom',
            label: '深呼吸',
            type: 'action',
            isArchived: true,
          },
        ],
        state: [],
      })
    );

    const created = await createTag('action', '  深呼吸  ');
    const tagCatalog = await getTagCatalog();

    assert.equal(created?.id, 'action-custom');
    assert.equal(tagCatalog.action.filter((tag) => tag.label === '深呼吸').length, 1);
    assert.equal(tagCatalog.action.find((tag) => tag.id === 'action-custom')?.isArchived, false);
  });
});
