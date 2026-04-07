import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
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
  CATEGORY_FILTER_OPTIONS,
  getMoodOption,
  type CategoryFilterOption,
} from '../../data/reviewOptions';
import {
  deleteReview,
  getReviews,
  getTagCatalog,
  toggleFavoriteReview,
  type ReviewItem,
} from '../../lib/storage';
import { useAppTheme } from '../../lib/theme-context';
import { createCardShadow } from '../../lib/theme';

export default function HistoryScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilterOption>('すべて');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [tagLabelMap, setTagLabelMap] = useState<Map<string, string>>(new Map());
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const loadReviews = useCallback(async () => {
    const [nextReviews, catalog] = await Promise.all([getReviews(), getTagCatalog()]);
    setReviews(nextReviews);
    setTagLabelMap(
      new Map([...catalog.action, ...catalog.state].map((tag) => [tag.id, tag.label]))
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [loadReviews])
  );

  const filteredReviews = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return reviews.filter((review) => {
      const categoryMatch =
        selectedCategory === 'すべて' || review.category === selectedCategory;
      const favoriteMatch = !favoritesOnly || review.isFavorite;

      const tagLabels = [...review.actionTagIds, ...review.stateTagIds]
        .map((id) => tagLabelMap.get(id) ?? '')
        .join(' ');
      const body = Object.values(review.answers ?? {}).join(' ');
      const searchPool = `${review.templateName} ${review.category} ${tagLabels} ${body}`.toLowerCase();
      const keywordMatch = !keyword || searchPool.includes(keyword);

      return categoryMatch && favoriteMatch && keywordMatch;
    });
  }, [favoritesOnly, reviews, searchText, selectedCategory, tagLabelMap]);

  return (
    <SwipeTabPage tabKey="history">
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader
          title="履歴"
          subtitle="書いた記録を、あとから静かに見返せます。"
          onOpenMenu={() => setIsMenuVisible(true)}
        />

        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={theme.colors.textSoft} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="キーワードで探す"
              placeholderTextColor={theme.colors.textSoft}
            />
          </View>

          <View style={styles.filterRow}>
            {CATEGORY_FILTER_OPTIONS.map((option) => {
              const active = option === selectedCategory;
              return (
                <Pressable
                  key={option}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(option)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
              お気に入りだけ表示
            </Text>
          </Pressable>
        </View>

        <Text style={styles.resultText}>{filteredReviews.length}件の記録</Text>

        {filteredReviews.length === 0 ? (
          <View testID="history-empty-state" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>表示できる記録がありません</Text>
            <Text style={styles.emptyText}>
              条件をゆるめるか、新しい記録を追加してみてください。
            </Text>
          </View>
        ) : (
          filteredReviews.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              tagLabelMap={tagLabelMap}
              onRefresh={loadReviews}
            />
          ))
        )}
      </ScrollView>

      <SideMenu visible={isMenuVisible} onClose={() => setIsMenuVisible(false)} />
    </SwipeTabPage>
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
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const mood = item.mood ? getMoodOption(item.mood) : null;
  const preview = Object.values(item.answers ?? {}).find((value) => value.trim());
  const tags = [...item.actionTagIds, ...item.stateTagIds]
    .map((id) => tagLabelMap.get(id))
    .filter(Boolean)
    .slice(0, 4) as string[];

  const handleDelete = () => {
    Alert.alert('この記録を削除しますか？', '削除すると元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: () => {
          void deleteReview(item.id).then(onRefresh);
        },
      },
    ]);
  };

  return (
    <View style={styles.historyCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.flexFill}>
          <Text style={styles.historyTitle}>{item.templateName}</Text>
          <Text style={styles.historyMeta}>
            {new Date(item.createdAt).toLocaleString('ja-JP')}
            {mood ? ` ・ ${mood.emoji} ${mood.label}` : ''}
          </Text>
        </View>

        <Pressable
          style={styles.iconButton}
          onPress={() => {
            void toggleFavoriteReview(item.id).then(onRefresh);
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
        <MetaChip label={item.category} />
        {tags.map((tag) => (
          <MetaChip key={`${item.id}-${tag}`} label={tag} muted />
        ))}
      </View>

      <Text style={styles.previewText}>
        {preview?.trim() || '本文はまだ入力されていません。'}
      </Text>

      <View style={styles.cardActions}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            router.push({
              pathname: '/entry',
              params: { reviewId: item.id },
            })
          }
        >
          <Text style={styles.secondaryButtonText}>編集する</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>削除</Text>
        </Pressable>
      </View>
    </View>
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

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
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
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    filterChip: {
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
    resultText: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: theme.spacing.md,
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
    historyCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
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
  });
}
