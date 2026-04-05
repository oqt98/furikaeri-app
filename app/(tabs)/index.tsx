import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SwipeTabPage from '../../components/SwipeTabPage';
import { templates } from '../../data/templates';

export default function CreateHomeScreen() {
  const router = useRouter();
  const [showTemplates, setShowTemplates] = useState(false);

  const handleStart = () => {
    setShowTemplates(true);
  };

  const handleSelectTemplate = (templateId: string) => {
    router.push({
      pathname: '/entry',
      params: { templateId },
    });
  };

  const handleRandom = () => {
    router.push({
      pathname: '/entry',
      params: { templateId: 'random' },
    });
  };

  return (
    <SwipeTabPage tabKey="index">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>振り返りアプリ</Text>
        <Text style={styles.subtitle}>
          今日の出来事や気分を、気軽に残そう。
        </Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>今日の振り返りを始める</Text>
          <Text style={styles.heroText}>
            テンプレを選んで、仕事もプラベもサクッと記録できます。
          </Text>

          <Pressable style={styles.primaryButton} onPress={handleStart}>
            <Text style={styles.primaryButtonText}>
              {showTemplates ? 'テンプレを選んでください' : '振り返りを始める'}
            </Text>
          </Pressable>
        </View>

        {showTemplates ? (
          <View style={styles.templateSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>テンプレ一覧</Text>

              <Pressable style={styles.randomButton} onPress={handleRandom}>
                <Text style={styles.randomButtonText}>おまかせ</Text>
              </Pressable>
            </View>

            {templates.map((template) => (
              <Pressable
                key={template.id}
                style={styles.templateCard}
                onPress={() => handleSelectTemplate(template.id)}
              >
                <View style={styles.templateTopRow}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateArrow}>›</Text>
                </View>

                <Text style={styles.templateDescription}>
                  {template.description}
                </Text>

                <Text style={styles.templateMode}>🧭 {template.mode}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>使えるテンプレ</Text>
            <Text style={styles.guideText}>
              一言日記 / KPT / YWT / よかったこと3つ など
            </Text>
          </View>
        )}
      </ScrollView>
    </SwipeTabPage>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f7f8fa',
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e3e6eb',
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  guideCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e6eb',
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  guideText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  templateSection: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  randomButton: {
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#bfd3ff',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  randomButtonText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '700',
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e6eb',
    marginBottom: 12,
  },
  templateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  templateArrow: {
    fontSize: 24,
    color: '#999',
    fontWeight: '400',
    marginTop: -2,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  templateMode: {
    fontSize: 13,
    color: '#2f6fed',
    fontWeight: '600',
  },
});