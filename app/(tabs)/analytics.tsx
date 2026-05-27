import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../../components/AppHeader';
import SideMenu from '../../components/SideMenu';
import SwipeTabPage from '../../components/SwipeTabPage';
import { CATEGORIES, MOOD_OPTIONS } from '../../data/reviewOptions';
import { buildInsightSummary } from '../../lib/insights';
import {
  WeeklyAiSummaryError,
  generateWeeklyAiSummary,
  type WeeklyAiSummaryResponse,
} from '../../lib/weeklyAiSummary';
import {
  getContinuityMessage,
  getWeeklySummaryLabels,
} from '../../lib/weeklySummaryCopy';
import {
  buildWeeklySummarySource,
  formatWeekLabel,
} from '../../lib/weeklySummary';
import { reviewRepository } from '../../lib/reviewRepository';
import { tagRepository } from '../../lib/tagRepository';
import {
  type ReviewItem,
  type TagCatalog,
} from '../../lib/storage';
import { isSupabaseEnabled } from '../../lib/supabase/env';
import { useAppTheme } from '../../lib/theme-context';
import { createCardShadow } from '../../lib/theme';

const EMPTY_TAG_CATALOG: TagCatalog = {
  action: [],
  state: [],
};

export default function AnalyticsScreen() {
  const { theme, t, locale, localeTag } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const weeklyLabels = useMemo(() => getWeeklySummaryLabels(locale), [locale]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [tagCatalog, setTagCatalog] = useState<TagCatalog>(EMPTY_TAG_CATALOG);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isGeneratingWeeklySummary, setIsGeneratingWeeklySummary] = useState(false);
  const [isBreakdownVisible, setIsBreakdownVisible] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyAiSummaryResponse | null>(null);
  const [weeklySummaryError, setWeeklySummaryError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAnalyticsData = useCallback(async () => {
    setIsLoadingData(true);
    setLoadError(null);

    try {
      const [nextReviews, nextTagCatalog] = await Promise.all([
        reviewRepository.list(),
        tagRepository.getCatalog(),
      ]);
      setReviews(nextReviews);
      setTagCatalog(nextTagCatalog);
    } catch (error) {
      console.error('analytics load error:', error);
      setLoadError('分析データを読み込めませんでした。少し時間をおいて再読み込みしてください。');
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
  const weeklySource = useMemo(
    () => buildWeeklySummarySource(reviews, tagCatalog, new Date()),
    [reviews, tagCatalog]
  );
  const weeklyRangeLabel = useMemo(
    () => formatWeekLabel(weeklySource.weekStart, weeklySource.weekEnd),
    [weeklySource.weekEnd, weeklySource.weekStart]
  );
  const continuityMessage = useMemo(
    () => getContinuityMessage(locale, weeklySource.reviewCount),
    [locale, weeklySource.reviewCount]
  );

  useEffect(() => {
    setWeeklySummary(null);
    setWeeklySummaryError(null);
  }, [weeklySource.weekStart, weeklySource.reviewCount]);

  const handleGenerateWeeklySummary = useCallback(async () => {
    if (weeklySource.reviewCount === 0 || isGeneratingWeeklySummary) {
      return;
    }

    setIsGeneratingWeeklySummary(true);
    setWeeklySummaryError(null);

    try {
      const nextSummary = await generateWeeklyAiSummary(weeklySource);
      setWeeklySummary(nextSummary);
    } catch (error) {
      console.error('generateWeeklyAiSummary error:', error);
      if (error instanceof WeeklyAiSummaryError && error.code === 'backend-disabled') {
        setWeeklySummaryError(weeklyLabels.unavailable);
      } else {
        setWeeklySummaryError(weeklyLabels.error);
      }
    } finally {
      setIsGeneratingWeeklySummary(false);
    }
  }, [
    isGeneratingWeeklySummary,
    weeklyLabels.error,
    weeklyLabels.unavailable,
    weeklySource,
  ]);

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

        <WeeklySummaryCard
          continuityMessage={continuityMessage}
          generatedAt={weeklySummary?.generatedAt ?? null}
          isBackendEnabled={isSupabaseEnabled()}
          isLoading={isGeneratingWeeklySummary}
          labels={weeklyLabels}
          localeTag={localeTag}
          onGenerate={handleGenerateWeeklySummary}
          summary={weeklySummary}
          summaryError={weeklySummaryError}
          weekLabel={weeklyRangeLabel}
          weeklySource={weeklySource}
        />

        {isLoadingData ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>分析データを読み込んでいます</Text>
            <Text style={styles.emptyText}>記録件数や今週の要約を準備しています。</Text>
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
                  : '細かい内訳を見たいときだけ開けるようにしました。'}
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
                    title={t('analytics.categoryBreakdown')}
                    rows={analytics.categoryCounts}
                  />
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

function WeeklySummaryCard({
  continuityMessage,
  generatedAt,
  isBackendEnabled,
  isLoading,
  labels,
  localeTag,
  onGenerate,
  summary,
  summaryError,
  weekLabel,
  weeklySource,
}: {
  continuityMessage: string;
  generatedAt: string | null;
  isBackendEnabled: boolean;
  isLoading: boolean;
  labels: ReturnType<typeof getWeeklySummaryLabels>;
  localeTag: string;
  onGenerate: () => void;
  summary: WeeklyAiSummaryResponse | null;
  summaryError: string | null;
  weekLabel: string;
  weeklySource: ReturnType<typeof buildWeeklySummarySource>;
}) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const statItems = [
    { label: labels.countLabel, value: `${weeklySource.reviewCount}` },
    { label: labels.daysLabel, value: `${weeklySource.recordedDays}` },
    { label: labels.missingLabel, value: `${weeklySource.missingDays}` },
  ];

  return (
    <View style={styles.weeklyCard} testID="analytics-weekly-summary-card">
      <Text style={styles.weeklyEyebrow}>{weekLabel}</Text>
      <Text style={styles.weeklyTitle}>{labels.cardTitle}</Text>
      <Text style={styles.weeklySubtitle}>{labels.cardSubtitle}</Text>

      <View style={styles.weeklyStatsRow}>
        {statItems.map((item) => (
          <View key={item.label} style={styles.weeklyStatItem}>
            <Text style={styles.weeklyStatLabel}>{item.label}</Text>
            <Text style={styles.weeklyStatValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.weeklyContinuity}>{continuityMessage}</Text>
      {weeklySource.reviewCount > 0 && weeklySource.reviewCount <= 2 ? (
        <Text style={styles.weeklyHint}>
          記録が少ない週は、残せた内容をやさしく短くまとめます。
        </Text>
      ) : null}

      {weeklySource.reviewCount === 0 ? (
        <View style={styles.weeklyEmptyBox}>
          <Text style={styles.weeklyEmptyTitle}>{labels.emptyTitle}</Text>
          <Text style={styles.weeklyEmptyBody}>{labels.emptyBody}</Text>
        </View>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            disabled={isLoading || !isBackendEnabled}
            onPress={onGenerate}
            style={[
              styles.weeklyActionButton,
              (isLoading || !isBackendEnabled) && styles.weeklyActionButtonDisabled,
            ]}
          >
            <Text style={styles.weeklyActionButtonText}>
              {summary ? labels.regenerate : labels.generate}
            </Text>
          </Pressable>

          {!isBackendEnabled ? (
            <Text style={styles.weeklyHint}>{labels.unavailable}</Text>
          ) : null}

          {isLoading ? <Text style={styles.weeklyHint}>{labels.loading}</Text> : null}
          {summaryError ? (
            <View style={styles.weeklyRetryBlock}>
              <Text style={styles.weeklyError}>{summaryError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onGenerate}
                style={styles.weeklyRetryButton}
              >
                <Text style={styles.weeklyRetryButtonText}>もう一度試す</Text>
              </Pressable>
            </View>
          ) : null}

          {summary ? (
            <View style={styles.weeklySummaryBox}>
              <Text style={styles.weeklyHeadlineLabel}>{labels.headline}</Text>
              <Text style={styles.weeklyHeadline}>{summary.summary.headline}</Text>

              <SummarySection label={labels.pattern} value={summary.summary.pattern} />
              <SummarySection label={labels.positive} value={summary.summary.positive} />
              <SummarySection label={labels.nextAction} value={summary.summary.nextAction} />

              <Text style={styles.weeklyGeneratedAt}>
                {labels.lastUpdatedPrefix}{' '}
                {new Date(generatedAt ?? '').toLocaleString(localeTag)}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
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

function SummarySection({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.weeklySection}>
      <Text style={styles.weeklySectionLabel}>{label}</Text>
      <Text style={styles.weeklySectionBody}>{value}</Text>
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
    weeklyCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    weeklyEyebrow: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
      marginBottom: theme.spacing.sm,
    },
    weeklyTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: 6,
    },
    weeklySubtitle: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.md,
    },
    weeklyStatsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    weeklyStatItem: {
      flex: 1,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
    },
    weeklyStatLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: 4,
    },
    weeklyStatValue: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700',
      color: theme.colors.text,
    },
    weeklyContinuity: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    weeklyEmptyBox: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
    },
    weeklyEmptyTitle: {
      ...theme.typography.body,
      color: theme.colors.primaryDark,
      fontWeight: '700',
      marginBottom: 4,
    },
    weeklyEmptyBody: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    weeklyActionButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 14,
    },
    weeklyActionButtonDisabled: {
      opacity: 0.45,
    },
    weeklyActionButtonText: {
      color: theme.colors.white,
      fontSize: 15,
      fontWeight: '700',
    },
    weeklyHint: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.sm,
    },
    weeklyError: {
      ...theme.typography.caption,
      color: theme.colors.danger,
      marginBottom: theme.spacing.sm,
    },
    weeklyRetryBlock: {
      marginBottom: theme.spacing.sm,
    },
    weeklyRetryButton: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    weeklyRetryButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    weeklySummaryBox: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      marginTop: theme.spacing.sm,
    },
    weeklyHeadlineLabel: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
      marginBottom: 4,
    },
    weeklyHeadline: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    weeklySection: {
      marginBottom: theme.spacing.md,
    },
    weeklySectionLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: 4,
    },
    weeklySectionBody: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    weeklyGeneratedAt: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginTop: theme.spacing.xs,
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
