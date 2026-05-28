import { buildInsightSummary } from '../lib/insights';
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
    actionTagIds: [],
    stateTagIds: [],
    answers: { memo: 'メモ' },
    photos: [],
    isFavorite: false,
    ...overrides,
  };
}

describe('lib/insights', () => {
  it('returns the empty-state summary when there are no reviews', () => {
    const summary = buildInsightSummary([]);

    expect(summary.weeklyStats[0].value).toBe('0件');
    expect(summary.weeklyStats[1].value).toBe('0日');
    expect(summary.nextBody).toContain('テンプレート');
  });

  it('summarizes only the last 7 days and prefers the top action tag over templates', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-06T09:00:00.000Z'));

    const summary = buildInsightSummary([
      createReview({
        id: 'r1',
        createdAt: '2026-04-06T08:00:00.000Z',
        mood: 4,
        templateName: 'KPT',
        actionTagIds: ['action-reading'],
      }),
      createReview({
        id: 'r2',
        createdAt: '2026-04-05T08:00:00.000Z',
        mood: 4,
        templateName: 'KPT',
        actionTagIds: ['action-reading'],
      }),
      createReview({
        id: 'r3',
        createdAt: '2026-04-04T08:00:00.000Z',
        mood: 3,
        templateName: templates[0].name,
        actionTagIds: ['action-rest'],
      }),
      createReview({
        id: 'r4',
        createdAt: '2026-03-25T08:00:00.000Z',
        mood: 5,
        templateName: '別レビュー',
        actionTagIds: ['action-reading'],
      }),
    ], {
      tagLabelMap: new Map([
        ['action-reading', '読書'],
        ['action-rest', '休息'],
      ]),
    });

    expect(summary.weeklyBody).toContain('3件の記録');
    expect(summary.weeklyBody).toContain('連続 3日');
    expect(summary.weeklyBody).toContain('読書');
    expect(summary.weeklyBody.includes('KPT')).toBe(false);

    jest.useRealTimers();
  });

  it('omits the frequent item sentence when action tags cannot be resolved', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-06T09:00:00.000Z'));

    const summary = buildInsightSummary([
      createReview({
        id: 'r1',
        createdAt: '2026-04-06T08:00:00.000Z',
        mood: 5,
        templateName: 'KPT',
      }),
    ]);

    expect(summary.weeklyBody.includes('KPT')).toBe(false);
    expect(summary.weeklyBody.includes('よく使っている')).toBe(false);

    jest.useRealTimers();
  });

  it('prefers the low-mood hint when low moods dominate recent reviews', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-06T09:00:00.000Z'));

    const summary = buildInsightSummary([
      createReview({ id: 'r1', createdAt: '2026-04-06T08:00:00.000Z', mood: 1 }),
      createReview({ id: 'r2', createdAt: '2026-04-05T08:00:00.000Z', mood: 1 }),
      createReview({ id: 'r3', createdAt: '2026-04-04T08:00:00.000Z', mood: 2 }),
    ]);

    expect(summary.nextBody).toContain('テンプレート');

    jest.useRealTimers();
  });

  it('uses state-tag guidance before template hints when mood is not low', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-06T09:00:00.000Z'));

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

    expect(summary.nextBody).toContain('状態タグ');

    jest.useRealTimers();
  });
});
