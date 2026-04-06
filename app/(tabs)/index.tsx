import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import SwipeTabPage from '../../components/SwipeTabPage';
import { getMoodOption } from '../../data/reviewOptions';
import { getReviews, type ReviewItem } from '../../lib/storage';
import { buildInsightSummary } from '../../lib/insights';
import { brand, cardShadow, theme } from '../../lib/theme';

export default function CreateHomeScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      void getReviews().then(setReviews);
    }, [])
  );

  const latestReview = reviews[0];
  const latestMood = latestReview?.mood ? getMoodOption(latestReview.mood) : null;
  const insight = useMemo(() => buildInsightSummary(reviews), [reviews]);

  return (
    <SwipeTabPage tabKey="index">
      <ScrollView testID="screen-home" contentContainerStyle={styles.container}>
        <Text style={styles.brand}>{brand.name}</Text>
        <Text style={styles.heroTitle}>{brand.subtitle}</Text>
        <Text style={styles.heroText}>
          長文に寄せすぎず、今日を軽く見返せる記録を残します。
        </Text>

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Today</Text>
            </View>
            <Text style={styles.heroHint}>テンプレートを選んで始める</Text>
          </View>

          <Text style={styles.heroCardTitle}>今日のふりかえりを作成</Text>
          <Text style={styles.heroCardText}>
            テンプレートは並び替えできます。よく使う順にしておくと最短で書けます。
          </Text>

          <Pressable
            testID="home-start-review-button"
            style={styles.primaryButton}
            onPress={() => router.push('/templates')}
          >
            <Text style={styles.primaryButtonText}>テンプレートを選ぶ</Text>
          </Pressable>
        </View>

        {latestReview ? (
          <View style={styles.latestCard}>
            <Text style={styles.sectionLabel}>Latest</Text>
            <Text style={styles.latestTitle}>直近の記録</Text>
            <View style={styles.latestMetaRow}>
              <Text style={styles.latestMeta}>{latestReview.templateName}</Text>
              {latestMood ? (
                <Text style={styles.latestMeta}>
                  {latestMood.emoji} {latestMood.label}
                </Text>
              ) : null}
            </View>
            <Text style={styles.latestBody}>
              {new Date(latestReview.createdAt).toLocaleDateString('ja-JP')}
            </Text>
          </View>
        ) : null}

        <View style={styles.insightCard}>
          <Text style={styles.sectionLabel}>Weekly note</Text>
          <Text style={styles.insightTitle}>{insight.weeklyTitle}</Text>
          <Text style={styles.insightText}>{insight.weeklyBody}</Text>

          <View style={styles.statsRow}>
            {insight.weeklyStats.map((item) => (
              <View key={item.label} style={styles.statCard}>
                <Text style={styles.statLabel}>{item.label}</Text>
                <Text style={styles.statValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.hintCard}>
          <Text style={styles.sectionLabel}>Next step</Text>
          <Text style={styles.hintTitle}>{insight.nextTitle}</Text>
          <Text style={styles.hintText}>{insight.nextBody}</Text>
        </View>
      </ScrollView>
    </SwipeTabPage>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    paddingBottom: 120,
  },
  brand: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    letterSpacing: 0.8,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  heroTitle: {
    ...theme.typography.hero,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  heroText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xxl,
  },
  heroCard: {
    ...cardShadow,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xxl,
    marginBottom: theme.spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  heroBadge: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  heroBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  heroHint: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
  },
  heroCardTitle: {
    ...theme.typography.section,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  heroCardText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xl,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.white,
  },
  latestCard: {
    ...cardShadow,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  latestTitle: {
    ...theme.typography.section,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  latestMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  latestMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  latestBody: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  insightCard: {
    ...cardShadow,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  insightTitle: {
    ...theme.typography.section,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  insightText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statCard: {
    minWidth: '31%',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  hintCard: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  hintTitle: {
    ...theme.typography.section,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.sm,
  },
  hintText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
});
