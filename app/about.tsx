import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import BackHeader from '../components/BackHeader';
import { useAppTheme } from '../lib/theme-context';
import { brand, createCardShadow } from '../lib/theme';

export default function AboutScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackHeader
        title="このアプリについて"
        subtitle="書き続けやすさを優先した、軽い振り返りアプリです。"
      />

      <View style={styles.card}>
        <Text style={styles.brand}>{brand.name}</Text>
        <Text style={styles.title}>{brand.subtitle}</Text>
        <Text style={styles.body}>
          長い日記を書くよりも、毎日少しだけ振り返ることを大切にしています。
          「記録」「履歴」「分析」に絞って、迷わず使える形を目指しています。
        </Text>
      </View>
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
    card: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
    },
    brand: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
  });
}
