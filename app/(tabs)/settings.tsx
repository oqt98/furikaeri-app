import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
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
import SwipeTabPage from '../../components/SwipeTabPage';
import { parseNotionCsv } from '../../lib/notionImport';
import { clearAllReviews, importReviews } from '../../lib/storage';
import { brand, cardShadow, theme } from '../../lib/theme';

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

type ImportSummary = {
  readCount: number;
  addedCount: number;
  skippedCount: number;
  errorCount: number;
  details: { rowNumber: number; reason: string }[];
};

export default function SettingsScreen() {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(22);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [hourInput, setHourInput] = useState('22');
  const [minuteInput, setMinuteInput] = useState('00');
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void loadReminderSettings().then(({ enabled, hour, minute }) => {
        setReminderEnabled(enabled);
        setReminderHour(hour);
        setReminderMinute(minute);
        setHourInput(String(hour).padStart(2, '0'));
        setMinuteInput(String(minute).padStart(2, '0'));
      });
    }, [])
  );

  const handleClearAll = async () => {
    try {
      setIsClearing(true);
      await clearAllReviews();
      Alert.alert('記録をすべて削除しました');
    } catch (error) {
      console.error(error);
      Alert.alert('削除に失敗しました');
    } finally {
      setIsClearing(false);
    }
  };

  const handleToggleReminder = async (nextValue: boolean) => {
    try {
      setIsSavingReminder(true);

      if (nextValue) {
        const granted = await ensureNotificationPermission();
        if (!granted) {
          Alert.alert('通知権限がありません', '設定から通知を許可してください。');
          return;
        }
        await scheduleDailyReminder(reminderHour, reminderMinute);
      } else {
        await cancelExistingReminderIfAny();
      }

      await saveReminderSettings(nextValue, reminderHour, reminderMinute);
      setReminderEnabled(nextValue);
    } catch (error) {
      console.error(error);
      Alert.alert('リマインド設定の更新に失敗しました');
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
      setHourInput(String(hour).padStart(2, '0'));
      setMinuteInput(String(minute).padStart(2, '0'));

      if (reminderEnabled) {
        await scheduleDailyReminder(hour, minute);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('時刻の更新に失敗しました');
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleApplyTextTime = () => {
    const hour = Number(hourInput);
    const minute = Number(minuteInput);
    const valid =
      Number.isInteger(hour) &&
      hour >= 0 &&
      hour <= 23 &&
      Number.isInteger(minute) &&
      minute >= 0 &&
      minute <= 59;

    if (!valid) {
      Alert.alert('時刻の形式が正しくありません', '0-23 / 0-59 で入力してください。');
      return;
    }

    void applyReminderTime(hour, minute);
  };

  const handleImportCsv = async () => {
    try {
      setIsImportingCsv(true);
      const selected = await File.pickFileAsync(undefined, 'text/*');
      const pickedFile = Array.isArray(selected) ? selected[0] : selected;
      const csvText = await pickedFile.text();
      const parsed = parseNotionCsv(csvText);
      const imported = await importReviews(parsed.drafts);
      const summary: ImportSummary = {
        readCount: parsed.readCount,
        addedCount: imported.importedCount,
        skippedCount: imported.skipped.length,
        errorCount: parsed.issues.length,
        details: parsed.issues
          .concat(
            imported.skipped.map((item) => ({
              rowNumber: item.sourceRowNumber ?? 0,
              reason: item.reason,
            }))
          )
          .slice(0, 6),
      };

      Alert.alert(
        summary.readCount === 0
          ? 'Notion CSV を取り込めませんでした'
          : 'Notion CSV を取り込みました',
        buildImportResultMessage(summary)
      );
    } catch (error) {
      if (isCancelledFilePick(error)) {
        return;
      }

      console.error(error);
      Alert.alert('Notion CSV の取り込みに失敗しました');
    } finally {
      setIsImportingCsv(false);
    }
  };

  return (
    <SwipeTabPage tabKey="settings">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>設定</Text>
        <Text style={styles.subtitle}>
          リマインド、タグ管理、Notion CSV インポート、データ削除をここで行えます。
        </Text>

        <View style={styles.brandCard}>
          <Text style={styles.brandName}>{brand.name}</Text>
          <Text style={styles.brandSubtitle}>{brand.subtitle}</Text>
          <Text style={styles.brandText}>
            軽く振り返って、あとから見返しやすくするための設定をまとめています。
          </Text>
        </View>

        <SectionCard title="Notion CSV Import">
          <Text style={styles.sectionBody}>
            Notion の `タイトル / 今日の気分 / 日付` を既存レビューへ取り込みます。完全重複はスキップし、同じ日付でも別タイトルなら別レコードとして追加します。
          </Text>
          <Pressable
            style={[styles.linkButton, isImportingCsv && styles.disabledButton]}
            onPress={() => {
              void handleImportCsv();
            }}
            disabled={isImportingCsv}
          >
            <Text style={styles.linkButtonText}>
              {isImportingCsv ? 'CSV を読み込み中...' : 'Notion CSV を取り込む'}
            </Text>
          </Pressable>
        </SectionCard>

        <SectionCard title="リマインド">
          <Text style={styles.sectionBody}>
            1 日 1 回、指定した時刻に振り返りの通知を送ります。
          </Text>

          <View style={styles.toggleRow}>
            <View style={styles.flexFill}>
              <Text style={styles.toggleTitle}>毎日のリマインド</Text>
              <Text style={styles.toggleSubtitle}>
                {reminderEnabled
                  ? `${formatTime(reminderHour, reminderMinute)} に通知`
                  : 'オフ'}
              </Text>
            </View>

            <Switch
              value={reminderEnabled}
              onValueChange={(value) => {
                void handleToggleReminder(value);
              }}
              disabled={isSavingReminder}
              trackColor={{
                false: theme.colors.surfaceStrong,
                true: theme.colors.primarySoft,
              }}
              thumbColor={
                reminderEnabled ? theme.colors.primary : theme.colors.surface
              }
            />
          </View>

          <View style={styles.timeCard}>
            <TimeAdjuster
              label="時"
              value={String(reminderHour).padStart(2, '0')}
              onMinus={() => {
                void applyReminderTime((reminderHour + 23) % 24, reminderMinute);
              }}
              onPlus={() => {
                void applyReminderTime((reminderHour + 1) % 24, reminderMinute);
              }}
              disabled={isSavingReminder}
            />
            <Text style={styles.timeColon}>:</Text>
            <TimeAdjuster
              label="分"
              value={String(reminderMinute).padStart(2, '0')}
              onMinus={() => {
                const total = (reminderHour * 60 + reminderMinute - 1 + 1440) % 1440;
                void applyReminderTime(Math.floor(total / 60), total % 60);
              }}
              onPlus={() => {
                const total = (reminderHour * 60 + reminderMinute + 1) % 1440;
                void applyReminderTime(Math.floor(total / 60), total % 60);
              }}
              disabled={isSavingReminder}
            />
          </View>

          <View style={styles.manualRow}>
            <TextInput
              style={styles.timeInput}
              value={hourInput}
              onChangeText={setHourInput}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="22"
              placeholderTextColor={theme.colors.textSoft}
            />
            <Text style={styles.manualColon}>:</Text>
            <TextInput
              style={styles.timeInput}
              value={minuteInput}
              onChangeText={setMinuteInput}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="00"
              placeholderTextColor={theme.colors.textSoft}
            />
            <Pressable style={styles.applyButton} onPress={handleApplyTextTime}>
              <Text style={styles.applyButtonText}>反映</Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard title="タグ管理">
          <Text style={styles.sectionBody}>
            行動タグと状態タグの追加・非表示を設定できます。
          </Text>
          <Pressable style={styles.linkButton} onPress={() => router.push('./tags')}>
            <Text style={styles.linkButtonText}>タグを管理する</Text>
          </Pressable>
        </SectionCard>

        <SectionCard title="データ削除">
          <Text style={styles.sectionBody}>
            保存済みのレビューをすべて削除します。この操作は元に戻せません。
          </Text>
          <Pressable
            style={[styles.dangerButton, isClearing && styles.disabledButton]}
            disabled={isClearing}
            onPress={() =>
              Alert.alert(
                'すべての記録を削除しますか？',
                'この操作は元に戻せません。',
                [
                  { text: 'キャンセル', style: 'cancel' },
                  {
                    text: '削除する',
                    style: 'destructive',
                    onPress: () => {
                      void handleClearAll();
                    },
                  },
                ]
              )
            }
          >
            <Text style={styles.dangerButtonText}>
              {isClearing ? '削除中...' : 'すべて削除'}
            </Text>
          </Pressable>
        </SectionCard>
      </ScrollView>
    </SwipeTabPage>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
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
      <View style={styles.timeAdjusterRow}>
        <Pressable
          style={[styles.timeAdjustButton, disabled && styles.disabledButton]}
          onPress={onMinus}
          disabled={disabled}
        >
          <Text style={styles.timeAdjustButtonText}>-</Text>
        </Pressable>
        <View style={styles.timeValueBox}>
          <Text style={styles.timeValueText}>{value}</Text>
        </View>
        <Pressable
          style={[styles.timeAdjustButton, disabled && styles.disabledButton]}
          onPress={onPlus}
          disabled={disabled}
        >
          <Text style={styles.timeAdjustButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

async function loadReminderSettings() {
  try {
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
  } catch (error) {
    console.error(error);
    return { enabled: false, hour: 22, minute: 0 };
  }
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

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ふりかえりの時間です',
      body: '今日のことを短く残しておきましょう。',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: 'daily-reminder' } : {}),
    },
  });

  await AsyncStorage.setItem(REMINDER_NOTIFICATION_ID_KEY, notificationId);
}

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function isCancelledFilePick(error: unknown) {
  return error instanceof Error && /cancel/i.test(error.message);
}

function buildImportResultMessage(summary: ImportSummary) {
  const detailLines = summary.details
    .map((item) =>
      item.rowNumber > 0 ? `${item.rowNumber} 行目: ${item.reason}` : item.reason
    )
    .slice(0, 6);

  return [
    `読み込み件数: ${summary.readCount}件`,
    `追加件数: ${summary.addedCount}件`,
    `スキップ件数: ${summary.skippedCount}件`,
    `エラー件数: ${summary.errorCount}件`,
    detailLines.length > 0 ? '' : null,
    ...detailLines,
  ]
    .filter(Boolean)
    .join('\n');
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    paddingBottom: 120,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xl,
  },
  brandCard: {
    ...cardShadow,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xxl,
    marginBottom: theme.spacing.lg,
  },
  brandName: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.sm,
  },
  brandSubtitle: {
    ...theme.typography.section,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  brandText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  sectionCard: {
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
  sectionBody: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },
  flexFill: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  toggleTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  toggleSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    marginTop: 4,
  },
  timeCard: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  timeAdjuster: {
    alignItems: 'center',
  },
  timeAdjusterLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    marginBottom: theme.spacing.sm,
  },
  timeAdjusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  timeAdjustButton: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeAdjustButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  timeValueBox: {
    minWidth: 62,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  timeColon: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
    marginHorizontal: theme.spacing.md,
    marginTop: 22,
  },
  manualRow: {
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
  manualColon: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  applyButton: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
  },
  applyButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  linkButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
  },
  linkButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
  },
  dangerButton: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerButtonText: {
    ...theme.typography.body,
    color: theme.colors.danger,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
