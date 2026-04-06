import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import SwipeTabPage from '../../components/SwipeTabPage';
import { CATEGORIES, MOOD_OPTIONS } from '../../data/reviewOptions';
import { buildInsightSummary } from '../../lib/insights';
import { getReviews, getTagCatalog, type ReviewItem } from '../../lib/storage';
import { cardShadow, theme } from '../../lib/theme';

type CountItem = {
  label: string;
  count: number;
};

export default function AnalyticsScreen() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [tagLabelMap, setTagLabelMap] = useState<Map<string, string>>(new Map());

  useFocusEffect(
    useCallback(() => {
      void Promise.all([getReviews(), getTagCatalog()]).then(([nextReviews, catalog]) => {
        setReviews(nextReviews);
        setTagLabelMap(
          new Map([...catalog.action, ...catalog.state].map((tag) => [tag.id, tag.label]))
        );
      });
    }, [])
  );

  const analytics = useMemo(() => {
    const totalReviews = reviews.length;
    const uniqueDateKeys = Array.from(
      new Set(reviews.map((item) => toDateKey(new Date(item.createdAt))))
    ).sort((a, b) => (a < b ? 1 : -1));

    const totalRecordedDays = uniqueDateKeys.length;
    const currentStreak = calculateCurrentStreak(uniqueDateKeys);

    const categoryCounts: CountItem[] = CATEGORIES.map((category) => ({
      label: category,
      count: reviews.filter((item) => item.category === category).length,
    }));

    const moodCounts: CountItem[] = MOOD_OPTIONS.map((mood) => ({
      label: `${mood.emoji} ${mood.label}`,
      count: reviews.filter((item) => item.mood === mood.value).length,
    }));

    const templateCounts = Array.from(
      reviews.reduce((map, item) => {
        map.set(item.templateName, (map.get(item.templateName) ?? 0) + 1);
        return map;
      }, new Map<string, number>())
    )
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const actionTagCounts = Array.from(
      reviews.reduce((map, item) => {
        for (const tagId of item.actionTagIds) {
          const label = tagLabelMap.get(tagId) ?? tagId;
          map.set(label, (map.get(label) ?? 0) + 1);
        }
        return map;
      }, new Map<string, number>())
    )
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const stateTagCounts = Array.from(
      reviews.reduce((map, item) => {
        for (const tagId of item.stateTagIds) {
          const label = tagLabelMap.get(tagId) ?? tagId;
          map.set(label, (map.get(label) ?? 0) + 1);
        }
        return map;
      }, new Map<string, number>())
    )
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalReviews,
      totalRecordedDays,
      currentStreak,
      categoryCounts,
      moodCounts,
      templateCounts,
      actionTagCounts,
      stateTagCounts,
    };
  }, [reviews, tagLabelMap]);

  const insight = useMemo(() => buildInsightSummary(reviews), [reviews]);
  const hasData = reviews.length > 0;

  return (
    <SwipeTabPage tabKey="analytics">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>分析</Text>
        <Text style={styles.subtitle}>
          軽めの集計だけに絞って、次の日に活かしやすい形で見せます。
        </Text>

        {!hasData ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>まだ分析できる記録がありません</Text>
            <Text style={styles.emptyText}>
              数件たまると、気分やタグの偏りが見え始めます。
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard label="記録数" value={`${analytics.totalReviews}件`} />
              <SummaryCard label="記録した日" value={`${analytics.totalRecordedDays}日`} />
              <SummaryCard label="連続日数" value={`${analytics.currentStreak}日`} />
            </View>

            <InsightCard title={insight.weeklyTitle} body={insight.weeklyBody} />
            <InsightCard title={insight.nextTitle} body={insight.nextBody} subtle />

            <SectionCard title="カテゴリのバランス">
              {analytics.categoryCounts.map((item) => (
                <RatioRow
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  total={analytics.totalReviews}
                />
              ))}
            </SectionCard>

            <SectionCard title="気分の分布">
              {analytics.moodCounts.map((item) => (
                <BarRow
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  max={Math.max(...analytics.moodCounts.map((row) => row.count), 1)}
                />
              ))}
            </SectionCard>

            <SectionCard title="よく使うテンプレート">
              {analytics.templateCounts.map((item) => (
                <BarRow
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  max={Math.max(...analytics.templateCounts.map((row) => row.count), 1)}
                />
              ))}
            </SectionCard>

            <SectionCard title="よく使う行動タグ">
              <RankList items={analytics.actionTagCounts} emptyText="行動タグはまだありません。" />
            </SectionCard>

            <SectionCard title="よく使う状態タグ">
              <RankList items={analytics.stateTagCounts} emptyText="状態タグはまだありません。" />
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

function InsightCard({
  title,
  body,
  subtle,
}: {
  title: string;
  body: string;
  subtle?: boolean;
}) {
  return (
    <View style={[styles.insightCard, subtle && styles.insightCardSubtle]}>
      <Text style={[styles.insightTitle, subtle && styles.insightTitleSubtle]}>
        {title}
      </Text>
      <Text style={styles.insightBody}>{body}</Text>
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
    <View style={styles.rowBlock}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>
          {count}件 / {percent}%
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
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
  const percent = max === 0 ? 0 : Math.max(Math.round((count / max) * 100), 4);

  return (
    <View style={styles.rowBlock}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{count}件</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

function RankList({
  items,
  emptyText,
}: {
  items: CountItem[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <Text style={styles.noDataText}>{emptyText}</Text>;
  }

  return (
    <>
      {items.map((item, index) => (
        <View key={item.label} style={styles.tagRow}>
          <View style={styles.tagRowLeft}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.tagLabel}>{item.label}</Text>
          </View>
          <Text style={styles.tagCount}>{item.count}件</Text>
        </View>
      ))}
    </>
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
  emptyCard: {
    ...cardShadow,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  summaryCard: {
    ...cardShadow,
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    marginBottom: theme.spacing.sm,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  insightCard: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  insightCardSubtle: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  insightTitle: {
    ...theme.typography.section,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.sm,
  },
  insightTitleSubtle: {
    color: theme.colors.text,
  },
  insightBody: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  sectionCard: {
    ...cardShadow,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.section,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  rowBlock: {
    marginBottom: theme.spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  rowLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  rowValue: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  track: {
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceStrong,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  noDataText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tagRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  rankBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  tagLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  tagCount: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
});
