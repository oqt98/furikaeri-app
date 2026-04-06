const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { buildInsightSummary } = require('../lib/insights.ts');

function createReview(overrides = {}) {
  return {
    id: 'review-1',
    createdAt: '2026-04-06T08:00:00.000Z',
    updatedAt: '2026-04-06T08:00:00.000Z',
    category: '仕事',
    mood: 4,
    templateId: 'diary',
    templateName: 'ひとことメモ',
    actionTagIds: [],
    stateTagIds: [],
    answers: { memo: 'メモ' },
    photos: [],
    isFavorite: false,
    ...overrides,
  };
}

afterEach((context) => {
  context.mock.timers.reset();
});

describe('lib/insights', () => {
  it('returns the empty-state summary when there are no reviews', () => {
    const summary = buildInsightSummary([]);

    assert.equal(summary.weeklyTitle, '最初の1件から始めましょう');
    assert.equal(summary.weeklyStats[0].value, '0件');
    assert.equal(summary.weeklyStats[1].value, '0日');
    assert.match(summary.nextBody, /続けやすいテンプレート/);
  });

  it('summarizes only the last 7 days and computes streak, top mood, and template', (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-06T09:00:00.000Z') });

    const summary = buildInsightSummary([
      createReview({
        id: 'r1',
        createdAt: '2026-04-06T08:00:00.000Z',
        mood: 4,
        templateName: 'KPT',
      }),
      createReview({
        id: 'r2',
        createdAt: '2026-04-05T08:00:00.000Z',
        mood: 4,
        templateName: 'KPT',
      }),
      createReview({
        id: 'r3',
        createdAt: '2026-04-04T08:00:00.000Z',
        mood: 3,
        templateName: 'ひとことメモ',
      }),
      createReview({
        id: 'r4',
        createdAt: '2026-03-25T08:00:00.000Z',
        mood: 5,
        templateName: '古い記録',
      }),
    ]);

    assert.equal(summary.weeklyTitle, '直近1週間のメモ');
    assert.match(summary.weeklyBody, /3件の記録/);
    assert.match(summary.weeklyBody, /連続 3日/);
    assert.match(summary.weeklyBody, /気分は よかった が多め/);
    assert.match(summary.weeklyBody, /KPT をよく使用/);
    assert.deepEqual(summary.weeklyStats, [
      { label: '今週の記録', value: '3件' },
      { label: '連続日数', value: '3日' },
      { label: 'よく使う型', value: 'KPT' },
    ]);
  });

  it('prefers the low-mood hint when low moods dominate recent reviews', (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-06T09:00:00.000Z') });

    const summary = buildInsightSummary([
      createReview({ id: 'r1', createdAt: '2026-04-06T08:00:00.000Z', mood: 1 }),
      createReview({ id: 'r2', createdAt: '2026-04-05T08:00:00.000Z', mood: 1 }),
      createReview({ id: 'r3', createdAt: '2026-04-04T08:00:00.000Z', mood: 2 }),
    ]);

    assert.match(summary.nextBody, /短いテンプレート/);
  });

  it('uses state-tag guidance before template/streak hints when mood is not low', (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-06T09:00:00.000Z') });

    const summary = buildInsightSummary([
      createReview({
        id: 'r1',
        createdAt: '2026-04-06T08:00:00.000Z',
        mood: 4,
        templateName: 'YWT',
        stateTagIds: ['疲れた'],
      }),
      createReview({
        id: 'r2',
        createdAt: '2026-04-05T08:00:00.000Z',
        mood: 4,
        templateName: 'YWT',
        stateTagIds: ['疲れた'],
      }),
    ]);

    assert.match(summary.nextBody, /状態タグが偏っているなら/);
  });
});
