import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import asyncStorage from '../async-storage-mock.cjs';
import SettingsImportSection from '../../components/SettingsImportSection';
import { getReviews, saveReview } from '../../lib/storage';
import { CATEGORIES } from '../../data/reviewOptions';
import { templates } from '../../data/templates';

const validCsv = [
  'date,template,category,mood,title,memo,action_tags,state_tags,favorite',
  `2026-04-05,${templates[0].id},${CATEGORIES[0]},4,朝の記録,よく進んだ,集中,落ち着き,true`,
].join('\n');

const duplicateCsv = [
  'date,template,category,mood,title,memo',
  `2026-04-06,${templates[0].id},${CATEGORIES[0]},3,重複,同日です`,
].join('\n');

const invalidCsv = [
  'date,template,category,mood,title,memo',
  `bad-date,${templates[0].id},${CATEGORIES[0]},4,不正,日付不正`,
].join('\n');

beforeEach(async () => {
  await asyncStorage.clear();
});

describe('SettingsImportSection', () => {
  it('imports a valid CSV and reflects the review count', async () => {
    render(<SettingsImportSection pickCsvText={jest.fn().mockResolvedValue(validCsv)} />);

    fireEvent.press(screen.getByTestId('settings-import-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-import-result')).toHaveTextContent(
        '1 件を取り込みました。'
      );
    });

    const reviews = await getReviews();
    expect(reviews).toHaveLength(1);
    expect(reviews[0].answers).toMatchObject({ title: '朝の記録', memo: 'よく進んだ' });
  });

  it('skips duplicate dates while keeping the existing review', async () => {
    await saveReview({
      id: 'existing-1',
      createdAt: '2026-04-06T09:00:00.000Z',
      updatedAt: '2026-04-06T09:00:00.000Z',
      category: CATEGORIES[0],
      mood: 3,
      templateId: templates[0].id,
      templateName: templates[0].name,
      actionTagIds: [],
      stateTagIds: [],
      answers: { memo: '既存レビュー' },
      photos: [],
      isFavorite: false,
    });

    render(<SettingsImportSection pickCsvText={jest.fn().mockResolvedValue(duplicateCsv)} />);

    fireEvent.press(screen.getByTestId('settings-import-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-import-result')).toHaveTextContent(
        '1 件はスキップされました。'
      );
    });

    const reviews = await getReviews();
    expect(reviews).toHaveLength(1);
    expect(reviews[0].id).toBe('existing-1');
  });

  it('shows an error result for invalid CSV data', async () => {
    render(<SettingsImportSection pickCsvText={jest.fn().mockResolvedValue(invalidCsv)} />);

    fireEvent.press(screen.getByTestId('settings-import-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-import-result')).toHaveTextContent(
        'CSV を取り込めませんでした'
      );
    });
  });

  it('handles file-pick cancellation without showing a result', async () => {
    render(
      <SettingsImportSection
        pickCsvText={jest.fn().mockRejectedValue(new Error('User cancelled picker'))}
      />
    );

    fireEvent.press(screen.getByTestId('settings-import-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('settings-import-result')).toBeNull();
    });
  });
});
