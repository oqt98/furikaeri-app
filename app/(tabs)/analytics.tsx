import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../../components/AppHeader';
import SideMenu from '../../components/SideMenu';
import SwipeTabPage from '../../components/SwipeTabPage';
import { MOOD_OPTIONS } from '../../data/reviewOptions';
import { buildInsightSummary } from '../../lib/insights';
import { reviewRepository } from '../../lib/reviewRepository';
import { type ReviewItem } from '../../lib/storage';
import { createCardShadow } from '../../lib/theme';
import { useAppTheme } from '../../lib/theme-context';

export default function AnalyticsScreen() {
  const { theme, t, locale } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isBreakdownVisible, setIsBreakdownVisible] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAnalyticsData = useCallback(async () => {
    setIsLoadingData(true);
    setLoadError(null);

    try {
      setReviews(await reviewRepository.list());
    } catch (error) {
      console.error('analytics load error:', error);
      setLoadError('分析データを読み込めませんでした。少し時間をおいて再度お試しください。');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAnalyticsData();
    }, [loadAnalyticsData])
  );

  const analytics = useMemo(() => {
    const total = reviews.length;
    const uniqueDays = new Set(
      reviews.map((item) => new Date(item.createdAt).toISOString().slice(0, 10))
    ).size;
    const moodCounts = MOOD_OPTIONS.map((mood) => ({
      label: `${mood.emoji} ${mood.label}`,
      count: reviews.filter((item) => item.mood === mood.value).length,
    }));
    return {
      total,
      uniqueDays,
      averagePerWeek: total === 0 ? 0 : Math.max(Math.round((total / 4) * 10) / 10, 0.5),
      moodCounts,
    };
  }, [reviews]);

  const insight = useMemo(() => buildInsightSummary(reviews), [reviews]);

  return (
    <SwipeTabPage tabKey="analytics">
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader
          title={t('analytics.title')}
          subtitle={t('analytics.subtitle')}
          onOpenMenu={() => setIsMenuVisible(true)}
        />

        {loadError ? (
          <RetryCard
            title="分析の読み込みに失敗しました"
            body={loadError}
            buttonLabel="分析を再読み込み"
            onPress={() => void loadAnalyticsData()}
          />
        ) : null}

        {isLoadingData ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>分析データを読み込んでいます</Text>
            <Text style={styles.emptyText}>記録件数や傾向を準備しています。</Text>
          </View>
        ) : reviews.length === 0 ? (
          <View testID="analytics-empty-state" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('analytics.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('analytics.emptyBody')}</Text>
          </View>
        ) : (
          <>
            <AtAGlanceCard
              averagePerWeek={`${analytics.averagePerWeek}`}
              days={`${analytics.uniqueDays}`}
              locale={locale}
              total={`${analytics.total}`}
            />

            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>{insight.weeklyTitle}</Text>
              <Text style={styles.noteBody}>{insight.weeklyBody}</Text>
            </View>

            <SectionCard title={locale === 'en' ? 'Details' : '詳細'}>
              <Text style={styles.detailLead}>
                {locale === 'en'
                  ? 'Open this only when you want a more detailed breakdown.'
                  : '細かい内訳を見たいときだけ開けるようにしています。'}
              </Text>
              <Pressable
                style={styles.detailToggle}
                onPress={() => setIsBreakdownVisible((value) => !value)}
              >
                <Text style={styles.detailToggleText}>
                  {isBreakdownVisible
                    ? locale === 'en'
                      ? 'Hide details'
                      : '詳細を閉じる'
                    : locale === 'en'
                      ? 'Show details'
                      : '詳細を見る'}
                </Text>
              </Pressable>

              {isBreakdownVisible ? (
                <View style={styles.detailStack}>
                  <CompactBreakdownCard
                    title={t('analytics.moodBreakdown')}
                    rows={analytics.moodCounts}
                  />
                </View>
              ) : null}
            </SectionCard>
          </>
        )}
      </ScrollView>

      <SideMenu visible={isMenuVisible} onClose={() => setIsMenuVisible(false)} />
    </SwipeTabPage>
  );
}

function RetryCard({
  title,
  body,
  buttonLabel,
  onPress,
}: {
  title: string;
  body: string;
  buttonLabel: string;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.retryCard}>
      <Text style={styles.retryTitle}>{title}</Text>
      <Text style={styles.retryBody}>{body}</Text>
      <Pressable style={styles.retryButton} onPress={onPress}>
        <Text style={styles.retryButtonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

function AtAGlanceCard({
  total,
  days,
  averagePerWeek,
  locale,
}: {
  total: string;
  days: string;
  averagePerWeek: string;
  locale: string;
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const items = [
    { label: locale === 'en' ? 'Records' : '記録数', value: total },
    { label: locale === 'en' ? 'Days' : '記録日数', value: days },
    { label: locale === 'en' ? 'Per week' : '週あたり', value: averagePerWeek },
  ];

  return (
    <View style={styles.glanceCard}>
      <Text style={styles.glanceTitle}>{locale === 'en' ? 'Overview' : '概要'}</Text>
      <View style={styles.glanceRow}>
        {items.map((item) => (
          <View key={item.label} style={styles.glanceItem}>
            <Text style={styles.glanceLabel}>{item.label}</Text>
            <Text style={styles.glanceValue}>{item.value}</Text>
          </View>
        ))}
      </View>
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
        <Text style={styles.barValue}>{count}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: widthValue as `${number}%` }]} />
      </View>
    </View>
  );
}

function CompactBreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number }[];
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <View style={styles.compactCard}>
      <Text style={styles.compactCardTitle}>{title}</Text>
      {rows.map((item) => (
        <BarRow key={item.label} label={item.label} count={item.count} max={max} />
      ))}
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
    retryCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    retryTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    retryBody: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.md,
    },
    retryButton: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
    },
    retryButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    glanceCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    glanceTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    glanceRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    glanceItem: {
      flex: 1,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
    },
    glanceLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: 4,
    },
    glanceValue: {
      fontSize: 22,
      lineHeight: 28,
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
    detailLead: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.md,
    },
    detailToggle: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
      marginBottom: theme.spacing.md,
    },
    detailToggleText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    detailStack: {
      gap: theme.spacing.md,
    },
    compactCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
    },
    compactCardTitle: {
      ...theme.typography.caption,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
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
