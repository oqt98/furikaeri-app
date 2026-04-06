import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import SwipeTabPage from '../../components/SwipeTabPage';
import {
  CATEGORY_FILTER_OPTIONS,
  getMoodOption,
  type CategoryFilterOption,
} from '../../data/reviewOptions';
import { templates } from '../../data/templates';
import {
  deleteReview,
  getReviews,
  getTagCatalog,
  toggleFavoriteReview,
  type ReviewItem,
} from '../../lib/storage';
import { cardShadow, theme } from '../../lib/theme';

export default function HistoryScreen() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilterOption>('すべて');
  const [selectedTemplate, setSelectedTemplate] = useState('すべて');
  const [searchText, setSearchText] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);
  const [tagLabelMap, setTagLabelMap] = useState<Map<string, string>>(new Map());

  const templateOptions = useMemo(
    () => ['すべて', ...templates.map((template) => template.name)],
    []
  );

  const loadReviews = async () => {
    const [data, tagCatalog] = await Promise.all([getReviews(), getTagCatalog()]);
    setTagLabelMap(
      new Map(
        [...tagCatalog.action, ...tagCatalog.state].map((tag) => [tag.id, tag.label])
      )
    );

    const sorted = [...data].sort((a, b) => {
      const favoriteA = a.isFavorite ? 1 : 0;
      const favoriteB = b.isFavorite ? 1 : 0;
      if (favoriteA !== favoriteB) return favoriteB - favoriteA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setReviews(sorted);
  };

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [])
  );

  const filteredReviews = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return reviews.filter((item) => {
      const categoryMatch =
        selectedCategory === 'すべて' || item.category === selectedCategory;
      const templateMatch =
        selectedTemplate === 'すべて' || item.templateName === selectedTemplate;
      const favoriteMatch = !favoritesOnly || item.isFavorite;

      const labels = [
        ...item.actionTagIds.map((id) => tagLabelMap.get(id) ?? ''),
        ...item.stateTagIds.map((id) => tagLabelMap.get(id) ?? ''),
      ];
      const searchPool = [
        item.templateName,
        item.category,
        item.mood ? getMoodOption(item.mood).label : '',
        ...labels,
        ...item.photos.map((photo) => photo.comment),
        ...Object.values(item.answers ?? {}),
      ]
        .join(' ')
        .toLowerCase();

      const searchMatch = keyword === '' || searchPool.includes(keyword);
      return categoryMatch && templateMatch && favoriteMatch && searchMatch;
    });
  }, [favoritesOnly, reviews, searchText, selectedCategory, selectedTemplate, tagLabelMap]);

  const handleEdit = (item: ReviewItem) => {
    router.push({
      pathname: '/entry',
      params: { reviewId: item.id },
    });
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteReview(id);
      await loadReviews();
    } catch (error) {
      console.error(error);
      Alert.alert('削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleFavorite = async (item: ReviewItem) => {
    try {
      setFavoriteLoadingId(item.id);
      await toggleFavoriteReview(item.id);
      await loadReviews();
    } catch (error) {
      console.error(error);
      Alert.alert('お気に入り更新に失敗しました');
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  return (
    <SwipeTabPage tabKey="history">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>一覧</Text>
        <Text style={styles.subtitle}>
          お気に入りやタグ、キーワードで絞り込みながら見返せます。
        </Text>

        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={theme.colors.textSoft} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="キーワード検索"
              placeholderTextColor={theme.colors.textSoft}
            />
          </View>

          <View style={styles.topActions}>
            <Pressable
              style={[styles.favoriteFilter, favoritesOnly && styles.favoriteFilterActive]}
              onPress={() => setFavoritesOnly((value) => !value)}
            >
              <Ionicons
                name={favoritesOnly ? 'heart' : 'heart-outline'}
                size={16}
                color={favoritesOnly ? theme.colors.white : theme.colors.danger}
              />
              <Text
                style={[
                  styles.favoriteFilterText,
                  favoritesOnly && styles.favoriteFilterTextActive,
                ]}
              >
                お気に入りのみ
              </Text>
            </Pressable>

            <Pressable style={styles.reloadButton} onPress={loadReviews}>
              <Ionicons name="refresh-outline" size={16} color={theme.colors.primaryDark} />
              <Text style={styles.reloadButtonText}>更新</Text>
            </Pressable>
          </View>
        </View>

        <FilterSection
          label="カテゴリ"
          options={CATEGORY_FILTER_OPTIONS as readonly string[]}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <FilterSection
          label="テンプレート"
          options={templateOptions}
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
        />

        <Text style={styles.resultCount}>
          {filteredReviews.length}件 / 全{reviews.length}件
        </Text>

        {reviews.length === 0 ? (
          <EmptyState
            title="まだ記録がありません"
            body="最初の 1 件を作成すると、ここから見返せるようになります。"
          />
        ) : filteredReviews.length === 0 ? (
          <EmptyState
            title="条件に合う記録がありません"
            body="検索条件を少しゆるめると見つかるかもしれません。"
          />
        ) : (
          filteredReviews.map((item) => {
            const previewAnswers = Object.entries(item.answers ?? {})
              .filter(([, value]) => value.trim())
              .slice(0, 2);
            const actionLabels = item.actionTagIds
              .map((id) => tagLabelMap.get(id))
              .filter(Boolean) as string[];
            const stateLabels = item.stateTagIds
              .map((id) => tagLabelMap.get(id))
              .filter(Boolean) as string[];
            const isDeleting = deletingId === item.id;
            const isFavoriteLoading = favoriteLoadingId === item.id;
            const firstPhoto = item.photos[0];
            const mood = item.mood ? getMoodOption(item.mood) : null;

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>{item.templateName}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(item.createdAt).toLocaleString('ja-JP')}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.favoriteButton}
                    onPress={() => handleToggleFavorite(item)}
                    disabled={isFavoriteLoading}
                  >
                    <Ionicons
                      name={item.isFavorite ? 'heart' : 'heart-outline'}
                      size={18}
                      color={theme.colors.danger}
                    />
                  </Pressable>
                </View>

                <View style={styles.metaRow}>
                  <Badge label={item.category} tone="primary" />
                  {mood ? (
                    <Badge label={`${mood.emoji} ${mood.label}`} tone="muted" />
                  ) : null}
                </View>

                {actionLabels.length > 0 ? (
                  <TagGroup label="行動タグ" values={actionLabels} />
                ) : null}
                {stateLabels.length > 0 ? (
                  <TagGroup label="状態タグ" values={stateLabels} />
                ) : null}

                {firstPhoto ? (
                  <Image
                    source={{ uri: firstPhoto.uri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={styles.previewBox}>
                  {previewAnswers.length > 0 ? (
                    previewAnswers.map(([key, value]) => (
                      <View key={key} style={styles.answerBlock}>
                        <Text style={styles.answerKey}>{key}</Text>
                        <Text style={styles.answerValue}>{truncate(value, 56)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyPreviewText}>本文は未入力です。</Text>
                  )}
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.editButton} onPress={() => handleEdit(item)}>
                    <Text style={styles.editButtonText}>編集</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.deleteButton, isDeleting && { opacity: 0.6 }]}
                    onPress={() =>
                      Alert.alert(
                        'この記録を削除しますか？',
                        `${item.templateName} を削除します。`,
                        [
                          { text: 'キャンセル', style: 'cancel' },
                          {
                            text: '削除する',
                            style: 'destructive',
                            onPress: () => {
                              void handleDelete(item.id);
                            },
                          },
                        ]
                      )
                    }
                    disabled={isDeleting}
                  >
                    <Text style={styles.deleteButtonText}>
                      {isDeleting ? '削除中...' : '削除'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SwipeTabPage>
  );
}

function FilterSection({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: any) => void;
}) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {options.map((option) => {
          const active = option === selected;
          return (
            <Pressable
              key={option}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => onSelect(option)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name="trail-sign-outline" size={20} color={theme.colors.primaryDark} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{body}</Text>
    </View>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: 'primary' | 'muted' | 'soft';
}) {
  const badgeStyle =
    tone === 'primary'
      ? styles.badgePrimary
      : tone === 'muted'
        ? styles.badgeMuted
        : styles.badgeSoft;

  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function TagGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <View style={styles.tagGroup}>
      <Text style={styles.tagGroupLabel}>{label}</Text>
      <View style={styles.tagsRow}>
        {values.map((tag) => (
          <Badge key={`${label}-${tag}`} label={tag} tone="soft" />
        ))}
      </View>
    </View>
  );
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    paddingBottom: 120,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xl,
  },
  searchCard: {
    ...cardShadow,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 46,
    color: theme.colors.text,
    fontSize: 15,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  favoriteFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  favoriteFilterActive: {
    backgroundColor: theme.colors.danger,
  },
  favoriteFilterText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
  favoriteFilterTextActive: {
    color: theme.colors.white,
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  reloadButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  filterSection: {
    marginBottom: theme.spacing.lg,
  },
  filterLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  filterScroll: {
    paddingRight: theme.spacing.sm,
  },
  filterChip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingVertical: 9,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
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
  resultCount: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    marginBottom: theme.spacing.md,
  },
  emptyCard: {
    ...cardShadow,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.section,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  card: {
    ...cardShadow,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  cardDate: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
  },
  favoriteButton: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.dangerSoft,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  tagGroup: {
    marginBottom: theme.spacing.md,
  },
  tagGroupLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    marginBottom: theme.spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  badge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  badgePrimary: {
    backgroundColor: theme.colors.primarySoft,
  },
  badgeMuted: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  badgeSoft: {
    backgroundColor: theme.colors.backgroundAccent,
  },
  badgeText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surfaceStrong,
  },
  previewBox: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  answerBlock: {
    marginBottom: theme.spacing.sm,
  },
  answerKey: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    marginBottom: 4,
  },
  answerValue: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  emptyPreviewText: {
    ...theme.typography.body,
    color: theme.colors.textSoft,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  editButton: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.lg,
  },
  editButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  deleteButton: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.lg,
  },
  deleteButtonText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
});
