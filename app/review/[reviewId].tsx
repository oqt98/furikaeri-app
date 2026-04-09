import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import BackHeader from '../../components/BackHeader';
import { getMoodOption } from '../../data/reviewOptions';
import { getReviewById, getTagCatalog, type ReviewItem } from '../../lib/storage';
import { useAppTheme } from '../../lib/theme-context';
import { createCardShadow } from '../../lib/theme';

export default function ReviewDetailScreen() {
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [review, setReview] = useState<ReviewItem | null>(null);
  const [tagLabelMap, setTagLabelMap] = useState(new Map<string, string>());

  useEffect(() => {
    let active = true;

    void Promise.all([getReviewById(reviewId), getTagCatalog()]).then(([item, catalog]) => {
      if (!active) return;
      setReview(item);
      setTagLabelMap(new Map([...catalog.action, ...catalog.state].map((tag) => [tag.id, tag.label])));
    });

    return () => {
      active = false;
    };
  }, [reviewId]);

  if (!review) {
    return (
      <View style={styles.container}>
        <BackHeader title="記録詳細" subtitle="記録を読み込んでいます。" />
      </View>
    );
  }

  const mood = review.mood ? getMoodOption(review.mood) : null;
  const tags = [...review.actionTagIds, ...review.stateTagIds]
    .map((id) => tagLabelMap.get(id))
    .filter(Boolean) as string[];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackHeader title="記録詳細" subtitle="保存済みの内容を読みやすく確認できます。" />

      <View style={styles.card}>
        <Text style={styles.title}>{review.templateName}</Text>
        <Text style={styles.meta}>
          {new Date(review.createdAt).toLocaleString('ja-JP')}
          {mood ? ` ・ ${mood.emoji} ${mood.label}` : ''}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>カテゴリ</Text>
        <Text style={styles.body}>{review.category}</Text>
        {tags.length > 0 ? (
          <>
            <Text style={styles.label}>タグ</Text>
            <View style={styles.tagWrap}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>内容</Text>
        {Object.entries(review.answers ?? {})
          .filter(([, value]) => value.trim())
          .map(([key, value]) => (
            <View key={key} style={styles.answerBlock}>
              <Text style={styles.answerKey}>{key}</Text>
              <Text style={styles.body}>{value}</Text>
            </View>
          ))}
      </View>

      {review.photos.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.label}>写真</Text>
          {review.photos
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((photo) => (
              <View key={photo.id} style={styles.photoBlock}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                {photo.comment.trim() ? <Text style={styles.body}>{photo.comment}</Text> : null}
              </View>
            ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
      paddingBottom: 80,
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
    title: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    meta: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
    },
    label: {
      ...theme.typography.caption,
      color: theme.colors.textSoft,
      marginBottom: theme.spacing.sm,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    tagWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    tagChip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
    },
    tagText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    answerBlock: {
      marginBottom: theme.spacing.sm,
    },
    answerKey: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
      marginBottom: 4,
    },
    photoBlock: {
      marginTop: theme.spacing.sm,
    },
    photo: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surfaceMuted,
      marginBottom: theme.spacing.sm,
    },
  });
}
