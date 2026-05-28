import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BackHeader from '../components/BackHeader';
import { useAppTheme } from '../lib/theme-context';
import { brand, createCardShadow } from '../lib/theme';
import { ensureAnonymousSession, getSupabaseUserId } from '../lib/supabase/auth';
import { isSupabaseEnabled } from '../lib/supabase/env';

export default function AboutScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [contactId, setContactId] = useState<string | null>(null);
  const [isLoadingContactId, setIsLoadingContactId] = useState(false);

  useEffect(() => {
    if (!isSupabaseEnabled()) {
      return;
    }

    let mounted = true;
    setIsLoadingContactId(true);

    void (async () => {
      try {
        const existingUserId = await getSupabaseUserId();
        if (existingUserId) {
          if (mounted) {
            setContactId(existingUserId);
          }
          return;
        }

        const session = await ensureAnonymousSession();
        if (mounted && session.status === 'ready') {
          setContactId(session.userId);
        }
      } catch (error) {
        console.error('load contact id error:', error);
      } finally {
        if (mounted) {
          setIsLoadingContactId(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCopyContactId = async () => {
    if (!contactId) {
      return;
    }

    await Clipboard.setStringAsync(contactId);
    Alert.alert('問い合わせIDをコピーしました');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackHeader
        title="このアプリについて"
        subtitle="書き続けやすさを優先した、軽い振り返りアプリです。"
      />

      <View style={styles.card}>
        <Text style={styles.brand}>{brand.name}</Text>
        <Text style={styles.title}>{brand.subtitle}</Text>
        <Text style={styles.body}>
          長い日記を書くよりも、毎日少しだけ振り返ることを大切にしています。
          「記録」「履歴」「分析」に絞って、迷わず使える形を目指しています。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>問い合わせID</Text>
        <Text style={styles.body}>
          クラウド保存データの削除を依頼するときに、このIDをメールに記載してください。
        </Text>
        <Text selectable style={styles.contactId}>
          {contactId ??
            (isLoadingContactId
              ? '読み込み中...'
              : 'クラウド保存が未設定です')}
        </Text>
        <Pressable
          style={[styles.copyButton, !contactId && styles.disabledButton]}
          onPress={handleCopyContactId}
          disabled={!contactId}
        >
          <Text style={styles.copyButtonText}>コピー</Text>
        </Pressable>
      </View>
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
    brand: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    contactId: {
      ...theme.typography.caption,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    copyButton: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 12,
    },
    copyButtonText: {
      ...theme.typography.caption,
      color: theme.colors.primaryDark,
    },
    disabledButton: {
      opacity: 0.5,
    },
  });
}
