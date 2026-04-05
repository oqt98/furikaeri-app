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
import { templates } from '../../data/templates';
import {
  deleteReview,
  getReviews,
  ReviewItem,
  toggleFavoriteReview,
} from '../../lib/storage';

const CATEGORY_OPTIONS = ['すべて', '仕事', 'プラベ'] as const;

type CategoryFilter = (typeof CATEGORY_OPTIONS)[number];

export default function HistoryScreen() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>('すべて');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('すべて');
  const [searchText, setSearchText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);

  const templateOptions = useMemo(() => {
    return ['すべて', ...templates.map((template) => template.name)];
  }, []);

  const loadReviews = async () => {
    const data = await getReviews();

    const sorted = [...data].sort((a, b) => {
      const favoriteA = a.isFavorite ? 1 : 0;
      const favoriteB = b.isFavorite ? 1 : 0;

      if (favoriteA !== favoriteB) {
        return favoriteB - favoriteA;
      }

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
        selectedTemplate === 'すべて' ||
        item.templateName === selectedTemplate;

      const answerText = Object.values(item.answers ?? {})
        .join(' ')
        .toLowerCase();

      const tagsText = (item.tags ?? []).join(' ').toLowerCase();

      const moodText = (item.mood ?? '').toLowerCase();
      const templateText = (item.templateName ?? '').toLowerCase();
      const categoryText = (item.category ?? '').toLowerCase();

      const searchMatch =
        keyword === '' ||
        answerText.includes(keyword) ||
        tagsText.includes(keyword) ||
        moodText.includes(keyword) ||
        templateText.includes(keyword) ||
        categoryText.includes(keyword);

      return categoryMatch && templateMatch && searchMatch;
    });
  }, [reviews, searchText, selectedCategory, selectedTemplate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getPreviewAnswers = (answers: Record<string, string>) => {
    const entries = Object.entries(answers).filter(
      ([, value]) => value && value.trim() !== ''
    );

    return entries.slice(0, 2);
  };

  const truncateText = (text: string, maxLength = 48) => {
    if (!text) return '（未入力）';
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const getCategoryBadgeStyle = (category: '仕事' | 'プラベ') => {
    return category === '仕事' ? styles.workBadge : styles.privateBadge;
  };

  const isSelectedCategory = (value: CategoryFilter) =>
    selectedCategory === value;

  const isSelectedTemplate = (value: string) =>
    selectedTemplate === value;

  const hasSavedReviews = reviews.length > 0;
  const hasFilteredReviews = filteredReviews.length > 0;

  const handleEdit = (item: ReviewItem) => {
    router.push({
      pathname: '/entry',
      params: {
        reviewId: item.id,
      },
    });
  };

  const executeDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteReview(id);
      await loadReviews();
    } catch (error) {
      console.error('delete failed:', error);
      Alert.alert('削除に失敗しました', '時間をおいてもう一度お試しください。');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (item: ReviewItem) => {
    Alert.alert(
      'この振り返りを削除しますか？',
      `「${item.templateName}」を削除します。`,
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            void executeDelete(item.id);
          },
        },
      ]
    );
  };

  const handleToggleFavorite = async (item: ReviewItem) => {
    try {
      setFavoriteLoadingId(item.id);
      await toggleFavoriteReview(item.id);
      await loadReviews();
    } catch (error) {
      console.error('toggle favorite failed:', error);
      Alert.alert(
        'お気に入り更新に失敗しました',
        '時間をおいてもう一度お試しください。'
      );
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  return (
    <SwipeTabPage tabKey="history">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>履歴</Text>
        <Text style={styles.subtitle}>これまでの振り返り一覧</Text>

        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="検索（本文 / タグ / 気分 / テンプレ）"
          placeholderTextColor="#94a3b8"
        />

        <Pressable style={styles.reloadButton} onPress={loadReviews}>
          <Text style={styles.reloadButtonText}>再読み込み</Text>
        </Pressable>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>カテゴリ</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.filterChip,
                  isSelectedCategory(option) && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(option)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelectedCategory(option) && styles.filterChipTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>テンプレ</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {templateOptions.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.filterChip,
                  isSelectedTemplate(option) && styles.filterChipActive,
                ]}
                onPress={() => setSelectedTemplate(option)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelectedTemplate(option) && styles.filterChipTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.resultCount}>
          {hasSavedReviews
            ? `表示件数: ${filteredReviews.length}件 / 全${reviews.length}件`
            : '表示件数: 0件'}
        </Text>

        {!hasSavedReviews ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>まだ保存された振り返りはありません。</Text>
          </View>
        ) : !hasFilteredReviews ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              該当する振り返りがありません。
            </Text>
          </View>
        ) : (
          filteredReviews.map((item) => {
            const previewAnswers = getPreviewAnswers(item.answers);
            const isDeleting = deletingId === item.id;
            const isFavoriteLoading = favoriteLoadingId === item.id;

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTextArea}>
                    <Text style={styles.cardTitle}>{item.templateName}</Text>
                    <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                  </View>

                  <Pressable
                    style={styles.favoriteButton}
                    onPress={() => handleToggleFavorite(item)}
                    disabled={isFavoriteLoading}
                  >
                    <Text style={styles.favoriteButtonText}>
                      {item.isFavorite ? '★' : '☆'}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.categoryBadge,
                      getCategoryBadgeStyle(item.category),
                    ]}
                  >
                    <Text style={styles.categoryBadgeText}>
                      {item.category}
                    </Text>
                  </View>

                  {item.mood ? (
                    <View style={styles.moodBadge}>
                      <Text style={styles.moodBadgeText}>{item.mood}</Text>
                    </View>
                  ) : null}
                </View>

                {item.tags && item.tags.length > 0 ? (
                  <View style={styles.tagsContainer}>
                    {item.tags.map((tag) => (
                      <View key={`${item.id}-${tag}`} style={styles.tagChip}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {item.photoUri ? (
                  <Image
                    source={{ uri: item.photoUri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={styles.previewBox}>
                  {previewAnswers.length > 0 ? (
                    previewAnswers.map(([key, value]) => (
                      <View key={key} style={styles.answerBlock}>
                        <Text style={styles.answerKey}>{key}</Text>
                        <Text style={styles.answerValue}>
                          {truncateText(value)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noAnswerText}>
                      未入力の振り返りです。
                    </Text>
                  )}
                </View>

                {item.updatedAt ? (
                  <Text style={styles.updatedAt}>
                    更新: {formatDate(item.updatedAt)}
                  </Text>
                ) : null}

                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => handleEdit(item)}
                  >
                    <Text style={styles.editButtonText}>編集</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.deleteButton,
                      isDeleting && styles.deleteButtonDisabled,
                    ]}
                    onPress={() => confirmDelete(item)}
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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f7f8fa',
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dfe7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111',
    marginBottom: 14,
  },
  reloadButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dfe7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  reloadButtonText: {
    fontWeight: '700',
    color: '#111',
  },
  filterSection: {
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    marginBottom: 8,
  },
  filterScrollContent: {
    paddingRight: 8,
  },
  filterChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dfe7',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2f6fed',
    borderColor: '#2f6fed',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e6eb',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e3e6eb',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardHeaderTextArea: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111',
  },
  favoriteButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButtonText: {
    fontSize: 22,
    color: '#f59e0b',
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  workBadge: {
    backgroundColor: '#eef4ff',
  },
  privateBadge: {
    backgroundColor: '#fff4ea',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  moodBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  moodBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  date: {
    fontSize: 13,
    color: '#666',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: '#f5f7fb',
    borderWidth: 1,
    borderColor: '#e1e6ef',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tagText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#eef2f7',
  },
  previewBox: {
    backgroundColor: '#fafbfc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#edf0f4',
  },
  answerBlock: {
    marginBottom: 10,
  },
  answerKey: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  answerValue: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111',
  },
  noAnswerText: {
    color: '#666',
    fontSize: 14,
  },
  updatedAt: {
    marginTop: 10,
    fontSize: 12,
    color: '#888',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  editButton: {
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#bfd3ff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  editButtonText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#be123c',
    fontSize: 13,
    fontWeight: '700',
  },
});