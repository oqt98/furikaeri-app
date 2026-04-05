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
  View,
} from 'react-native';
import SwipeTabPage from '../../components/SwipeTabPage';
import { TAGS } from '../../data/tags';
import { templates } from '../../data/templates';
import { clearAllReviews, getReviews, ReviewItem } from '../../lib/storage';

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

export default function SettingsScreen() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isClearing, setIsClearing] = useState(false);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(22);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  const loadReviews = async () => {
    const data = await getReviews();
    setReviews(data);
  };

  const loadReminderSettings = async () => {
    try {
      const [enabledRaw, hourRaw, minuteRaw] = await Promise.all([
        AsyncStorage.getItem(REMINDER_ENABLED_KEY),
        AsyncStorage.getItem(REMINDER_HOUR_KEY),
        AsyncStorage.getItem(REMINDER_MINUTE_KEY),
      ]);

      setReminderEnabled(enabledRaw === 'true');
      setReminderHour(hourRaw ? Number(hourRaw) : 22);
      setReminderMinute(minuteRaw ? Number(minuteRaw) : 0);
    } catch (error) {
      console.error(error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
      void loadReminderSettings();
    }, [])
  );

  const analytics = useMemo(() => {
    const totalReviews = reviews.length;

    const totalRecordedDays = new Set(
      reviews.map((item) => toDateKey(new Date(item.createdAt)))
    ).size;

    const favoriteCount = reviews.filter((item) => item.isFavorite).length;
    const photoCount = reviews.filter((item) => item.photoUri).length;

    return {
      totalReviews,
      totalRecordedDays,
      templateCount: templates.length,
      tagCount: TAGS.length,
      favoriteCount,
      photoCount,
    };
  }, [reviews]);

  const confirmClearAll = () => {
    Alert.alert(
      '全データを削除しますか？',
      '保存済みの振り返りがすべて削除されます。この操作は元に戻せません。',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            void handleClearAll();
          },
        },
      ]
    );
  };

  const handleClearAll = async () => {
    try {
      setIsClearing(true);
      await clearAllReviews();
      await loadReviews();
      Alert.alert('削除しました', '保存済みの振り返りをすべて削除しました。');
    } catch (error) {
      console.error(error);
      Alert.alert('削除に失敗しました', '時間をおいてもう一度お試しください。');
    } finally {
      setIsClearing(false);
    }
  };

  const saveReminderSettings = async (
    enabled: boolean,
    hour: number,
    minute: number
  ) => {
    await Promise.all([
      AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(enabled)),
      AsyncStorage.setItem(REMINDER_HOUR_KEY, String(hour)),
      AsyncStorage.setItem(REMINDER_MINUTE_KEY, String(minute)),
    ]);
  };

  const getStoredReminderNotificationId = async () => {
    return AsyncStorage.getItem(REMINDER_NOTIFICATION_ID_KEY);
  };

  const setStoredReminderNotificationId = async (id: string) => {
    await AsyncStorage.setItem(REMINDER_NOTIFICATION_ID_KEY, id);
  };

  const clearStoredReminderNotificationId = async () => {
    await AsyncStorage.removeItem(REMINDER_NOTIFICATION_ID_KEY);
  };

  const cancelExistingReminderIfAny = async () => {
    const existingId = await getStoredReminderNotificationId();

    if (existingId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(existingId);
      } catch (error) {
        console.error(error);
      }
    }

    await clearStoredReminderNotificationId();
  };

  const ensureNotificationPermission = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-reminder', {
        name: 'Daily Reminder',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const current = await Notifications.getPermissionsAsync();

    if (current.granted) {
      return true;
    }

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return requested.granted;
  };

  const scheduleDailyReminder = async (hour: number, minute: number) => {
    await cancelExistingReminderIfAny();

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '日記を書く時間だよ！',
        body: '今日もお疲れさま。軽く振り返ろう。',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: 'daily-reminder' } : {}),
      },
    });

    await setStoredReminderNotificationId(notificationId);
  };

  const handleToggleReminder = async (nextValue: boolean) => {
    try {
      setIsSavingReminder(true);

      if (nextValue) {
        const granted = await ensureNotificationPermission();

        if (!granted) {
          Alert.alert(
            '通知を有効にできません',
            '端末の通知権限を許可してください。'
          );
          return;
        }

        await scheduleDailyReminder(reminderHour, reminderMinute);
        await saveReminderSettings(true, reminderHour, reminderMinute);
        setReminderEnabled(true);

        Alert.alert(
          'リマインドを設定しました',
          `${formatTime(reminderHour, reminderMinute)} に毎日通知します。`
        );
      } else {
        await cancelExistingReminderIfAny();
        await saveReminderSettings(false, reminderHour, reminderMinute);
        setReminderEnabled(false);

        Alert.alert('リマインドをOFFにしました');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('通知設定の更新に失敗しました');
    } finally {
      setIsSavingReminder(false);
    }
  };

  const applyReminderTime = async (hour: number, minute: number) => {
    try {
      setIsSavingReminder(true);

      await saveReminderSettings(reminderEnabled, hour, minute);
      setReminderHour(hour);
      setReminderMinute(minute);

      if (reminderEnabled) {
        const granted = await ensureNotificationPermission();

        if (!granted) {
          Alert.alert(
            '通知を更新できません',
            '端末の通知権限を許可してください。'
          );
          return;
        }

        await scheduleDailyReminder(hour, minute);
        Alert.alert(
          '通知時刻を更新しました',
          `${formatTime(hour, minute)} に毎日通知します。`
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('通知時刻の更新に失敗しました');
    } finally {
      setIsSavingReminder(false);
    }
  };

  const adjustReminderHour = async (delta: number) => {
    const nextHour = (reminderHour + delta + 24) % 24;
    await applyReminderTime(nextHour, reminderMinute);
  };

  const adjustReminderMinute = async (delta: number) => {
    const total = reminderHour * 60 + reminderMinute + delta;
    const wrapped = (total + 24 * 60) % (24 * 60);
    const nextHour = Math.floor(wrapped / 60);
    const nextMinute = wrapped % 60;

    await applyReminderTime(nextHour, nextMinute);
  };

  const applyQuickTimePreset = async (hour: number, minute: number) => {
    await applyReminderTime(hour, minute);
  };

  return (
    <SwipeTabPage tabKey="settings">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>設定</Text>
        <Text style={styles.subtitle}>データやアプリの基本情報を確認できます</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>現在のデータ</Text>

          <View style={styles.summaryGrid}>
            <SummaryCard label="保存件数" value={`${analytics.totalReviews}件`} />
            <SummaryCard label="記録日数" value={`${analytics.totalRecordedDays}日`} />
            <SummaryCard label="テンプレ数" value={`${analytics.templateCount}個`} />
            <SummaryCard label="タグ数" value={`${analytics.tagCount}個`} />
            <SummaryCard label="お気に入り" value={`${analytics.favoriteCount}件`} />
            <SummaryCard label="写真付き" value={`${analytics.photoCount}件`} />
          </View>

          <Pressable style={styles.reloadButton} onPress={loadReviews}>
            <Text style={styles.reloadButtonText}>再読み込み</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>通知リマインド</Text>
          <Text style={styles.sectionDescription}>
            毎日決まった時間に、振り返りを書く通知を出します。
          </Text>

          <View style={styles.reminderToggleRow}>
            <View style={styles.reminderToggleTextArea}>
              <Text style={styles.reminderToggleTitle}>毎日リマインド</Text>
              <Text style={styles.reminderToggleSubText}>
                {reminderEnabled
                  ? `${formatTime(reminderHour, reminderMinute)} に通知`
                  : '現在はOFFです'}
              </Text>
            </View>

            <Switch
              value={reminderEnabled}
              onValueChange={(value) => {
                void handleToggleReminder(value);
              }}
              disabled={isSavingReminder}
            />
          </View>

          <View style={styles.timeEditorCard}>
            <Text style={styles.timeEditorLabel}>通知時刻</Text>

            <View style={styles.timeRow}>
              <TimeAdjuster
                label="時"
                value={`${String(reminderHour).padStart(2, '0')}`}
                onMinus={() => {
                  void adjustReminderHour(-1);
                }}
                onPlus={() => {
                  void adjustReminderHour(1);
                }}
                disabled={isSavingReminder}
              />

              <Text style={styles.timeColon}>:</Text>

              <TimeAdjuster
                label="分"
                value={`${String(reminderMinute).padStart(2, '0')}`}
                onMinus={() => {
                  void adjustReminderMinute(-5);
                }}
                onPlus={() => {
                  void adjustReminderMinute(5);
                }}
                disabled={isSavingReminder}
              />
            </View>

            <View style={styles.quickPresetRow}>
              <QuickTimeButton
                label="21:00"
                onPress={() => {
                  void applyQuickTimePreset(21, 0);
                }}
              />
              <QuickTimeButton
                label="22:00"
                onPress={() => {
                  void applyQuickTimePreset(22, 0);
                }}
              />
              <QuickTimeButton
                label="23:00"
                onPress={() => {
                  void applyQuickTimePreset(23, 0);
                }}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>データ管理</Text>
          <Text style={styles.sectionDescription}>
            保存済みの振り返りをまとめて削除できます。
          </Text>

          <Pressable
            style={[
              styles.dangerButton,
              isClearing && styles.dangerButtonDisabled,
            ]}
            onPress={confirmClearAll}
            disabled={isClearing}
          >
            <Text style={styles.dangerButtonText}>
              {isClearing ? '削除中...' : '全データを削除'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>今後追加したい機能</Text>

          <View style={styles.todoItem}>
            <Text style={styles.todoTitle}>JSONエクスポート / インポート</Text>
            <Text style={styles.todoText}>
              振り返りデータをバックアップしたり、復元できるようにする予定です。
            </Text>
          </View>

          <View style={styles.todoItem}>
            <Text style={styles.todoTitle}>タグ管理</Text>
            <Text style={styles.todoText}>
              タグの追加・編集・削除を設定画面からできるようにする予定です。
            </Text>
          </View>

          <View style={styles.todoItemLast}>
            <Text style={styles.todoTitle}>お気に入りテンプレ</Text>
            <Text style={styles.todoText}>
              よく使うテンプレを上に出して、作成をもっと早くする予定です。
            </Text>
          </View>
        </View>
      </ScrollView>
    </SwipeTabPage>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function TimeAdjuster({
  label,
  value,
  onMinus,
  onPlus,
  disabled,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.timeAdjuster}>
      <Text style={styles.timeAdjusterLabel}>{label}</Text>

      <View style={styles.timeAdjusterControls}>
        <Pressable
          style={[styles.timeAdjustButton, disabled && styles.disabledButton]}
          onPress={onMinus}
          disabled={disabled}
        >
          <Text style={styles.timeAdjustButtonText}>−</Text>
        </Pressable>

        <View style={styles.timeValueBox}>
          <Text style={styles.timeValueText}>{value}</Text>
        </View>

        <Pressable
          style={[styles.timeAdjustButton, disabled && styles.disabledButton]}
          onPress={onPlus}
          disabled={disabled}
        >
          <Text style={styles.timeAdjustButtonText}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

function QuickTimeButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickPresetButton} onPress={onPress}>
      <Text style={styles.quickPresetButtonText}>{label}</Text>
    </Pressable>
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e6eb',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  summaryCard: {
    width: '47%',
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e7ebf2',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  reloadButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dfe7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reloadButtonText: {
    fontWeight: '700',
    color: '#333',
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reminderToggleTextArea: {
    flex: 1,
    paddingRight: 16,
  },
  reminderToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  reminderToggleSubText: {
    fontSize: 13,
    color: '#666',
  },
  timeEditorCard: {
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e7ebf2',
  },
  timeEditorLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  timeColon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginHorizontal: 10,
    marginTop: 20,
  },
  timeAdjuster: {
    alignItems: 'center',
  },
  timeAdjusterLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '700',
  },
  timeAdjusterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeAdjustButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dfe7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  timeAdjustButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  timeValueBox: {
    minWidth: 64,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dfe7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  timeValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  quickPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickPresetButton: {
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#bfd3ff',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  quickPresetButtonText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerButtonDisabled: {
    opacity: 0.6,
  },
  dangerButtonText: {
    color: '#be123c',
    fontSize: 15,
    fontWeight: '700',
  },
  todoItem: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
  },
  todoItemLast: {
    paddingBottom: 0,
    marginBottom: 0,
  },
  todoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  todoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});