import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../lib/theme-context';

type Props = {
  title: string;
  subtitle?: string;
  onOpenMenu?: () => void;
  rightSlot?: ReactNode;
};

export default function AppHeader({
  title,
  subtitle,
  onOpenMenu,
  rightSlot,
}: Props) {
  const { theme, t } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.openMenu')}
        testID="app-header-menu-button"
        style={styles.menuButton}
        onPress={onOpenMenu}
      >
        <Ionicons name="menu-outline" size={22} color={theme.colors.primaryDark} />
      </Pressable>

      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.rightSlot}>{rightSlot}</View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    menuButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textBlock: {
      flex: 1,
      gap: 4,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    rightSlot: {
      minWidth: 42,
      alignItems: 'flex-end',
    },
  });
}
