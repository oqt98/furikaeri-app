import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { setOnboardingCompleted } from '../lib/preferences';
import { useAppTheme } from '../lib/theme-context';
import { brand, createCardShadow } from '../lib/theme';

const STEPS = [
  {
    title: 'このアプリでできること',
    body: '毎日の振り返りを、短く気軽に残せます。履歴や分析で、あとから見返すのも簡単です。',
  },
  {
    title: '書くハードルを低くしています',
    body: '気分やタグだけでも記録できます。長文よりも、続けやすさを大切にしています。',
  },
  {
    title: 'まずは今日から始めましょう',
    body: '下のタブは「記録・履歴・分析」の3つだけ。迷わず毎日開けるようにしています。',
  },
];

export default function OnboardingScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const complete = async () => {
    await setOnboardingCompleted(true);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>{brand.name}</Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>

        <View style={styles.progressRow}>
          {STEPS.map((_, index) => (
            <View
              key={index}
              style={[styles.progressDot, index === stepIndex && styles.progressDotActive]}
            />
          ))}
        </View>

        <View style={styles.buttonGroup}>
          <Pressable style={styles.secondaryButton} onPress={() => void complete()}>
            <Text style={styles.secondaryButtonText}>スキップ</Text>
          </Pressable>

          {isLast ? (
            <Pressable style={styles.primaryButton} onPress={() => void complete()}>
              <Text style={styles.primaryButtonText}>はじめる</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.primaryButton}
              onPress={() => setStepIndex((current) => current + 1)}
            >
              <Text style={styles.primaryButtonText}>次へ</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
    },
    card: {
      ...createCardShadow(theme),
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xxxl,
    },
    brand: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xxl,
    },
    progressRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xxl,
    },
    progressDot: {
      width: 10,
      height: 10,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceStrong,
    },
    progressDotActive: {
      width: 28,
      backgroundColor: theme.colors.primary,
    },
    buttonGroup: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    primaryButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.xl,
      paddingVertical: 16,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.white,
    },
    secondaryButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.xl,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
  });
}
