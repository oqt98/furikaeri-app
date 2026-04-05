import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SwipeTabPage from '../../components/SwipeTabPage';
import { getReviews, ReviewItem } from '../../lib/storage';

const MOOD_ORDER = [
  '😊 うれしい',
  '😌 おだやか',
  '🤔 ふつう',
  '😓 つかれた',
  '😢 落ち込み',
] as const;

type CountItem = {
  label: string;
  count: number;
};

export default function AnalyticsScreen() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  const loadReviews = async () => {
    const data = await getReviews();
    setReviews(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadReviews();
    }, [])
  );

  const analytics = useMemo(() => {
    const totalReviews = reviews.length;

    const uniqueDateKeys = Array.from(
      new Set(reviews.map((item) => toDateKey(new Date(item.createdAt))))
    ).sort((a, b) => (a < b ? 1 : -1));

    const totalRecordedDays = uniqueDateKeys.length;
    const currentStreak = calculateCurrentStreak(uniqueDateKeys);

    const workCount = reviews.filter((item) => item.category === '仕事').length;
    const privateCount = reviews.filter((item) => item.category === 'プラベ').length;

    const moodMap = new Map<string, number>();
    for (const mood of MOOD_ORDER) {
      moodMap.set(mood, 0);
    }

    for (const item of reviews) {
      if (!item.mood) continue;
      moodMap.set(item.mood, (moodMap.get(item.mood) ?? 0) + 1);
    }

    const moodCounts: CountItem[] = Array.from(moodMap.entries()).map(
      ([label, count]) => ({
        label,
        count,
      })
    );

    const templateMap = new Map<string, number>();
    for (const item of reviews) {
      templateMap.set(
        item.templateName,
        (templateMap.get(item.templateName) ?? 0) + 1
      );
    }

    const templateCounts = Array.from(templateMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const tagMap = new Map<string, number>();
    for (const item of reviews) {
      for (const tag of item.tags ?? []) {
        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
      }
    }

    const tagCounts = Array.from(tagMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
    const thisMonthCount = reviews.filter((item) => {
      const date = new Date(item.createdAt);
      const monthKey = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
      return monthKey === currentMonthKey;
    }).length;

    return {
      totalReviews,
      totalRecordedDays,
      currentStreak,
      workCount,
      privateCount,
      moodCounts,
      templateCounts,
      tagCounts,
      thisMonthCount,
    };
  }, [reviews]);

  const hasData = reviews.length > 0;

  return (
    <SwipeTabPage tabKey="analytics">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>分析</Text>
        <Text style={styles.subtitle}>振り返りの傾向をまとめて確認できます</Text>

        {!hasData ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>まだ分析できるデータがありません</Text>
            <Text style={styles.emptyText}>
              振り返りを保存すると、ここに件数や傾向が表示されます。
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard label="総記録数" value={`${analytics.totalReviews}件`} />
              <SummaryCard label="記録した日数" value={`${analytics.totalRecordedDays}日`} />
              <SummaryCard label="連続記録" value={`${analytics.currentStreak}日`} />
              <SummaryCard label="今月の記録" value={`${analytics.thisMonthCount}件`} />
            </View>

            <SectionCard title="カテゴリ比率">
              <RatioRow
                label="仕事"
                count={analytics.workCount}
                total={analytics.totalReviews}
              />
              <RatioRow
                label="プラベ"
                count={analytics.privateCount}
                total={analytics.totalReviews}
              />
            </SectionCard>

            <SectionCard title="気分分布">
              {analytics.moodCounts.map((item) => (
                <BarRow
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  max={Math.max(...analytics.moodCounts.map((m) => m.count), 1)}
                />
              ))}
            </SectionCard>

            <SectionCard title="テンプレ利用回数">
              {analytics.templateCounts.map((item) => (
                <BarRow
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  max={Math.max(...analytics.templateCounts.map((t) => t.count), 1)}
                />
              ))}
            </SectionCard>

            <SectionCard title="よく使うタグ TOP5">
              {analytics.tagCounts.length === 0 ? (
                <Text style={styles.noDataText}>タグ付きの記録はまだありません。</Text>
              ) : (
                analytics.tagCounts.map((item, index) => (
                  <TagRankRow
                    key={item.label}
                    rank={index + 1}
                    label={item.label}
                    count={item.count}
                  />
                ))
              )}
            </SectionCard>
          </>
        )}
      </ScrollView>
    </SwipeTabPage>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function RatioRow({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const percent = total === 0 ? 0 : Math.round((count / total) * 100);

  return (
    <View style={styles.ratioRow}>
      <View style={styles.ratioHeader}>
        <Text style={styles.ratioLabel}>{label}</Text>
        <Text style={styles.ratioValue}>
          {count}件 / {percent}%
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

function BarRow({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const percent = max === 0 ? 0 : Math.max((count / max) * 100, 4);

  return (
    <View style={styles.barRow}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barCount}>{count}件</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

function TagRankRow({
  rank,
  label,
  count,
}: {
  rank: number;
  label: string;
  count: number;
}) {
  return (
    <View style={styles.tagRankRow}>
      <View style={styles.tagRankLeft}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankBadgeText}>{rank}</Text>
        </View>
        <Text style={styles.tagRankLabel}>{label}</Text>
      </View>

      <Text style={styles.tagRankCount}>{count}件</Text>
    </View>
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function calculateCurrentStreak(sortedDateKeysDesc: string[]) {
  if (sortedDateKeysDesc.length === 0) return 0;

  const dateSet = new Set(sortedDateKeysDesc);
  const todayKey = toDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  let baseKey: string | null = null;

  if (dateSet.has(todayKey)) {
    baseKey = todayKey;
  } else if (dateSet.has(yesterdayKey)) {
    baseKey = yesterdayKey;
  } else {
    return 0;
  }

  let streak = 0;
  const cursor = new Date(baseKey);

  while (dateSet.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
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
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e3e6eb',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e6eb',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e6eb',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 14,
  },
  ratioRow: {
    marginBottom: 14,
  },
  ratioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  ratioValue: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#edf2f7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2f6fed',
  },
  barRow: {
    marginBottom: 14,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  barLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  barCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
  },
  tagRankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  tagRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#eef4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  tagRankLabel: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
  },
  tagRankCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
});