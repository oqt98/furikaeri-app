import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import asyncStorage from '../async-storage-mock.cjs';
import { saveReview } from '../../lib/storage';
import { CATEGORIES } from '../../data/reviewOptions';
import { templates } from '../../data/templates';

function createReview(overrides: Partial<Parameters<typeof saveReview>[0]> = {}) {
  return {
    id: 'review-1',
    createdAt: '2026-04-06T08:00:00.000Z',
    updatedAt: '2026-04-06T08:00:00.000Z',
    category: CATEGORIES[0],
    mood: 4 as const,
    templateId: templates[0].id,
    templateName: templates[0].name,
    actionTagIds: [],
    stateTagIds: [],
    answers: { memo: 'テストメモ' },
    photos: [],
    isFavorite: false,
    ...overrides,
  };
}

beforeEach(async () => {
  await asyncStorage.clear();
});

describe('app smoke', () => {
  it('renders the home screen', async () => {
    renderRouter('./app', { initialUrl: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('screen-home')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('home-start-review-button')).toBeOnTheScreen();
  });

  it('shows the history empty state when there are no reviews', async () => {
    renderRouter('./app', { initialUrl: '/history' });

    await waitFor(() => {
      expect(screen.getByTestId('history-empty-state')).toBeOnTheScreen();
    });
  });

  it('renders the calendar screen with the create action', async () => {
    await saveReview(createReview());
    renderRouter('./app', { initialUrl: '/calendar' });

    await waitFor(() => {
      expect(screen.getByTestId('screen-calendar')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('calendar-create-button')).toBeOnTheScreen();
  });

  it('shows the analytics empty state when there is no data', async () => {
    renderRouter('./app', { initialUrl: '/analytics' });

    await waitFor(() => {
      expect(screen.getByTestId('analytics-empty-state')).toBeOnTheScreen();
    });
  });

  it('renders the settings screen and import entrypoint', async () => {
    renderRouter('./app', { initialUrl: '/settings' });

    await waitFor(() => {
      expect(screen.getByTestId('screen-settings')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('settings-import-button')).toBeOnTheScreen();
  });

  it('navigates between tabs without breaking routing', async () => {
    const result = renderRouter('./app', { initialUrl: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('screen-home')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('tab-calendar'));

    await waitFor(() => {
      expect(screen.getByTestId('screen-calendar')).toBeOnTheScreen();
    });
    expect(result.getPathname()).toBe('/calendar');
  });
});
