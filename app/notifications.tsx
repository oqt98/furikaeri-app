import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import BackHeader from '../components/BackHeader';
import { useAppTheme } from '../lib/theme-context';
import { createCardShadow } from '../lib/theme';

const REMINDER_ENABLED_KEY = 'furikaeri-reminder-enabled';
const REMINDER_HOUR_KEY = 'furikaeri-reminder-hour';
const REMINDER_MINUTE_KEY = 'furikaeri-reminder-minute';
const REMINDER_NOTIFICATION_ID_KEY = 'furikaeri-reminder-notification-id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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
          Alert.alert('通知の許可が必要です。');
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
      Alert.alert('通知設定の更新に失敗しました。');
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
      Alert.alert('時刻は 00:00 から 23:59 の範囲で入力してください。');
      return;
    }

    await saveReminderSettings(enabled, nextHour, nextMinute);
    if (enabled) {
      await scheduleDailyReminder(nextHour, nextMinute);
    }
    Alert.alert('通知時刻を更新しました。');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackHeader
        title="通知設定"
        subtitle="毎日開きやすくするために、通知は最低限だけにしています。"
      />

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.flexFill}>
            <Text style={styles.cardTitle}>毎日のリマインド</Text>
            <Text style={styles.cardBody}>
              {enabled ? `${hour}:${minute} に通知します。` : '今はオフです。'}
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

async function loadReminderSettings() {
  const [enabledRaw, hourRaw, minuteRaw] = await Promise.all([
    AsyncStorage.getItem(REMINDER_ENABLED_KEY),
    AsyncStorage.getItem(REMINDER_HOUR_KEY),
    AsyncStorage.getItem(REMINDER_MINUTE_KEY),
  ]);

  return {
    enabled: enabledRaw === 'true',
    hour: hourRaw ? Number(hourRaw) : 22,
    minute: minuteRaw ? Number(minuteRaw) : 0,
  };
}

async function saveReminderSettings(enabled: boolean, hour: number, minute: number) {
  await Promise.all([
    AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(enabled)),
    AsyncStorage.setItem(REMINDER_HOUR_KEY, String(hour)),
    AsyncStorage.setItem(REMINDER_MINUTE_KEY, String(minute)),
  ]);
}

async function ensureNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'Furikaeri Reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return requested.granted;
}

async function cancelExistingReminderIfAny() {
  const existingId = await AsyncStorage.getItem(REMINDER_NOTIFICATION_ID_KEY);
  if (existingId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    } catch (error) {
      console.error(error);
    }
  }

  await AsyncStorage.removeItem(REMINDER_NOTIFICATION_ID_KEY);
}

async function scheduleDailyReminder(hour: number, minute: number) {
  await cancelExistingReminderIfAny();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ふりかえりの時間です',
      body: '今日はどんな1日だったか、ひとことだけでも残してみましょう。',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: 'daily-reminder' } : {}),
    },
  });

  await AsyncStorage.setItem(REMINDER_NOTIFICATION_ID_KEY, id);
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
