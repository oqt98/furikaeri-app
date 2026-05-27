import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
import SwipeTabPage from '../../components/SwipeTabPage';
import {
  cancelExistingReminderIfAny as syncCancelExistingReminderIfAny,
  configureReminderNotifications,
  ensureNotificationPermission as syncEnsureNotificationPermission,
  loadReminderSettings as loadSyncedReminderSettings,
  saveReminderSettings as saveSyncedReminderSettings,
  scheduleDailyReminder as syncScheduleDailyReminder,
} from '../../lib/reminderSettings';
import { clearAllReviews } from '../../lib/storage';
import { brand, cardShadow, theme } from '../../lib/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(22);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [hourInput, setHourInput] = useState('22');
  const [minuteInput, setMinuteInput] = useState('00');
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  useEffect(() => {
    void configureReminderNotifications();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSyncedReminderSettings().then(({ enabled, hour, minute }) => {
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
        const granted = await syncEnsureNotificationPermission();
        if (!granted) {
          Alert.alert(
            '通知を有効にできません',
            '端末の設定から通知を許可してください。'
          );
          return;
        }

        await syncScheduleDailyReminder(reminderHour, reminderMinute);
      } else {
        await syncCancelExistingReminderIfAny();
      }

      await saveSyncedReminderSettings(nextValue, reminderHour, reminderMinute);
      setReminderEnabled(nextValue);
    } catch (error) {
      console.error(error);
      Alert.alert('リマインダー設定の更新に失敗しました');
    } finally {
      setIsSavingReminder(false);
    }
  };

  const applyReminderTime = async (hour: number, minute: number) => {
    try {
      setIsSavingReminder(true);
      await saveSyncedReminderSettings(reminderEnabled, hour, minute);
      setReminderHour(hour);
      setReminderMinute(minute);
      setHourInput(String(hour).padStart(2, '0'));
      setMinuteInput(String(minute).padStart(2, '0'));

      if (reminderEnabled) {
        await syncScheduleDailyReminder(hour, minute);
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
      Alert.alert(
        '時刻の形式が正しくありません',
        '0-23 / 0-59 の範囲で入力してください。'
      );
      return;
    }

    void applyReminderTime(hour, minute);
  };

  return (
    <SwipeTabPage tabKey="settings">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>設定</Text>
        <Text style={styles.subtitle}>
          リマインダー、タグ管理、データ削除をここで調整できます。
        </Text>

        <View style={styles.brandCard}>
          <Text style={styles.brandName}>{brand.name}</Text>
          <Text style={styles.brandSubtitle}>{brand.subtitle}</Text>
          <Text style={styles.brandText}>
            入力のしやすさを保ちながら、続けやすい振り返り環境を整えるための設定です。
          </Text>
        </View>

        <SectionCard title="リマインダー">
          <Text style={styles.sectionBody}>
            1日1回、記録を思い出すための通知を設定できます。
          </Text>

          <View style={styles.toggleRow}>
            <View style={styles.flexFill}>
              <Text style={styles.toggleTitle}>毎日のリマインダー</Text>
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
            行動タグと気分タグの追加・編集・表示設定を変更できます。
          </Text>
          <Pressable style={styles.linkButton} onPress={() => router.push('./tags')}>
            <Text style={styles.linkButtonText}>タグを管理する</Text>
          </Pressable>
        </SectionCard>

        <SectionCard title="データ削除">
          <Text style={styles.sectionBody}>
            端末内の記録をすべて削除します。この操作は元に戻せません。
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

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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
