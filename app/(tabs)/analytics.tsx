import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../../components/AppHeader';
import SideMenu from '../../components/SideMenu';
import SwipeTabPage from '../../components/SwipeTabPage';
import { CATEGORIES, MOOD_OPTIONS } from '../../data/reviewOptions';
import { buildInsightSummary } from '../../lib/insights';
import { getReviews, type ReviewItem } from '../../lib/storage';
import { useAppTheme } from '../../lib/theme-context';
import { createCardShadow } from '../../lib/theme';

export default function AnalyticsScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void getReviews().then(setReviews);
    }, [])
  );

  const analytics = useMemo(() => {
    const total = reviews.length;
    const uniqueDays = new Set(
      reviews.map((item) => new Date(item.createdAt).toLocaleDateString('sv-SE'))
    ).size;
    const moodCounts = MOOD_OPTIONS.map((mood) => ({
      label: `${mood.emoji} ${mood.label}`,
      count: reviews.filter((item) => item.mood === mood.value).length,
    }));
    const categoryCounts = CATEGORIES.map((category) => ({
      label: category,
      count: reviews.filter((item) => item.category === category).length,
    }));

    return {
      total,
      uniqueDays,
      averagePerWeek: total === 0 ? 0 : Math.max(Math.round((total / 4) * 10) / 10, 0.5),
      moodCounts,
      categoryCounts,
    };
  }, [reviews]);

  const insight = useMemo(() => buildInsightSummary(reviews), [reviews]);

  return (
    <SwipeTabPage tabKey="analytics">
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader
          title="分析"
          subtitle="数字はシンプルに。振り返りの傾向だけ見やすく。"
          onOpenMenu={() => setIsMenuVisible(true)}
        />

        {reviews.length === 0 ? (
          <View testID="analytics-empty-state" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>まだ分析できる記録がありません</Text>
            <Text style={styles.emptyText}>
              いくつか書きためると、気分やカテゴリの流れが見えてきます。
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard label="記録数" value={`${analytics.total}件`} />
              <SummaryCard label="記録した日" value={`${analytics.uniqueDays}日`} />
              <SummaryCard label="週あたり" value={`${analytics.averagePerWeek}件`} />
            </View>

            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>{insight.weeklyTitle}</Text>
              <Text style={styles.noteBody}>{insight.weeklyBody}</Text>
            </View>

            <SectionCard title="カテゴリの内訳">
              {analytics.categoryCounts.map((item) => (
                <BarRow
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  max={Math.max(...analytics.categoryCounts.map((row) => row.count), 1)}
                />
              ))}
            </SectionCard>

            <SectionCard title="気分の流れ">
              {analytics.moodCounts.map((item) => (
                <BarRow
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  max={Math.max(...analytics.moodCounts.map((row) => row.count), 1)}
                />
              ))}
            </SectionCard>
          </>
        )}
      </ScrollView>

      <SideMenu visible={isMenuVisible} onClose={() => setIsMenuVisible(false)} />
    </SwipeTabPage>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
  children: ReactNode;
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
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
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const widthValue =
    max === 0 ? '0%' : `${Math.max((count / max) * 100, count > 0 ? 8 : 0)}%`;

  return (
    <View style={styles.barRow}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{count}件</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: widthValue as `${number}%` }]} />
      </View>
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
    summaryGrid: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    summaryCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
    },
    summaryLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: theme.spacing.sm,
    },
    summaryValue: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700',
      color: theme.colors.text,
    },
    noteCard: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    noteTitle: {
      ...theme.typography.section,
      color: theme.colors.primaryDark,
      marginBottom: theme.spacing.sm,
    },
    noteBody: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    sectionCard: {
      ...createCardShadow(theme),
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
    barRow: {
      marginBottom: theme.spacing.md,
    },
    barHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    barLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
      flex: 1,
    },
    barValue: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    barTrack: {
      height: 10,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceStrong,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },
  });
}
