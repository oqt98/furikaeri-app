import {
  formatImportantDayCountdown,
  getImportantDaysForDateKey,
  getNextOccurrenceDate,
  normalizeImportantDay,
} from '../lib/importantDays';

describe('important days', () => {
  it('treats legacy important days as annual recurring items', () => {
    const item = normalizeImportantDay({
      id: 'important-day-1',
      name: '記念日',
      date: '2020-04-07',
      type: '記念日',
      createdAt: '2020-04-07T00:00:00.000Z',
      updatedAt: '2020-04-07T00:00:00.000Z',
    });

    expect(item.isRecurringAnnual).toBe(true);
  });

  it('matches annual recurring important days by month and day', () => {
    const items = [
      normalizeImportantDay({
        id: 'birthday',
        name: '誕生日',
        date: '1990-08-15',
        type: '誕生日',
        createdAt: '1990-08-15T00:00:00.000Z',
        updatedAt: '1990-08-15T00:00:00.000Z',
      }),
    ];

    expect(getImportantDaysForDateKey('2026-08-15', items).map((item) => item.id)).toEqual([
      'birthday',
    ]);
    expect(getImportantDaysForDateKey('2026-08-14', items)).toEqual([]);
  });

  it('formats countdowns from the next annual occurrence', () => {
    const nextOccurrence = getNextOccurrenceDate('1990-12-31', true);
    expect(nextOccurrence.getMonth()).toBe(11);
    expect(nextOccurrence.getDate()).toBe(31);
    const countdown = formatImportantDayCountdown('1990-12-31', true);
    expect(countdown === '今日です' || countdown.startsWith('あと')).toBe(true);
  });
});
