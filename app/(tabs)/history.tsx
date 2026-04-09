import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AppHeader from '../../components/AppHeader';
import SideMenu from '../../components/SideMenu';
import SwipeTabPage from '../../components/SwipeTabPage';
import { CATEGORY_FILTER_OPTIONS, MOOD_OPTIONS, getMoodOption, type CategoryFilterOption, type MoodValue } from '../../data/reviewOptions';
import { deleteReview, getReviews, getTagCatalog, toggleFavoriteReview, type ReviewItem } from '../../lib/storage';
import { useAppTheme } from '../../lib/theme-context';
import { createCardShadow } from '../../lib/theme';

type PeriodFilter = 'all' | 'thisWeek' | 'thisMonth' | 'month';

type SortOrder = 'desc' | 'asc';

export default function HistoryScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterOption>('すべて');
  const [selectedMood, setSelectedMood] = useState<MoodValue | 'all'>('all');
  const [selectedActionTagId, setSelectedActionTagId] = useState<string>('all');
  const [selectedStateTagId, setSelectedStateTagId] = useState<string>('all');
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

  const loadReviews = useCallback(async () => {
    const [nextReviews, catalog] = await Promise.all([getReviews(), getTagCatalog()]);
    setReviews(nextReviews);
    setActionTags(catalog.action.filter((tag) => !tag.isArchived).map((tag) => ({ id: tag.id, label: tag.label })));
    setStateTags(catalog.state.filter((tag) => !tag.isArchived).map((tag) => ({ id: tag.id, label: tag.label })));
    setTagLabelMap(new Map([...catalog.action, ...catalog.state].map((tag) => [tag.id, tag.label])));
  }, []);

  useFocusEffect(useCallback(() => {
    void loadReviews();
  }, [loadReviews]));

  const filteredReviews = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return reviews.filter((review) => {
      const categoryMatch = selectedCategory === 'すべて' || review.category === selectedCategory;
      const moodMatch = selectedMood === 'all' || review.mood === selectedMood;
      const favoriteMatch = !favoritesOnly || review.isFavorite;
      const actionTagMatch = selectedActionTagId === 'all' || review.actionTagIds.includes(selectedActionTagId);
      const stateTagMatch = selectedStateTagId === 'all' || review.stateTagIds.includes(selectedStateTagId);
      const periodMatch = matchesPeriodFilter(review.createdAt, periodFilter, selectedMonth);
      const tagLabels = [...review.actionTagIds, ...review.stateTagIds].map((id) => tagLabelMap.get(id) ?? '').join(' ');
      const body = Object.values(review.answers ?? {}).join(' ');
      const searchPool = `${review.templateName} ${review.category} ${tagLabels} ${body}`.toLowerCase();
      const keywordMatch = !keyword || searchPool.includes(keyword);
      return categoryMatch && moodMatch && favoriteMatch && actionTagMatch && stateTagMatch && periodMatch && keywordMatch;
    });
  }, [reviews, searchText, selectedCategory, selectedMood, favoritesOnly, selectedActionTagId, selectedStateTagId, periodFilter, selectedMonth, tagLabelMap]);

  const sortedReviews = useMemo(() => {
    return [...filteredReviews].sort((a, b) => sortOrder === 'desc' ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [filteredReviews, sortOrder]);

  return (
    <SwipeTabPage tabKey="history">
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader title="履歴" subtitle="一覧から探しやすく、必要なときだけ条件を絞れます。" onOpenMenu={() => setIsMenuVisible(true)} />

        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={theme.colors.textSoft} />
            <TextInput style={styles.searchInput} value={searchText} onChangeText={setSearchText} placeholder="キーワードで検索" placeholderTextColor={theme.colors.textSoft} />
          </View>
          <View style={styles.toolbarRow}>
            <Pressable style={styles.toolbarButton} onPress={() => setIsFilterOpen(true)}>
              <Ionicons name="options-outline" size={16} color={theme.colors.primaryDark} />
              <Text style={styles.toolbarButtonText}>フィルタ</Text>
            </Pressable>
            <Pressable style={styles.toolbarButton} onPress={() => setIsSortOpen(true)}>
              <Ionicons name="swap-vertical-outline" size={16} color={theme.colors.primaryDark} />
              <Text style={styles.toolbarButtonText}>ソート</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.resultText}>{sortedReviews.length}件の記録</Text>

        {sortedReviews.length === 0 ? (
          <View testID="history-empty-state" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>表示できる記録がありません</Text>
            <Text style={styles.emptyText}>条件をゆるめるか、新しい記録を追加してください。</Text>
          </View>
        ) : (
          sortedReviews.map((item) => <HistoryCard key={item.id} item={item} tagLabelMap={tagLabelMap} onRefresh={loadReviews} />)
        )}
      </ScrollView>

      <SelectionModal visible={isFilterOpen} title="フィルタ" onClose={() => setIsFilterOpen(false)}>
        <FilterSection title="期間" styles={styles}>
          <View style={styles.filterRow}>
            <FilterChip label="すべて" active={periodFilter === 'all'} onPress={() => setPeriodFilter('all')} />
            <FilterChip label="今週" active={periodFilter === 'thisWeek'} onPress={() => setPeriodFilter('thisWeek')} />
            <FilterChip label="今月" active={periodFilter === 'thisMonth'} onPress={() => setPeriodFilter('thisMonth')} />
            <FilterChip label="月指定" active={periodFilter === 'month'} onPress={() => setPeriodFilter('month')} />
          </View>
          {periodFilter === 'month' ? <TextInput style={styles.monthInput} value={selectedMonth} onChangeText={setSelectedMonth} placeholder="2026-04" placeholderTextColor={theme.colors.textSoft} /> : null}
        </FilterSection>
        <FilterSection title="カテゴリ" styles={styles}><View style={styles.filterRow}>{CATEGORY_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option} active={option === selectedCategory} onPress={() => setSelectedCategory(option)} />)}</View></FilterSection>
        <FilterSection title="気分" styles={styles}><View style={styles.filterRow}><FilterChip label="すべて" active={selectedMood === 'all'} onPress={() => setSelectedMood('all')} />{MOOD_OPTIONS.map((option) => <FilterChip key={option.value} label={`${option.emoji} ${option.label}`} active={selectedMood === option.value} onPress={() => setSelectedMood(option.value)} />)}</View></FilterSection>
        <FilterSection title="行動タグ" styles={styles}><View style={styles.filterRow}><FilterChip label="すべて" active={selectedActionTagId === 'all'} onPress={() => setSelectedActionTagId('all')} />{actionTags.map((tag) => <FilterChip key={tag.id} label={tag.label} active={selectedActionTagId === tag.id} onPress={() => setSelectedActionTagId(tag.id)} />)}</View></FilterSection>
        <FilterSection title="気分タグ" styles={styles}><View style={styles.filterRow}><FilterChip label="すべて" active={selectedStateTagId === 'all'} onPress={() => setSelectedStateTagId('all')} />{stateTags.map((tag) => <FilterChip key={tag.id} label={tag.label} active={selectedStateTagId === tag.id} onPress={() => setSelectedStateTagId(tag.id)} />)}</View></FilterSection>
        <Pressable style={[styles.favoriteToggle, favoritesOnly && styles.favoriteToggleActive]} onPress={() => setFavoritesOnly((value) => !value)}>
          <Ionicons name={favoritesOnly ? 'heart' : 'heart-outline'} size={16} color={favoritesOnly ? theme.colors.white : theme.colors.danger} />
          <Text style={[styles.favoriteToggleText, favoritesOnly && styles.favoriteToggleTextActive]}>お気に入りのみ</Text>
        </Pressable>
      </SelectionModal>

      <SelectionModal visible={isSortOpen} title="ソート" onClose={() => setIsSortOpen(false)}>
        <View style={styles.filterRow}>
          <FilterChip label="新しい順" active={sortOrder === 'desc'} onPress={() => setSortOrder('desc')} />
          <FilterChip label="古い順" active={sortOrder === 'asc'} onPress={() => setSortOrder('asc')} />
        </View>
      </SelectionModal>

      <SideMenu visible={isMenuVisible} onClose={() => setIsMenuVisible(false)} />
    </SwipeTabPage>
  );
}

function SelectionModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={20} color={theme.colors.textMuted} /></Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function HistoryCard({ item, tagLabelMap, onRefresh }: { item: ReviewItem; tagLabelMap: Map<string, string>; onRefresh: () => Promise<void> }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const mood = item.mood ? getMoodOption(item.mood) : null;
  const preview = item.answers.memo?.trim() || Object.values(item.answers ?? {}).find((value) => value.trim());
  const tags = [...item.actionTagIds, ...item.stateTagIds].map((id) => tagLabelMap.get(id)).filter(Boolean).slice(0, 4) as string[];
  const sortedPhotos = [...item.photos].sort((a, b) => a.order - b.order);
  const coverPhoto = sortedPhotos[0];

  const handleDelete = () => {
    Alert.alert('この記録を削除しますか？', '削除すると元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除する', style: 'destructive', onPress: () => void deleteReview(item.id).then(onRefresh) },
    ]);
  };

  return (
    <Pressable style={styles.historyCard} onPress={() => router.push(`/review/${item.id}` as never)}>
      <View style={styles.cardTopRow}>
        <View style={styles.flexFill}>
          <Text style={styles.historyTitle}>{item.templateName}</Text>
          <Text style={styles.historyMeta}>{new Date(item.createdAt).toLocaleString('ja-JP')}{mood ? ` ・ ${mood.emoji} ${mood.label}` : ''}</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={() => void toggleFavoriteReview(item.id).then(onRefresh)}>
          <Ionicons name={item.isFavorite ? 'heart' : 'heart-outline'} size={18} color={theme.colors.danger} />
        </Pressable>
      </View>

      <View style={styles.metaChips}>{[item.category, ...tags].map((label, index) => <MetaChip key={`${item.id}-${label}-${index}`} label={label} muted={index > 0} />)}</View>
      <Text style={styles.previewText}>{preview?.trim() || 'まだ入力はありません。'}</Text>

      {coverPhoto ? (
        <View style={styles.photoSection}>
          <Image source={{ uri: coverPhoto.uri }} style={styles.photoPreview} />
          <View style={styles.photoMetaRow}>
            <Text style={styles.photoMetaText}>{sortedPhotos.length > 1 ? `写真 ${sortedPhotos.length}枚` : '写真 1枚'}</Text>
            {coverPhoto.comment.trim() ? <Text style={styles.photoCommentText}>{coverPhoto.comment.trim()}</Text> : null}
          </View>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <Pressable style={styles.secondaryButton} onPress={() => router.push(`/review/${item.id}` as never)}><Text style={styles.secondaryButtonText}>詳細を見る</Text></Pressable>
        <Pressable style={styles.deleteButton} onPress={handleDelete}><Text style={styles.deleteButtonText}>削除</Text></Pressable>
      </View>
    </Pressable>
  );
}

function FilterSection({ title, children, styles }: { title: string; children: React.ReactNode; styles: ReturnType<typeof createStyles> }) {
  return <View><Text style={styles.filterTitle}>{title}</Text>{children}</View>;
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}><Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text></Pressable>;
}

function MetaChip({ label, muted }: { label: string; muted?: boolean }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={[styles.metaChip, muted && styles.metaChipMuted]}><Text style={styles.metaChipText}>{label}</Text></View>;
}

function matchesPeriodFilter(createdAt: string, period: PeriodFilter, selectedMonth: string) {
  if (period === 'all') return true;
  const date = new Date(createdAt);
  const now = new Date();
  if (period === 'thisMonth') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
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

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: theme.colors.background, padding: theme.spacing.xl, paddingBottom: 120 },
    searchCard: { ...createCardShadow(theme), backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, marginBottom: theme.spacing.md, gap: theme.spacing.md },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: theme.spacing.md },
    searchInput: { flex: 1, height: 48, color: theme.colors.text, fontSize: 15 },
    toolbarRow: { flexDirection: 'row', gap: theme.spacing.sm },
    toolbarButton: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: 10 },
    toolbarButtonText: { ...theme.typography.caption, color: theme.colors.primaryDark },
    filterTitle: { ...theme.typography.caption, color: theme.colors.textSoft, marginBottom: theme.spacing.sm },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    filterChip: { borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted, paddingHorizontal: theme.spacing.md, paddingVertical: 8 },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterChipText: { ...theme.typography.caption, color: theme.colors.textMuted },
    filterChipTextActive: { color: theme.colors.white },
    monthInput: { marginTop: theme.spacing.sm, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: theme.spacing.md, paddingVertical: 12, color: theme.colors.text, fontSize: 15 },
    favoriteToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerSoft, paddingVertical: 12 },
    favoriteToggleActive: { backgroundColor: theme.colors.danger },
    favoriteToggleText: { ...theme.typography.caption, color: theme.colors.danger },
    favoriteToggleTextActive: { color: theme.colors.white },
    resultText: { ...theme.typography.caption, color: theme.colors.textSoft, marginBottom: theme.spacing.md },
    emptyCard: { ...createCardShadow(theme), backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xxl },
    emptyTitle: { ...theme.typography.section, color: theme.colors.text, marginBottom: theme.spacing.sm },
    emptyText: { ...theme.typography.body, color: theme.colors.textMuted },
    historyCard: { ...createCardShadow(theme), backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xl, marginBottom: theme.spacing.md },
    cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, marginBottom: theme.spacing.md },
    flexFill: { flex: 1 },
    historyTitle: { ...theme.typography.section, color: theme.colors.text, marginBottom: 4 },
    historyMeta: { ...theme.typography.caption, color: theme.colors.textSoft },
    iconButton: { width: 38, height: 38, borderRadius: theme.radius.pill, backgroundColor: theme.colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
    metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
    metaChip: { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.md, paddingVertical: 6 },
    metaChipMuted: { backgroundColor: theme.colors.surfaceMuted },
    metaChipText: { ...theme.typography.caption, color: theme.colors.textMuted },
    previewText: { ...theme.typography.body, color: theme.colors.text, marginBottom: theme.spacing.lg },
    photoSection: { gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
    photoPreview: { width: '100%', aspectRatio: 16 / 9, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceMuted },
    photoMetaRow: { gap: theme.spacing.xs },
    photoMetaText: { ...theme.typography.caption, color: theme.colors.textSoft },
    photoCommentText: { ...theme.typography.body, color: theme.colors.textMuted },
    cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm },
    secondaryButton: { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.lg, paddingVertical: 10 },
    secondaryButtonText: { ...theme.typography.caption, color: theme.colors.primaryDark },
    deleteButton: { backgroundColor: theme.colors.dangerSoft, borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.lg, paddingVertical: 10 },
    deleteButtonText: { ...theme.typography.caption, color: theme.colors.danger },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'center', padding: theme.spacing.xl },
    modalCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.xl, gap: theme.spacing.md },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { ...theme.typography.section, color: theme.colors.text },
  });
}
