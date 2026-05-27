import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import asyncStorage from '../async-storage-mock.cjs';
import { CATEGORIES } from '../../data/reviewOptions';
import { templates } from '../../data/templates';
import { saveReview } from '../../lib/storage';

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
    answers: { title: 'テストメモ' },
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

  it('shows the analytics empty state when there is no data', async () => {
    renderRouter('./app', { initialUrl: '/analytics' });

    await waitFor(() => {
      expect(screen.getByTestId('analytics-empty-state')).toBeOnTheScreen();
    });
  });

  it('renders the settings screen and reminder controls', async () => {
    renderRouter('./app', { initialUrl: '/settings' });

    await waitFor(() => {
      expect(screen.getByText('毎日のリマインダー')).toBeOnTheScreen();
    });
    expect(screen.queryByText(/CSV Import|Notion CSV Import/)).toBeNull();
  });

  it('opens the side menu and navigates to the important days screen', async () => {
    const result = renderRouter('./app', { initialUrl: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('screen-home')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('app-header-menu-button'));
    fireEvent.press(screen.getByTestId('side-menu-menu.importantDays'));

    await waitFor(() => {
      expect(result.getPathname()).toBe('/important-days');
    });
  });

  it('opens the side menu and navigates to onboarding', async () => {
    const result = renderRouter('./app', { initialUrl: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('screen-home')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('app-header-menu-button'));
    fireEvent.press(screen.getByTestId('side-menu-menu.onboarding'));

    await waitFor(() => {
      expect(result.getPathname()).toBe('/onboarding');
    });
  });

  it('navigates between main tabs without breaking routing', async () => {
    const result = renderRouter('./app', { initialUrl: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('screen-home')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('tab-history'));

    await waitFor(() => {
      expect(result.getPathname()).toBe('/history');
    });

    fireEvent.press(screen.getByTestId('tab-calendar'));

    await waitFor(() => {
      expect(result.getPathname()).toBe('/calendar');
    });

    fireEvent.press(screen.getByTestId('tab-analytics'));

    await waitFor(() => {
      expect(result.getPathname()).toBe('/analytics');
    });
  });

  it('renders templates after starting a new record', async () => {
    renderRouter('./app', { initialUrl: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('screen-home')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('home-start-review-button'));

    await waitFor(() => {
      expect(screen.getByText('テンプレートを選ぶ')).toBeOnTheScreen();
    });
  });

  it('opens today’s existing record from home when today already has a review', async () => {
    const today = new Date().toISOString();
    await saveReview(createReview({ createdAt: today, updatedAt: today }));
    const result = renderRouter('./app', { initialUrl: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('screen-home')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('home-start-review-button'));

    await waitFor(() => {
      expect(result.getPathname()).toBe('/entry');
    });
  });

  it('shows a recent record in history when data exists', async () => {
    await saveReview(createReview());
    renderRouter('./app', { initialUrl: '/history' });

    await waitFor(() => {
      expect(screen.getByText(templates[0].name)).toBeOnTheScreen();
    });
  });
});
