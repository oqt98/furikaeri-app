import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../lib/theme-context';
import { brand, createCardShadow, type ThemeName } from '../lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const MENU_ITEMS = [
  { label: 'テーマ', icon: 'color-palette-outline', route: '/theme' },
  { label: '大切な日', icon: 'heart-outline', route: '/important-days' },
  { label: '通知設定', icon: 'notifications-outline', route: '/notifications' },
  { label: 'インポート / エクスポート', icon: 'swap-horizontal-outline', route: '/import-export' },
  { label: 'このアプリについて', icon: 'information-circle-outline', route: '/about' },
] as const;

export default function SideMenu({ visible, onClose }: Props) {
  const router = useRouter();
  const { theme, themeName } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => undefined}>
          <View style={styles.brandBox}>
            <Text style={styles.brandName}>{brand.name}</Text>
            <Text style={styles.brandSubtitle}>{brand.subtitle}</Text>
            <Text style={styles.brandMeta}>現在のテーマ: {themeLabel(themeName)}</Text>
          </View>

          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.route}
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push(item.route);
              }}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={18} color={theme.colors.primaryDark} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSoft} />
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function themeLabel(themeName: ThemeName) {
  switch (themeName) {
    case 'light':
      return 'ライト';
    case 'warm':
      return 'ウォーム';
    case 'rose':
      return 'ローズ';
    case 'amber':
      return 'アンバー';
    case 'green':
      return 'グリーン';
    case 'mint':
      return 'ミント';
    case 'blue':
      return 'ブルー';
    case 'navy':
      return 'ネイビー';
    default:
      return 'ライト';
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
