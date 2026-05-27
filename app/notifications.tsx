import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import BackHeader from '../components/BackHeader';
import {
  cancelExistingReminderIfAny,
  configureReminderNotifications,
  ensureNotificationPermission,
  loadReminderSettings,
  saveReminderSettings,
  scheduleDailyReminder,
} from '../lib/reminderSettings';
import { useAppTheme } from '../lib/theme-context';
import { createCardShadow } from '../lib/theme';

configureReminderNotifications();

export default function NotificationsScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState('22');
  const [minute, setMinute] = useState('00');

  useFocusEffect(
    useCallback(() => {
      void loadReminderSettings().then((settings) => {
        setEnabled(settings.enabled);
        setHour(String(settings.hour).padStart(2, '0'));
        setMinute(String(settings.minute).padStart(2, '0'));
      });
    }, [])
  );

  const handleToggle = async (nextValue: boolean) => {
    try {
      if (nextValue) {
        const granted = await ensureNotificationPermission();
        if (!granted) {
          Alert.alert('通知の許可が必要です');
          return;
        }

        await scheduleDailyReminder(Number(hour), Number(minute));
      } else {
        await cancelExistingReminderIfAny();
      }

      await saveReminderSettings(nextValue, Number(hour), Number(minute));
      setEnabled(nextValue);
    } catch (error) {
      console.error(error);
      Alert.alert('通知設定の更新に失敗しました');
    }
  };

  const handleSaveTime = async () => {
    const nextHour = Number(hour);
    const nextMinute = Number(minute);

    if (
      !Number.isInteger(nextHour) ||
      nextHour < 0 ||
      nextHour > 23 ||
      !Number.isInteger(nextMinute) ||
      nextMinute < 0 ||
      nextMinute > 59
    ) {
      Alert.alert('時刻は 00:00 から 23:59 の範囲で入力してください');
      return;
    }

    await saveReminderSettings(enabled, nextHour, nextMinute);
    if (enabled) {
      await scheduleDailyReminder(nextHour, nextMinute);
    }
    Alert.alert('通知時刻を更新しました');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackHeader
        title="通知設定"
        subtitle="毎日のふりかえりを忘れないよう、端末の通知を設定できます。"
      />

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.flexFill}>
            <Text style={styles.cardTitle}>毎日のリマインド</Text>
            <Text style={styles.cardBody}>
              {enabled ? `${hour}:${minute} に通知します` : '現在はオフです'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(value) => {
              void handleToggle(value);
            }}
            trackColor={{ false: theme.colors.surfaceStrong, true: theme.colors.primarySoft }}
            thumbColor={enabled ? theme.colors.primary : theme.colors.surface}
          />
        </View>

        <View style={styles.timeRow}>
          <TextInput
            style={styles.timeInput}
            value={hour}
            onChangeText={setHour}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="22"
            placeholderTextColor={theme.colors.textSoft}
          />
          <Text style={styles.colon}>:</Text>
          <TextInput
            style={styles.timeInput}
            value={minute}
            onChangeText={setMinute}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="00"
            placeholderTextColor={theme.colors.textSoft}
          />
          <Pressable style={styles.saveButton} onPress={() => void handleSaveTime()}>
            <Text style={styles.saveButtonText}>保存</Text>
          </Pressable>
        </View>
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
    },
    flexFill: {
      flex: 1,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    cardTitle: {
      ...theme.typography.section,
      color: theme.colors.text,
      marginBottom: 4,
    },
    cardBody: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    timeInput: {
      width: 72,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 12,
      textAlign: 'center',
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    colon: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 12,
    },
    saveButtonText: {
      ...theme.typography.caption,
      color: theme.colors.white,
    },
  });
}
