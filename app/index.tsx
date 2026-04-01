import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { templates } from '../data/templates';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>振り返りアプリ</Text>
      <Text style={styles.subtitle}>
        気分や目的に合わせて、振り返りの型を選ぶ
      </Text>

      <Text style={styles.sectionTitle}>テンプレを選ぶ</Text>

      {templates.map((template) => (
        <Link
          key={template.id}
          href={{
            pathname: '/entry',
            params: { templateId: template.id },
          }}
          asChild
        >
          <Pressable style={styles.card}>
            <Text style={styles.cardTitle}>{template.name}</Text>
            <Text style={styles.cardDesc}>{template.description}</Text>
            <Text style={styles.modeText}>🧭 {template.mode}</Text>
          </Pressable>
        </Link>
      ))}

      <Link
        href={{
          pathname: '/entry',
          params: { templateId: 'random' },
        }}
        asChild
      >
        <Pressable style={[styles.button, styles.primaryButton]}>
          <Text style={styles.primaryButtonText}>ランダムで選ぶ</Text>
        </Pressable>
      </Link>

      <Link href="/history" asChild>
        <Pressable style={[styles.button, styles.secondaryButton]}>
          <Text style={styles.secondaryButtonText}>履歴を見る</Text>
        </Pressable>
      </Link>
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
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e3e6eb',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  modeText: {
    fontSize: 12,
    color: '#2f6fed',
    fontWeight: '600',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#2f6fed',
  },
  secondaryButton: {
    backgroundColor: '#111',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});