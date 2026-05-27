import { getContinuityMessage, getWeeklySummaryLabels } from '../lib/weeklySummaryCopy';

describe('weeklySummaryCopy', () => {
  it('returns zero-record guidance in Japanese', () => {
    expect(getContinuityMessage('ja', 0)).toContain('今週はまだ記録がありません');
  });

  it('returns sparse-week guidance in Japanese', () => {
    expect(getContinuityMessage('ja', 2)).toContain('今週は2件記録できました');
  });

  it('returns steady-week guidance in Japanese', () => {
    expect(getContinuityMessage('ja', 3)).toContain('今週は3件記録できました');
  });

  it('keeps the weekly summary labels available in English', () => {
    const labels = getWeeklySummaryLabels('en');
    expect(labels.cardTitle).toBe('Weekly AI Summary');
    expect(labels.headline).toBe('One-line summary');
  });
});
