import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TagDefinition, TagType } from '../../data/tags';
import { tagRepository } from '../../lib/tagRepository';
import { useAppTheme } from '../../lib/theme-context';
import { createCardShadow } from '../../lib/theme';

type SectionProps = {
  title: string;
  tags: TagDefinition[];
  value: string;
  onChange: (value: string) => void;
  onCreate: () => void;
  onMove: (tagId: string, direction: 'up' | 'down') => void;
  onDelete: (tag: TagDefinition) => void;
};

export default function TagsScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [actionValue, setActionValue] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [actionTags, setActionTags] = useState<TagDefinition[]>([]);
  const [stateTags, setStateTags] = useState<TagDefinition[]>([]);

  const load = useCallback(() => {
    void tagRepository.getCatalog().then((catalog) => {
      setActionTags(catalog.action.filter((tag) => !tag.isArchived));
      setStateTags(catalog.state.filter((tag) => !tag.isArchived));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleCreate = async (type: TagType, value: string) => {
    const created = await tagRepository.create(type, value);
    if (!created) {
      Alert.alert('タグ名を入力してください');
      return;
    }

    if (type === 'action') {
      setActionValue('');
    } else {
      setStateValue('');
    }

    load();
  };

  const handleMove = async (type: TagType, tagId: string, direction: 'up' | 'down') => {
    const source = type === 'action' ? actionTags : stateTags;
    const index = source.findIndex((tag) => tag.id === tagId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= source.length) return;

    const next = [...source];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    if (type === 'action') {
      setActionTags(next);
    } else {
      setStateTags(next);
    }

    await tagRepository.reorder(type, next.map((tag) => tag.id));
  };

  const handleDelete = (tag: TagDefinition) => {
    Alert.alert('タグを削除しますか？', `「${tag.label}」を削除します。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: () => {
          void tagRepository.remove(tag.id).then(load);
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.primaryDark} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>タグ管理</Text>
          <Text style={styles.subtitle}>
            並び順は保存され、作成画面にもすぐ反映されます。
          </Text>
        </View>
      </View>

      <TagSection
        title="行動タグ"
        tags={actionTags}
        value={actionValue}
        onChange={setActionValue}
        onCreate={() => {
          void handleCreate('action', actionValue);
        }}
        onMove={(tagId, direction) => {
          void handleMove('action', tagId, direction);
        }}
        onDelete={handleDelete}
      />

      <TagSection
        title="気分タグ"
        tags={stateTags}
        value={stateValue}
        onChange={setStateValue}
        onCreate={() => {
          void handleCreate('state', stateValue);
        }}
        onMove={(tagId, direction) => {
          void handleMove('state', tagId, direction);
        }}
        onDelete={handleDelete}
      />

      {returnTo === 'entry' ? (
        <Pressable style={styles.returnButton} onPress={() => router.back()}>
          <Text style={styles.returnButtonText}>作成画面に戻る</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function TagSection({
  title,
  tags,
  value,
  onChange,
  onCreate,
  onMove,
  onDelete,
}: SectionProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={`${title}を追加`}
          placeholderTextColor={theme.colors.textSoft}
        />
        <Pressable style={styles.addButton} onPress={onCreate}>
          <Text style={styles.addButtonText}>追加</Text>
        </Pressable>
      </View>

      <View style={styles.tagList}>
        {tags.length === 0 ? (
          <Text style={styles.emptyText}>タグはまだありません。</Text>
        ) : (
          tags.map((tag, index) => (
            <View key={tag.id} style={styles.tagRow}>
              <Text style={styles.tagText}>{tag.label}</Text>
              <View style={styles.actions}>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => onMove(tag.id, 'up')}
                  disabled={index === 0}
                >
                  <Ionicons
                    name="chevron-up"
                    size={16}
                    color={index === 0 ? theme.colors.textSoft : theme.colors.primaryDark}
                  />
                </Pressable>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => onMove(tag.id, 'down')}
                  disabled={index === tags.length - 1}
                >
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={
                      index === tags.length - 1 ? theme.colors.textSoft : theme.colors.primaryDark
                    }
                  />
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={() => onDelete(tag)}>
                  <Text style={styles.deleteText}>削除</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
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
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
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
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    card: {
      ...createCardShadow(theme),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    addRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 12,
      color: theme.colors.text,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      justifyContent: 'center',
    },
    addButtonText: {
      ...theme.typography.caption,
      color: theme.colors.white,
    },
    tagList: {
      gap: theme.spacing.sm,
    },
    emptyText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    tagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 12,
      gap: theme.spacing.sm,
    },
    tagText: {
      ...theme.typography.body,
      color: theme.colors.text,
      flex: 1,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    deleteButton: {
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
    },
    deleteText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
    returnButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.xl,
      alignItems: 'center',
      paddingVertical: 16,
      marginTop: theme.spacing.sm,
    },
    returnButtonText: {
      ...theme.typography.body,
      color: theme.colors.white,
      fontWeight: '700',
    },
  });
}
