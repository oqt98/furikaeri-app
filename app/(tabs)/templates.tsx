import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getOrderedTemplates, getTemplateOrder, saveTemplateOrder } from '../../lib/storage';
import { brand, cardShadow, theme } from '../../lib/theme';
import type { ReviewTemplate } from '../../data/templates';

export default function TemplatesScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [items, setItems] = useState<ReviewTemplate[]>([]);

  useFocusEffect(
    useCallback(() => {
      void getTemplateOrder().then((order) => setItems(getOrderedTemplates(order)));
    }, [])
  );

  const handleSelect = (templateId: string) => {
    router.push({
      pathname: '/entry',
      params: date ? { templateId, date } : { templateId },
    });
  };

  const handleRandom = () => {
    router.push({
      pathname: '/entry',
      params: date ? { templateId: 'random', date } : { templateId: 'random' },
    });
  };

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<ReviewTemplate>) => (
    <ScaleDecorator>
      <Pressable
        testID={`template-card-${item.id}`}
        onPress={() => handleSelect(item.id)}
        style={[styles.templateCard, isActive && styles.activeCard]}
      >
        <View style={styles.templateHeader}>
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>{item.mode}</Text>
          </View>
          <Pressable style={styles.dragButton} onLongPress={drag}>
            <Ionicons name="reorder-three-outline" size={20} color={theme.colors.textSoft} />
          </Pressable>
        </View>

        <Text style={styles.templateName}>{item.name}</Text>
        <Text style={styles.templateDescription}>{item.description}</Text>
      </Pressable>
    </ScaleDecorator>
  );

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => {
          setItems(data);
          void saveTemplateOrder(data.map((item) => item.id));
        }}
        contentContainerStyle={styles.content}
        activationDistance={16}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Pressable style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.primaryDark} />
              </Pressable>
              <View style={styles.headerText}>
                <Text style={styles.brand}>{brand.name}</Text>
                <Text style={styles.title}>テンプレートを選ぶ</Text>
                <Text style={styles.subtitle}>
                  長押しドラッグで並び替えできます。順番は次回も維持されます。
                </Text>
              </View>
            </View>

            <Pressable testID="templates-random-button" style={styles.randomCard} onPress={handleRandom}>
              <View>
                <Text style={styles.randomTitle}>おまかせで選ぶ</Text>
                <Text style={styles.randomText}>
                  迷う日はランダムで 1 つ選びます。
                </Text>
              </View>
              <Ionicons name="shuffle-outline" size={20} color={theme.colors.primaryDark} />
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.xl,
    paddingBottom: 120,
  },
  header: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  brand: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  randomCard: {
    ...cardShadow,
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
  randomTitle: {
    ...theme.typography.section,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.sm,
  },
  randomText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  templateCard: {
    ...cardShadow,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  activeCard: {
    opacity: 0.9,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
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
  dragButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  templateDescription: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
});
