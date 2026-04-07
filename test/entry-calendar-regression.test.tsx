import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import asyncStorage from './async-storage-mock.cjs';
import {
  createCalendarStyles,
} from '../app/(tabs)/calendar';
import {
  getAnswersForSave,
  getVisibleTemplateFields,
  shouldShowMemoField,
} from '../app/(tabs)/entry';
import { getTheme } from '../lib/theme';

beforeEach(async () => {
  await asyncStorage.clear();
});

describe('entry and calendar regressions', () => {
  it('shows the memo field only for the memo template', () => {
    expect(shouldShowMemoField('memo')).toBe(true);
    expect(shouldShowMemoField('kpt')).toBe(false);
    expect(getVisibleTemplateFields('memo')).toHaveLength(0);
    expect(getVisibleTemplateFields('kpt').map((field) => field.key)).toEqual([
      'keep',
      'problem',
      'try',
    ]);
    expect(
      getAnswersForSave(
        { memo: 'hidden', keep: 'keep', problem: 'problem', title: 'title' },
        'kpt'
      )
    ).toEqual({
      keep: 'keep',
      problem: 'problem',
    });
  });

  it('does not render the memo field after selecting a non-memo template', async () => {
    renderRouter('./app', { initialUrl: '/entry?templateId=kpt' });

    await waitFor(() => {
      expect(screen.getByText('KPT')).toBeOnTheScreen();
    });

    expect(screen.queryByText('ひとことメモ')).toBeNull();
  });

  it('uses theme-specific calendar styles', () => {
    const lightStyles = createCalendarStyles(getTheme('light'));
    const navyStyles = createCalendarStyles(getTheme('navy'));

    expect(lightStyles.container.backgroundColor).toBe(getTheme('light').colors.background);
    expect(navyStyles.container.backgroundColor).toBe(getTheme('navy').colors.background);
    expect(lightStyles.container.backgroundColor === navyStyles.container.backgroundColor).toBe(
      false
    );
  });

  it('shows recurring important days on the calendar for the selected date', async () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;

    await asyncStorage.setItem(
      'furikaeri-important-days',
      JSON.stringify([
        {
          id: 'birthday',
          name: '誕生日',
          date: `1990-${todayKey.slice(5)}`,
          type: '誕生日',
          createdAt: '1990-04-07T00:00:00.000Z',
          updatedAt: '1990-04-07T00:00:00.000Z',
          isRecurringAnnual: true,
        },
      ])
    );

    renderRouter('./app', { initialUrl: '/calendar' });

    await waitFor(() => {
      expect(
        screen.getByTestId(`calendar-important-day-marker-${todayKey}`)
      ).toBeOnTheScreen();
    });

    expect(screen.getByTestId('selected-important-day-birthday')).toBeOnTheScreen();
  });
});
