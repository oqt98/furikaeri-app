import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../lib/theme-context';
import { brand, createCardShadow, type ThemeName } from '../lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const MENU_ITEMS = [
  { key: 'menu.theme', icon: 'color-palette-outline', route: '/theme' as Href },
  { key: 'menu.language', icon: 'language-outline', route: '/language' as Href },
  { key: 'menu.onboarding', icon: 'school-outline' },
  { key: 'menu.importantDays', icon: 'heart-outline', route: '/important-days' as Href },
  {
    key: 'menu.notifications',
    icon: 'notifications-outline',
    route: '/notifications' as Href,
  },
  {
    key: 'menu.importExport',
    icon: 'swap-horizontal-outline',
    route: '/import-export' as Href,
  },
  { key: 'menu.about', icon: 'information-circle-outline', route: '/about' as Href },
] as const;

export default function SideMenu({ visible, onClose }: Props) {
  const router = useRouter();
  const { theme, themeName, reopenOnboarding, t } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => undefined}>
          <View style={styles.brandBox}>
            <Text style={styles.brandName}>{brand.name}</Text>
            <Text style={styles.brandSubtitle}>{t('brand.subtitle')}</Text>
            <Text style={styles.brandMeta}>
              {t('common.currentTheme')}: {themeLabel(themeName, t)}
            </Text>
          </View>

          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              testID={`side-menu-${item.key}`}
              style={styles.menuItem}
              onPress={() => {
                onClose();
                if (item.key === 'menu.onboarding') {
                  reopenOnboarding();
                  return;
                }

                router.push(item.route);
              }}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={18} color={theme.colors.primaryDark} />
                <Text style={styles.menuLabel}>{t(item.key)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSoft} />
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function themeLabel(
  themeName: ThemeName,
  t: ReturnType<typeof useAppTheme>['t']
) {
  switch (themeName) {
    case 'light':
      return t('theme.light.label');
    case 'warm':
      return t('theme.warm.label');
    case 'rose':
      return t('theme.rose.label');
    case 'amber':
      return t('theme.amber.label');
    case 'green':
      return t('theme.green.label');
    case 'mint':
      return t('theme.mint.label');
    case 'blue':
      return t('theme.blue.label');
    case 'navy':
      return t('theme.navy.label');
    default:
      return t('theme.light.label');
  }
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-start',
      paddingTop: 56,
    },
    panel: {
      ...createCardShadow(theme),
      width: '78%',
      maxWidth: 340,
      minHeight: '100%',
      backgroundColor: theme.colors.surface,
      borderTopRightRadius: theme.radius.xl,
      borderBottomRightRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    brandBox: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    brandName: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
      marginBottom: 4,
    },
    brandSubtitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    brandMeta: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      flex: 1,
    },
    menuLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
  });
}
