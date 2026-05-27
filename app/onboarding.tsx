import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAppTheme } from '../lib/theme-context';
import { brand, createCardShadow } from '../lib/theme';

const SWIPE_DISTANCE = 64;

export default function OnboardingScreen() {
  const { theme, t, completeOnboarding } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    {
      title: t('onboarding.step1.title'),
      body: t('onboarding.step1.body'),
    },
    {
      title: t('onboarding.step2.title'),
      body: t('onboarding.step2.body'),
    },
    {
      title: t('onboarding.step3.title'),
      body: t('onboarding.step3.body'),
    },
  ];

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const goNext = () => {
    if (isLast) {
      void completeOnboarding();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const goBack = () => {
    if (isFirst) return;
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const swipeGesture = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((event) => {
      if (event.translationX <= -SWIPE_DISTANCE) {
        goNext();
        return;
      }

      if (event.translationX >= SWIPE_DISTANCE) {
        goBack();
      }
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.brand}>{brand.name}</Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>

          <View style={styles.progressRow}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[styles.progressDot, index === stepIndex && styles.progressDotActive]}
              />
            ))}
          </View>

          <View style={styles.buttonGroup}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                void completeOnboarding();
              }}
            >
              <Text style={styles.secondaryButtonText}>{t('onboarding.skip')}</Text>
            </Pressable>

            <Pressable
              style={[styles.ghostButton, isFirst && styles.ghostButtonDisabled]}
              onPress={goBack}
              disabled={isFirst}
            >
              <Text
                style={[
                  styles.ghostButtonText,
                  isFirst && styles.ghostButtonTextDisabled,
                ]}
              >
                {t('onboarding.back')}
              </Text>
            </Pressable>

            <Pressable style={styles.primaryButton} onPress={goNext}>
              <Text style={styles.primaryButtonText}>
                {isLast ? t('onboarding.finish') : t('onboarding.next')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </GestureDetector>
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
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
    ghostButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    ghostButtonDisabled: {
      backgroundColor: theme.colors.surfaceMuted,
      opacity: 0.55,
    },
    ghostButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    ghostButtonTextDisabled: {
      color: theme.colors.textSoft,
    },
  });
}
