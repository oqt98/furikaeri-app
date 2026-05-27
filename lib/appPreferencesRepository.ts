import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getRemoteAppPreferences,
  getRemoteProfile,
  updateRemoteProfile,
  upsertRemoteAppPreferences,
} from './supabase/preferencesSync';
import type { ThemeName } from './theme';

export type AppLocale = 'ja' | 'en';

export type AppPreferencesRepository = {
  getThemePreference: () => Promise<ThemeName>;
  saveThemePreference: (value: ThemeName) => Promise<void>;
  getOnboardingCompleted: () => Promise<boolean>;
  setOnboardingCompleted: (value: boolean) => Promise<void>;
  getLocalePreference: () => Promise<AppLocale>;
  saveLocalePreference: (value: AppLocale) => Promise<void>;
};

const THEME_KEY = 'furikaeri-theme';
const ONBOARDING_KEY = 'furikaeri-onboarding-complete';
const LOCALE_KEY = 'furikaeri-locale';

function isThemeName(value: string | null): value is ThemeName {
  return (
    value === 'light' ||
    value === 'warm' ||
    value === 'rose' ||
    value === 'amber' ||
    value === 'green' ||
    value === 'mint' ||
    value === 'blue' ||
    value === 'navy'
  );
}

function isLocale(value: string | null): value is AppLocale {
  return value === 'ja' || value === 'en';
}

export async function hydrateAppPreferencesFromRemote() {
  try {
    const [remotePreferences, remoteProfile] = await Promise.all([
      getRemoteAppPreferences(),
      getRemoteProfile(),
    ]);

    const writes: Promise<void>[] = [];

    if (isThemeName(remotePreferences?.theme ?? null)) {
      writes.push(AsyncStorage.setItem(THEME_KEY, remotePreferences?.theme as ThemeName));
    }

    if (isLocale(remotePreferences?.locale ?? null)) {
      writes.push(AsyncStorage.setItem(LOCALE_KEY, remotePreferences?.locale as AppLocale));
    }

    if (typeof remoteProfile?.onboarding_completed === 'boolean') {
      writes.push(
        AsyncStorage.setItem(
          ONBOARDING_KEY,
          String(remoteProfile.onboarding_completed)
        )
      );
    }

    if (writes.length > 0) {
      await Promise.all(writes);
    }
  } catch (error) {
    console.error('hydrateAppPreferencesFromRemote error:', error);
  }
}

export const localAppPreferencesRepository: AppPreferencesRepository = {
  async getThemePreference() {
    try {
      const raw = await AsyncStorage.getItem(THEME_KEY);
      return isThemeName(raw) ? raw : 'light';
    } catch (error) {
      console.error('getThemePreference error:', error);
      return 'light';
    }
  },
  async saveThemePreference(value) {
    await AsyncStorage.setItem(THEME_KEY, value);
  },
  async getOnboardingCompleted() {
    try {
      return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
    } catch (error) {
      console.error('getOnboardingCompleted error:', error);
      return false;
    }
  },
  async setOnboardingCompleted(value) {
    await AsyncStorage.setItem(ONBOARDING_KEY, String(value));
  },
  async getLocalePreference() {
    try {
      const raw = await AsyncStorage.getItem(LOCALE_KEY);
      return isLocale(raw) ? raw : 'ja';
    } catch (error) {
      console.error('getLocalePreference error:', error);
      return 'ja';
    }
  },
  async saveLocalePreference(value) {
    await AsyncStorage.setItem(LOCALE_KEY, value);
  },
};

async function syncAppPreferencesToRemote(
  patch: Partial<{
    theme: ThemeName | null;
    locale: AppLocale | null;
  }>
) {
  try {
    await upsertRemoteAppPreferences(patch);
  } catch (error) {
    console.error('syncAppPreferencesToRemote error:', error);
  }
}

async function syncOnboardingToRemote(value: boolean) {
  try {
    await updateRemoteProfile({ onboarding_completed: value });
  } catch (error) {
    console.error('syncOnboardingToRemote error:', error);
  }
}

export const appPreferencesRepository: AppPreferencesRepository = {
  async getThemePreference() {
    try {
      const raw = await AsyncStorage.getItem(THEME_KEY);
      if (isThemeName(raw)) {
        return raw;
      }

      const remote = await getRemoteAppPreferences();
      const remoteTheme = remote?.theme ?? null;
      if (isThemeName(remoteTheme)) {
        await AsyncStorage.setItem(THEME_KEY, remoteTheme);
        return remoteTheme as ThemeName;
      }
    } catch (error) {
      console.error('getThemePreference error:', error);
    }

    return 'light';
  },
  async saveThemePreference(value) {
    await AsyncStorage.setItem(THEME_KEY, value);
    await syncAppPreferencesToRemote({ theme: value });
  },
  async getOnboardingCompleted() {
    try {
      const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (raw !== null) {
        return raw === 'true';
      }

      const remote = await getRemoteProfile();
      const nextValue = remote?.onboarding_completed ?? false;
      await AsyncStorage.setItem(ONBOARDING_KEY, String(nextValue));
      return nextValue;
    } catch (error) {
      console.error('getOnboardingCompleted error:', error);
      return false;
    }
  },
  async setOnboardingCompleted(value) {
    await AsyncStorage.setItem(ONBOARDING_KEY, String(value));
    await syncOnboardingToRemote(value);
  },
  async getLocalePreference() {
    try {
      const raw = await AsyncStorage.getItem(LOCALE_KEY);
      if (isLocale(raw)) {
        return raw;
      }

      const remote = await getRemoteAppPreferences();
      const remoteLocale = remote?.locale ?? null;
      if (isLocale(remoteLocale)) {
        await AsyncStorage.setItem(LOCALE_KEY, remoteLocale);
        return remoteLocale as AppLocale;
      }
    } catch (error) {
      console.error('getLocalePreference error:', error);
    }

    return 'ja';
  },
  async saveLocalePreference(value) {
    await AsyncStorage.setItem(LOCALE_KEY, value);
    await syncAppPreferencesToRemote({ locale: value });
  },
};
