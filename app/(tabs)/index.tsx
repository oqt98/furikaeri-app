import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../../components/AppHeader';
import SideMenu from '../../components/SideMenu';
import SwipeTabPage from '../../components/SwipeTabPage';
import { getMoodOption } from '../../data/reviewOptions';
import {
  formatImportantDayCountdown,
  getImportantDays,
  type ImportantDay,
} from '../../lib/importantDays';
import { buildInsightSummary } from '../../lib/insights';
import { getReviews, type ReviewItem } from '../../lib/storage';
import { useAppTheme } from '../../lib/theme-context';
import { brand, createCardShadow } from '../../lib/theme';

export default function RecordHomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [importantDays, setImportantDays] = useState<ImportantDay[]>([]);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([getReviews(), getImportantDays()]).then(
        ([nextReviews, nextImportantDays]) => {
          setReviews(nextReviews);
          setImportantDays(nextImportantDays);
        }
      );
    }, [])
  );

  const latestReview = reviews[0];
  const latestMood = latestReview?.mood ? getMoodOption(latestReview.mood) : null;
  const insight = useMemo(() => buildInsightSummary(reviews), [reviews]);
  const nextImportantDay = importantDays[0];
  const recordedToday = reviews.some((item) => isToday(item.createdAt));

  return (
    <SwipeTabPage tabKey="index">
      <ScrollView testID="screen-home" contentContainerStyle={styles.container}>
        <AppHeader
          title="記録"
          subtitle="迷わず書けて、あとから見返しやすく。"
          onOpenMenu={() => setIsMenuVisible(true)}
        />

        <View style={styles.heroCard}>
          <Text style={styles.brand}>{brand.name}</Text>
          <Text style={styles.heroTitle}>
            {recordedToday ? '今日はもう書けています' : '今日のふりかえりを始めましょう'}
          </Text>
          <Text style={styles.heroText}>
            長く書かなくても大丈夫です。ひとことでも、気分だけでも、今日を残せます。
          </Text>

          <Pressable
            testID="home-start-review-button"
            style={styles.primaryButton}
            onPress={() => router.push('/templates')}
          >
            <Text style={styles.primaryButtonText}>
              {recordedToday ? 'もう一度見直す / 追加する' : '記録をはじめる'}
            </Text>
          </Pressable>

          <View style={styles.helperRow}>
            <HintChip icon="time-outline" label="1〜3分で記録" />
            <HintChip icon="albums-outline" label="履歴から見返せる" />
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>最近の記録</Text>
            {latestReview ? (
              <>
                <Text style={styles.cardTitle}>{latestReview.templateName}</Text>
                <Text style={styles.cardBody}>
                  {new Date(latestReview.createdAt).toLocaleDateString('ja-JP')}
                  {latestMood ? ` ・ ${latestMood.emoji} ${latestMood.label}` : ''}
                </Text>
              </>
            ) : (
              <Text style={styles.cardBody}>まだ記録がありません。最初の1件を残してみましょう。</Text>
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>次に近い大切な日</Text>
            {nextImportantDay ? (
              <>
                <Text style={styles.cardTitle}>{nextImportantDay.name}</Text>
                <Text style={styles.cardBody}>
                  {nextImportantDay.type} ・ {formatImportantDayCountdown(nextImportantDay.date)}
                </Text>
              </>
            ) : (
              <Text style={styles.cardBody}>必要になったときだけ、サイドメニューから登録できます。</Text>
            )}
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.cardLabel}>今週のひとこと</Text>
          <Text style={styles.noteTitle}>{insight.weeklyTitle}</Text>
          <Text style={styles.noteBody}>{insight.weeklyBody}</Text>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name="sparkles-outline" size={18} color={theme.colors.primaryDark} />
          </View>
          <View style={styles.tipBody}>
            <Text style={styles.tipTitle}>{insight.nextTitle}</Text>
            <Text style={styles.tipText}>{insight.nextBody}</Text>
          </View>
        </View>
      </ScrollView>

      <SideMenu visible={isMenuVisible} onClose={() => setIsMenuVisible(false)} />
    </SwipeTabPage>
  );
}

function HintChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.helperChip}>
      <Ionicons name={icon} size={16} color={theme.colors.primaryDark} />
      <Text style={styles.helperChipText}>{label}</Text>
    </View>
  );
}

function isToday(isoDate: string) {
  const current = new Date();
  const target = new Date(isoDate);
  return (
    current.getFullYear() === target.getFullYear() &&
    current.getMonth() === target.getMonth() &&
    current.getDate() === target.getDate()
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
    heroCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xxl,
      marginBottom: theme.spacing.lg,
    },
    brand: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
      marginBottom: theme.spacing.sm,
    },
    heroTitle: {
      ...theme.typography.hero,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    heroText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xl,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.xl,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.white,
    },
    helperRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    helperChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
    },
    helperChipText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    grid: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    summaryCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
    },
    cardLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: theme.spacing.sm,
    },
    cardTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: 6,
    },
    cardBody: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    noteCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    noteTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    noteBody: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    tipCard: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
    },
    tipIcon: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    tipBody: {
      flex: 1,
    },
    tipTitle: {
      ...theme.typography.body,
      color: theme.colors.primaryDark,
      fontWeight: '700',
      marginBottom: 4,
    },
    tipText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
  });
}
