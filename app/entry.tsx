import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TAGS } from '../data/tags';
import { templates } from '../data/templates';
import { saveReview } from '../lib/storage';

const moods = [
  '😊 うれしい',
  '😌 おだやか',
  '🤔 ふつう',
  '😓 つかれた',
  '😢 落ち込み',
] as const;

const categories = ['仕事', 'プラベ'] as const;

export default function EntryScreen() {
  const { templateId } = useLocalSearchParams();

  const [category, setCategory] = useState<(typeof categories)[number]>('仕事');
  const [mood, setMood] = useState<(typeof moods)[number]>('🤔 ふつう');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const selectedTemplate = useMemo(() => {
    const raw = Array.isArray(templateId) ? templateId[0] : templateId;

    if (raw === 'random') {
      return templates[Math.floor(Math.random() * templates.length)];
    }

    return templates.find((t) => t.id === raw) ?? templates[0];
  }, [templateId]);

  const updateAnswer = (fieldKey: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handleSave = async () => {
    const hasAnyInput = Object.values(answers).some((value) => value?.trim());

    if (!hasAnyInput) {
      Alert.alert('未入力です', '1つ以上入力してから保存してください。');
      return;
    }

    try {
      await saveReview({
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category,
        mood,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        tags: selectedTags,
        answers,
      });

      Alert.alert('保存しました');
      router.push('/history');
    } catch (error) {
      console.error(error);
      Alert.alert('保存に失敗しました');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{selectedTemplate.name}</Text>
      <Text style={styles.subtitle}>{selectedTemplate.description}</Text>

      <Text style={styles.modeText}>🧭 {selectedTemplate.mode}</Text>

      <Text style={styles.label}>今日の気分</Text>
      <View style={styles.wrapRow}>
        {moods.map((item) => (
          <Pressable
            key={item}
            style={[styles.chip, mood === item && styles.chipActive]}
            onPress={() => setMood(item)}
          >
            <Text
              style={[
                styles.chipText,
                mood === item && styles.chipTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>カテゴリ</Text>
      <View style={styles.row}>
        {categories.map((item) => (
          <Pressable
            key={item}
            style={[styles.chip, category === item && styles.chipActive]}
            onPress={() => setCategory(item)}
          >
            <Text
              style={[
                styles.chipText,
                category === item && styles.chipTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>タグ</Text>
      <View style={styles.wrapRow}>
        {TAGS.map((tag) => {
          const selected = selectedTags.includes(tag);

          return (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[styles.tagChip, selected && styles.tagChipActive]}
            >
              <Text
                style={[
                  styles.tagChipText,
                  selected && styles.tagChipTextActive,
                ]}
              >
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedTemplate.fields.map((field) => (
        <View key={field.key} style={styles.fieldBlock}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            style={[
              styles.input,
              field.multiline ? styles.textarea : undefined,
            ]}
            placeholder={field.label}
            multiline={field.multiline ?? false}
            value={answers[field.key] ?? ''}
            onChangeText={(text) => updateAnswer(field.key, text)}
            textAlignVertical="top"
          />
        </View>
      ))}

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>保存する</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f7f8fa',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  modeText: {
    fontSize: 13,
    color: '#2f6fed',
    fontWeight: '600',
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cfd6df',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  chipActive: {
    backgroundColor: '#2f6fed',
    borderColor: '#2f6fed',
  },
  chipText: {
    color: '#333',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  tagChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cfd6df',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tagChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  tagChipText: {
    color: '#333',
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: '#3730A3',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dfe7',
    borderRadius: 12,
    padding: 12,
  },
  textarea: {
    minHeight: 90,
  },
  saveButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});