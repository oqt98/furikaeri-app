import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppHeader from '../../components/AppHeader';
import SideMenu from '../../components/SideMenu';
import SwipeTabPage from '../../components/SwipeTabPage';
import {
  MOOD_OPTIONS,
  getMoodOption,
  type MoodValue,
} from '../../data/reviewOptions';
import { reviewRepository } from '../../lib/reviewRepository';
import { tagRepository } from '../../lib/tagRepository';
import type { ReviewItem } from '../../lib/storage';
import { createCardShadow } from '../../lib/theme';
import { useAppTheme } from '../../lib/theme-context';

type PeriodFilter = 'all' | 'thisWeek' | 'thisMonth' | 'month';
type SortOrder = 'desc' | 'asc';
const INITIAL_VISIBLE_COUNT = 5;

const deleteReview = reviewRepository.remove;
const toggleFavoriteReview = reviewRepository.toggleFavorite;

export default function HistoryScreen() {
  const { theme, t, locale } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodValue | 'all'>('all');
  const [selectedActionTagId, setSelectedActionTagId] = useState('all');
  const [selectedStateTagId, setSelectedStateTagId] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [tagLabelMap, setTagLabelMap] = useState<Map<string, string>>(new Map());
  const [actionTags, setActionTags] = useState<{ id: string; label: string }[]>([]);
  const [stateTags, setStateTags] = useState<{ id: string; label: string }[]>([]);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [nextReviews, catalog] = await Promise.all([
        reviewRepository.list(),
        tagRepository.getCatalog(),
      ]);

      setReviews(nextReviews);
      setActionTags(
        catalog.action
          .filter((tag) => !tag.isArchived)
          .map((tag) => ({ id: tag.id, label: tag.label }))
      );
      setStateTags(
        catalog.state
          .filter((tag) => !tag.isArchived)
          .map((tag) => ({ id: tag.id, label: tag.label }))
      );
      setTagLabelMap(
        new Map(
          [...catalog.action, ...catalog.state].map((tag) => [tag.id, tag.label])
        )
      );
    } catch (error) {
      console.error('history load error:', error);
      setLoadError(t('history.loadErrorBody'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [loadReviews])
  );

  useEffect(() => {
    setShowAllResults(false);
  }, [
    favoritesOnly,
    periodFilter,
    searchText,
    selectedActionTagId,
    selectedMood,
    selectedMonth,
    selectedStateTagId,
    sortOrder,
  ]);

  const filteredReviews = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return reviews.filter((review) => {
      const moodMatch = selectedMood === 'all' || review.mood === selectedMood;
      const favoriteMatch = !favoritesOnly || review.isFavorite;
      const actionTagMatch =
        selectedActionTagId === 'all' || review.actionTagIds.includes(selectedActionTagId);
      const stateTagMatch =
        selectedStateTagId === 'all' || review.stateTagIds.includes(selectedStateTagId);
      const periodMatch = matchesPeriodFilter(review.createdAt, periodFilter, selectedMonth);
      const tagLabels = [...review.actionTagIds, ...review.stateTagIds]
        .map((id) => tagLabelMap.get(id) ?? '')
        .join(' ');
      const body = Object.values(review.answers ?? {}).join(' ');
      const searchPool = `${review.templateName} ${tagLabels} ${body}`.toLowerCase();
      const keywordMatch = !keyword || searchPool.includes(keyword);

      return (
        moodMatch &&
        favoriteMatch &&
        actionTagMatch &&
        stateTagMatch &&
        periodMatch &&
        keywordMatch
      );
    });
  }, [
    favoritesOnly,
    periodFilter,
    reviews,
    searchText,
    selectedActionTagId,
    selectedMood,
    selectedMonth,
    selectedStateTagId,
    tagLabelMap,
  ]);

  const sortedReviews = useMemo(
    () =>
      [...filteredReviews].sort((a, b) =>
        sortOrder === 'desc'
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [filteredReviews, sortOrder]
  );

  const visibleReviews = useMemo(
    () => (showAllResults ? sortedReviews : sortedReviews.slice(0, INITIAL_VISIBLE_COUNT)),
    [showAllResults, sortedReviews]
  );
  const hasHiddenResults = sortedReviews.length > visibleReviews.length;

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];

    if (periodFilter === 'thisWeek') labels.push(t('history.thisWeek'));
    if (periodFilter === 'thisMonth') labels.push(t('history.thisMonth'));
    if (periodFilter === 'month') labels.push(selectedMonth);

    if (selectedMood !== 'all') {
      const mood = getMoodOption(selectedMood);
      labels.push(`${mood.emoji} ${mood.label}`);
    }

    if (selectedActionTagId !== 'all') {
      labels.push(tagLabelMap.get(selectedActionTagId) ?? t('history.actionTags'));
    }

    if (selectedStateTagId !== 'all') {
      labels.push(tagLabelMap.get(selectedStateTagId) ?? t('history.stateTags'));
    }

    if (favoritesOnly) {
      labels.push(t('history.favoriteOnly'));
    }

    return labels;
  }, [
    favoritesOnly,
    periodFilter,
    selectedActionTagId,
    selectedMonth,
    selectedMood,
    selectedStateTagId,
    t,
    tagLabelMap,
  ]);

  return (
    <SwipeTabPage tabKey="history">
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader
          title={t('history.title')}
          subtitle={t('history.subtitle')}
          onOpenMenu={() => setIsMenuVisible(true)}
        />

        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={theme.colors.textSoft} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder={t('history.searchPlaceholder')}
              placeholderTextColor={theme.colors.textSoft}
            />
          </View>
          <View style={styles.toolbarRow}>
            <Pressable style={styles.toolbarButton} onPress={() => setIsFilterOpen(true)}>
              <Ionicons name="options-outline" size={16} color={theme.colors.primaryDark} />
              <Text style={styles.toolbarButtonText}>{t('common.filter')}</Text>
            </Pressable>
            <Pressable style={styles.toolbarButton} onPress={() => setIsSortOpen(true)}>
              <Ionicons
                name="swap-vertical-outline"
                size={16}
                color={theme.colors.primaryDark}
              />
              <Text style={styles.toolbarButtonText}>{t('common.sort')}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.resultText}>
          {t('history.results', { count: sortedReviews.length })}
        </Text>

        {activeFilterLabels.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersRow}
          >
            {activeFilterLabels.map((label) => (
              <View key={label} style={styles.activeFilterChip}>
                <Text style={styles.activeFilterChipText}>{label}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {loadError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('history.loadErrorTitle')}</Text>
            <Text style={styles.emptyText}>{loadError}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadReviews()}>
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('history.loadingTitle')}</Text>
            <Text style={styles.emptyText}>{t('history.loadingBody')}</Text>
          </View>
        ) : sortedReviews.length === 0 ? (
          <View testID="history-empty-state" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('history.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('history.emptyBody')}</Text>
          </View>
        ) : (
          visibleReviews.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              tagLabelMap={tagLabelMap}
              onRefresh={loadReviews}
            />
          ))
        )}

        {!loadError && !isLoading && sortedReviews.length > INITIAL_VISIBLE_COUNT ? (
          <View style={styles.loadMoreWrap}>
            <Pressable
              style={styles.loadMoreButton}
              onPress={() => setShowAllResults((value) => !value)}
            >
              <Text style={styles.loadMoreButtonText}>
                {showAllResults
                  ? locale === 'en'
                    ? 'Show recent only'
                    : '直近だけ表示'
                  : locale === 'en'
                    ? `Show all (${sortedReviews.length})`
                    : `すべて表示 (${sortedReviews.length})`}
              </Text>
            </Pressable>
            {hasHiddenResults ? (
              <Text style={styles.loadMoreHint}>
                {locale === 'en'
                  ? `Showing the latest ${visibleReviews.length} items`
                  : `直迁E${visibleReviews.length} 件を表示中`}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <SelectionModal
        visible={isFilterOpen}
        title={t('history.filterTitle')}
        onClose={() => setIsFilterOpen(false)}
      >
        <FilterSection title={t('history.period')} styles={styles}>
          <View style={styles.filterRow}>
            <FilterChip
              label={t('common.all')}
              active={periodFilter === 'all'}
              onPress={() => setPeriodFilter('all')}
            />
            <FilterChip
              label={t('history.thisWeek')}
              active={periodFilter === 'thisWeek'}
              onPress={() => setPeriodFilter('thisWeek')}
            />
            <FilterChip
              label={t('history.thisMonth')}
              active={periodFilter === 'thisMonth'}
              onPress={() => setPeriodFilter('thisMonth')}
            />
            <FilterChip
              label={t('history.byMonth')}
              active={periodFilter === 'month'}
              onPress={() => setPeriodFilter('month')}
            />
          </View>
          {periodFilter === 'month' ? (
            <View style={styles.filterRow}>
              {getAvailableMonthKeys(reviews).map((monthKey) => (
                <FilterChip
                  key={monthKey}
                  label={formatMonthLabel(monthKey, locale)}
                  active={selectedMonth === monthKey}
                  onPress={() => setSelectedMonth(monthKey)}
                />
              ))}
            </View>
          ) : null}
        </FilterSection>

        <FilterSection title={t('history.mood')} styles={styles}>
          <View style={styles.filterRow}>
            <FilterChip
              label={t('common.all')}
              active={selectedMood === 'all'}
              onPress={() => setSelectedMood('all')}
            />
            {MOOD_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={`${option.emoji} ${option.label}`}
                active={selectedMood === option.value}
                onPress={() => setSelectedMood(option.value)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title={t('history.actionTags')} styles={styles}>
          <View style={styles.filterRow}>
            <FilterChip
              label={t('common.all')}
              active={selectedActionTagId === 'all'}
              onPress={() => setSelectedActionTagId('all')}
            />
            {actionTags.map((tag) => (
              <FilterChip
                key={tag.id}
                label={tag.label}
                active={selectedActionTagId === tag.id}
                onPress={() => setSelectedActionTagId(tag.id)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title={t('history.stateTags')} styles={styles}>
          <View style={styles.filterRow}>
            <FilterChip
              label={t('common.all')}
              active={selectedStateTagId === 'all'}
              onPress={() => setSelectedStateTagId('all')}
            />
            {stateTags.map((tag) => (
              <FilterChip
                key={tag.id}
                label={tag.label}
                active={selectedStateTagId === tag.id}
                onPress={() => setSelectedStateTagId(tag.id)}
              />
            ))}
          </View>
        </FilterSection>

        <Pressable
          style={[styles.favoriteToggle, favoritesOnly && styles.favoriteToggleActive]}
          onPress={() => setFavoritesOnly((value) => !value)}
        >
          <Ionicons
            name={favoritesOnly ? 'heart' : 'heart-outline'}
            size={16}
            color={favoritesOnly ? theme.colors.white : theme.colors.danger}
          />
          <Text
            style={[
              styles.favoriteToggleText,
              favoritesOnly && styles.favoriteToggleTextActive,
            ]}
          >
            {t('history.favoriteOnly')}
          </Text>
        </Pressable>
      </SelectionModal>

      <SelectionModal
        visible={isSortOpen}
        title={t('history.sortTitle')}
        onClose={() => setIsSortOpen(false)}
      >
        <View style={styles.filterRow}>
          <FilterChip
            label={t('history.newest')}
            active={sortOrder === 'desc'}
            onPress={() => setSortOrder('desc')}
          />
          <FilterChip
            label={t('history.oldest')}
            active={sortOrder === 'asc'}
            onPress={() => setSortOrder('asc')}
          />
        </View>
      </SelectionModal>

      <SideMenu visible={isMenuVisible} onClose={() => setIsMenuVisible(false)} />
    </SwipeTabPage>
  );
}

function SelectionModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentInner}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function HistoryCard({
  item,
  tagLabelMap,
  onRefresh,
}: {
  item: ReviewItem;
  tagLabelMap: Map<string, string>;
  onRefresh: () => Promise<void>;
}) {
  const { theme, t, locale, localeTag } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const mood = item.mood ? getMoodOption(item.mood) : null;
  const preview =
    item.answers.memo?.trim() ||
    Object.values(item.answers ?? {}).find((value) => value.trim());
  const tags = [...item.actionTagIds, ...item.stateTagIds]
    .map((id) => tagLabelMap.get(id))
    .filter(Boolean)
    .slice(0, 2) as string[];

  const handleDelete = () => {
    Alert.alert(t('history.deleteConfirmTitle'), t('history.deleteConfirmBody'), [
      { text: locale === 'en' ? 'Cancel' : 'キャンセル', style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void deleteReview(item.id)
            .then(onRefresh)
            .catch((error) => {
              console.error('history delete error:', error);
              Alert.alert(t('common.delete'), t('history.deleteError'));
            });
        },
      },
    ]);
  };

  return (
    <Pressable
      style={styles.historyCard}
      onPress={() => router.push(`/review/${item.id}` as never)}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.flexFill}>
          <Text style={styles.historyTitle}>{item.templateName}</Text>
          <Text style={styles.historyMeta}>
            {new Date(item.createdAt).toLocaleString(localeTag)}
            {mood ? ` ・ ${mood.emoji} ${mood.label}` : ''}
          </Text>
        </View>
        <Pressable
          style={styles.iconButton}
          onPress={() => {
            void toggleFavoriteReview(item.id)
              .then(onRefresh)
              .catch((error) => {
                console.error('history favorite error:', error);
                Alert.alert(t('history.updateErrorTitle'), t('history.updateError'));
              });
          }}
        >
          <Ionicons
            name={item.isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={theme.colors.danger}
          />
        </Pressable>
      </View>

      <View style={styles.metaChips}>
        {tags.map((label, index) => (
          <MetaChip key={`${item.id}-${label}-${index}`} label={label} muted={index > 0} />
        ))}
      </View>

      <Text numberOfLines={2} style={styles.previewText}>
        {preview?.trim() || t('history.noInput')}
      </Text>

      <View style={styles.cardActions}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push({ pathname: '/entry', params: { reviewId: item.id } })}
        >
          <Text style={styles.secondaryButtonText}>{t('common.edit')}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push(`/review/${item.id}` as never)}
        >
          <Text style={styles.secondaryButtonText}>{t('history.details')}</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function FilterSection({
  title,
  children,
  styles,
}: {
  title: string;
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View>
      <Text style={styles.filterTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MetaChip({ label, muted }: { label: string; muted?: boolean }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.metaChip, muted && styles.metaChipMuted]}>
      <Text style={styles.metaChipText}>{label}</Text>
    </View>
  );
}

function matchesPeriodFilter(createdAt: string, period: PeriodFilter, selectedMonth: string) {
  if (period === 'all') return true;

  const date = new Date(createdAt);
  const now = new Date();

  if (period === 'thisMonth') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  if (period === 'thisWeek') {
    const { start, end } = getWeekRange(now);
    return date >= start && date <= end;
  }

  if (!/^\d{4}-\d{2}$/.test(selectedMonth)) return true;

  const [year, month] = selectedMonth.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() === month - 1;
}

function getWeekRange(baseDate: Date) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

function getAvailableMonthKeys(reviews: ReviewItem[]) {
  const keys = Array.from(
    new Set(
      reviews.map((item) => {
        const date = new Date(item.createdAt);
        return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
      })
    )
  );

  return keys.sort((a, b) => b.localeCompare(a));
}

function formatMonthLabel(monthKey: string, locale: 'ja' | 'en') {
  const [year, month] = monthKey.split('-').map(Number);
  if (locale === 'en') {
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  }

  return `${year}年${month}月`;
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
      paddingBottom: 120,
    },
    searchCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.md,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
    },
    searchInput: {
      flex: 1,
      height: 48,
      color: theme.colors.text,
      fontSize: 15,
    },
    toolbarRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    toolbarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    toolbarButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    resultText: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: theme.spacing.sm,
    },
    activeFiltersRow: {
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    activeFilterChip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    activeFilterChipText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    loadMoreWrap: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    loadMoreButton: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
    },
    loadMoreButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    loadMoreHint: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
    },
    emptyCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xxl,
    },
    emptyTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    emptyText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    retryButton: {
      alignSelf: 'flex-start',
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
    },
    retryButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    filterTitle: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: theme.spacing.sm,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    filterChip: {
      maxWidth: '100%',
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterChipText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    filterChipTextActive: {
      color: theme.colors.white,
    },
    monthInput: {
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      color: theme.colors.text,
      fontSize: 15,
    },
    favoriteToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.dangerSoft,
      paddingVertical: 12,
    },
    favoriteToggleActive: {
      backgroundColor: theme.colors.danger,
    },
    favoriteToggleText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
    favoriteToggleTextActive: {
      color: theme.colors.white,
    },
    historyCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    flexFill: {
      flex: 1,
    },
    historyTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: 4,
    },
    historyMeta: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metaChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    metaChip: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    metaChipMuted: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    metaChipText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    previewText: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
      lineHeight: 22,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: theme.spacing.sm,
    },
    secondaryButton: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
    },
    secondaryButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    deleteButton: {
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
    },
    deleteButtonText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.28)',
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    modalCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
    },
    modalContent: {
      maxHeight: 420,
    },
    modalContentInner: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
    },
  });
}
