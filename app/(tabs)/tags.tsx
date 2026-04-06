import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import {
  createTag,
  getTagCatalog,
  setTagArchived,
} from '../../lib/storage';
import { cardShadow, theme } from '../../lib/theme';

type SectionProps = {
  title: string;
  type: TagType;
  tags: TagDefinition[];
  archivedTags: TagDefinition[];
  value: string;
  onChange: (value: string) => void;
  onCreate: () => void;
  onToggleArchive: (tagId: string, nextArchived: boolean) => void;
};

export default function TagsScreen() {
  const router = useRouter();
  const [actionValue, setActionValue] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [actionTags, setActionTags] = useState<TagDefinition[]>([]);
  const [stateTags, setStateTags] = useState<TagDefinition[]>([]);

  const load = useCallback(() => {
    void getTagCatalog().then((catalog) => {
      setActionTags(catalog.action);
      setStateTags(catalog.state);
    });
  }, []);

  useFocusEffect(load);

  const handleCreate = async (type: TagType, value: string) => {
    const created = await createTag(type, value);
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

  const handleToggleArchive = async (tagId: string, nextArchived: boolean) => {
    await setTagArchived(tagId, nextArchived);
    load();
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
            使わないタグは一覧から外せます。既存の記録は残ります。
          </Text>
        </View>
      </View>

      <TagSection
        title="行動タグ"
        type="action"
        tags={actionTags.filter((tag) => !tag.isArchived)}
        archivedTags={actionTags.filter((tag) => tag.isArchived)}
        value={actionValue}
        onChange={setActionValue}
        onCreate={() => {
          void handleCreate('action', actionValue);
        }}
        onToggleArchive={(tagId, nextArchived) => {
          void handleToggleArchive(tagId, nextArchived);
        }}
      />

      <TagSection
        title="状態タグ"
        type="state"
        tags={stateTags.filter((tag) => !tag.isArchived)}
        archivedTags={stateTags.filter((tag) => tag.isArchived)}
        value={stateValue}
        onChange={setStateValue}
        onCreate={() => {
          void handleCreate('state', stateValue);
        }}
        onToggleArchive={(tagId, nextArchived) => {
          void handleToggleArchive(tagId, nextArchived);
        }}
      />
    </ScrollView>
  );
}

function TagSection({
  title,
  tags,
  archivedTags,
  value,
  onChange,
  onCreate,
  onToggleArchive,
}: SectionProps) {
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

      <Text style={styles.groupLabel}>表示中</Text>
      <View style={styles.tagList}>
        {tags.map((tag) => (
          <View key={tag.id} style={styles.tagRow}>
            <Text style={styles.tagText}>{tag.label}</Text>
            <Pressable onPress={() => onToggleArchive(tag.id, true)}>
              <Text style={styles.archiveText}>一覧から外す</Text>
            </Pressable>
          </View>
        ))}
      </View>

      {archivedTags.length > 0 ? (
        <>
          <Text style={styles.groupLabel}>非表示</Text>
          <View style={styles.tagList}>
            {archivedTags.map((tag) => (
              <View key={tag.id} style={styles.tagRow}>
                <Text style={styles.tagText}>{tag.label}</Text>
                <Pressable onPress={() => onToggleArchive(tag.id, false)}>
                  <Text style={styles.restoreText}>戻す</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
    ...cardShadow,
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
  groupLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    marginBottom: theme.spacing.sm,
  },
  tagList: {
    gap: theme.spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
  },
  tagText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  archiveText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
  restoreText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
});
