import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { getReviews, ReviewItem } from '../lib/storage';

export default function HistoryScreen() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  const loadReviews = async () => {
    const data = await getReviews();
    setReviews(data);
  };

  useEffect(() => {
    loadReviews();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>履歴</Text>
      <Text style={styles.subtitle}>これまでの振り返り一覧</Text>

      <Pressable style={styles.reloadButton} onPress={loadReviews}>
        <Text style={styles.reloadButtonText}>再読み込み</Text>
      </Pressable>

      {reviews.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>まだ保存された振り返りはありません。</Text>
        </View>
      ) : (
        reviews.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {item.templateName} / {item.category}
              </Text>
              {item.mood ? <Text style={styles.moodBadge}>{item.mood}</Text> : null}
            </View>

            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleString('ja-JP')}
            </Text>

            {Object.entries(item.answers).map(([key, value]) => (
              <View key={key} style={styles.answerBlock}>
                <Text style={styles.answerKey}>{key}</Text>
                <Text style={styles.answerValue}>{value || '（未入力）'}</Text>
              </View>
            ))}
          </View>
        ))
      )}

      <Link href="/" asChild>
        <Pressable style={styles.homeButton}>
          <Text style={styles.homeButtonText}>ホームへ戻る</Text>
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
    marginBottom: 16,
  },
  reloadButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dfe7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  reloadButtonText: {
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e6eb',
  },
  emptyText: {
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e3e6eb',
  },
  cardHeader: {
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  moodBadge: {
    alignSelf: 'flex-start',
    fontSize: 13,
    color: '#2f6fed',
    fontWeight: '700',
    backgroundColor: '#eef4ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  date: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  answerBlock: {
    marginBottom: 8,
  },
  answerKey: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  answerValue: {
    fontSize: 15,
    lineHeight: 20,
  },
  homeButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});