import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  getRemoteAppPreferences,
  upsertRemoteAppPreferences,
} from './supabase/preferencesSync';

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export type ReminderSettingsRepository = {
  get: () => Promise<ReminderSettings>;
  save: (settings: ReminderSettings) => Promise<void>;
  getNotificationId: () => Promise<string | null>;
  saveNotificationId: (value: string) => Promise<void>;
  clearNotificationId: () => Promise<void>;
};

const REMINDER_ENABLED_KEY = 'furikaeri-reminder-enabled';
const REMINDER_HOUR_KEY = 'furikaeri-reminder-hour';
const REMINDER_MINUTE_KEY = 'furikaeri-reminder-minute';
const REMINDER_NOTIFICATION_ID_KEY = 'furikaeri-reminder-notification-id';

let isNotificationHandlerConfigured = false;

export const localReminderSettingsRepository: ReminderSettingsRepository = {
  async get() {
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
      console.error('loadReminderSettings error:', error);
      return { enabled: false, hour: 22, minute: 0 };
    }
  },
  async save(settings) {
    await Promise.all([
      AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(settings.enabled)),
      AsyncStorage.setItem(REMINDER_HOUR_KEY, String(settings.hour)),
      AsyncStorage.setItem(REMINDER_MINUTE_KEY, String(settings.minute)),
    ]);
  },
  async getNotificationId() {
    return AsyncStorage.getItem(REMINDER_NOTIFICATION_ID_KEY);
  },
  async saveNotificationId(value) {
    await AsyncStorage.setItem(REMINDER_NOTIFICATION_ID_KEY, value);
  },
  async clearNotificationId() {
    await AsyncStorage.removeItem(REMINDER_NOTIFICATION_ID_KEY);
  },
};

export function configureReminderNotifications() {
  if (isNotificationHandlerConfigured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  isNotificationHandlerConfigured = true;
}

export async function loadReminderSettings() {
  try {
    const [enabledRaw, hourRaw, minuteRaw] = await Promise.all([
      AsyncStorage.getItem(REMINDER_ENABLED_KEY),
      AsyncStorage.getItem(REMINDER_HOUR_KEY),
      AsyncStorage.getItem(REMINDER_MINUTE_KEY),
    ]);

    if (enabledRaw !== null || hourRaw !== null || minuteRaw !== null) {
      return {
        enabled: enabledRaw === 'true',
        hour: hourRaw ? Number(hourRaw) : 22,
        minute: minuteRaw ? Number(minuteRaw) : 0,
      };
    }

    const remote = await getRemoteAppPreferences();
    if (!remote) {
      return { enabled: false, hour: 22, minute: 0 };
    }

    const next = {
      enabled: remote.reminder_enabled,
      hour: remote.reminder_hour ?? 22,
      minute: remote.reminder_minute ?? 0,
    };

    await localReminderSettingsRepository.save(next);
    return next;
  } catch (error) {
    console.error('loadReminderSettings error:', error);
    return localReminderSettingsRepository.get();
  }
}

export async function hydrateReminderSettingsFromRemote() {
  try {
    const remote = await getRemoteAppPreferences();
    if (!remote) {
      return;
    }

    await localReminderSettingsRepository.save({
      enabled: remote.reminder_enabled,
      hour: remote.reminder_hour ?? 22,
      minute: remote.reminder_minute ?? 0,
    });
  } catch (error) {
    console.error('hydrateReminderSettingsFromRemote error:', error);
  }
}

export async function saveReminderSettings(
  enabled: boolean,
  hour: number,
  minute: number
) {
  await localReminderSettingsRepository.save({ enabled, hour, minute });

  try {
    await upsertRemoteAppPreferences({
      reminder_enabled: enabled,
      reminder_hour: hour,
      reminder_minute: minute,
    });
  } catch (error) {
    console.error('saveReminderSettings remote sync error:', error);
  }
}

export async function ensureNotificationPermission() {
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

export async function cancelExistingReminderIfAny() {
  const existingId = await localReminderSettingsRepository.getNotificationId();
  if (existingId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    } catch (error) {
      console.error(error);
    }
  }

  await localReminderSettingsRepository.clearNotificationId();
}

export async function scheduleDailyReminder(hour: number, minute: number) {
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

  await localReminderSettingsRepository.saveNotificationId(notificationId);
}
