import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BackHeader from '../../components/BackHeader';
import { type ReviewTemplate } from '../../data/templates';
import { getOrderedTemplates, getTemplateOrder } from '../../lib/storage';
import { useAppTheme } from '../../lib/theme-context';
import { createCardShadow } from '../../lib/theme';

export default function TemplatesScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState<ReviewTemplate[]>([]);

  useFocusEffect(
    useCallback(() => {
      void getTemplateOrder().then((order) => setItems(getOrderedTemplates(order)));
    }, [])
  );

  const handleSelectTemplate = (templateId?: string) => {
    router.push({
      pathname: '/entry',
      params: date ? { templateId, date } : { templateId },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackHeader
        title="テンプレートを選ぶ"
        subtitle="その日の気分に合わせて、書きやすい形を選べます。"
      />

      <Pressable style={styles.quickCard} onPress={() => handleSelectTemplate(items[0]?.id)}>
        <View style={styles.quickText}>
          <Text style={styles.quickTitle}>まずはシンプルに記録</Text>
          <Text style={styles.quickBody}>迷ったら最初のテンプレートから始められます。</Text>
        </View>
        <Ionicons name="flash-outline" size={20} color={theme.colors.primaryDark} />
      </Pressable>

      {items.map((item) => (
        <Pressable
          key={item.id}
          style={styles.templateCard}
          onPress={() => handleSelectTemplate(item.id)}
        >
          <View style={styles.templateHeader}>
            <Text style={styles.templateTitle}>{item.name}</Text>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>{item.mode}</Text>
            </View>
          </View>
          <Text style={styles.templateDescription}>{item.description}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
      paddingBottom: 96,
    },
    quickCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    quickText: {
      flex: 1,
    },
    quickTitle: {
      ...theme.typography.section,
      color: theme.colors.primaryDark,
      marginBottom: theme.spacing.sm,
    },
    quickBody: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    templateCard: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    templateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    templateTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      flex: 1,
    },
    modeBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    modeBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    templateDescription: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
  });
}
