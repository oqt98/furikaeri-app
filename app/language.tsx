import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BackHeader from '../components/BackHeader';
import { useAppTheme } from '../lib/theme-context';
import type { AppLocale } from '../lib/appPreferencesRepository';
import { createCardShadow } from '../lib/theme';

const LANGUAGE_OPTIONS: AppLocale[] = ['ja', 'en'];

export default function LanguageScreen() {
  const { theme, locale, setLocale, t } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackHeader title={t('language.title')} subtitle={t('language.subtitle')} />

      {LANGUAGE_OPTIONS.map((option) => {
        const selected = option === locale;
        return (
          <Pressable
            key={option}
            style={[styles.optionCard, selected && styles.optionCardActive]}
            onPress={() => {
              void setLocale(option);
            }}
          >
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>
                {option === 'ja' ? t('language.ja') : t('language.en')}
              </Text>
              <Text style={styles.optionBody}>
                {selected ? t('common.select') : ' '}
              </Text>
            </View>
            {selected ? (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={theme.colors.primaryDark}
              />
            ) : (
              <Ionicons
                name="ellipse-outline"
                size={22}
                color={theme.colors.textSoft}
              />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
      paddingBottom: 80,
    },
    optionCard: {
      ...createCardShadow(theme),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    optionCardActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    optionText: {
      flex: 1,
    },
    optionTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    optionBody: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      minHeight: 22,
    },
  });
}
