import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeName } from './theme';

const THEME_KEY = 'furikaeri-theme';
const ONBOARDING_KEY = 'furikaeri-onboarding-complete';

export async function getThemePreference(): Promise<ThemeName> {
  try {
    const raw = await AsyncStorage.getItem(THEME_KEY);
    if (
      raw === 'light' ||
      raw === 'warm' ||
      raw === 'rose' ||
      raw === 'amber' ||
      raw === 'green' ||
      raw === 'mint' ||
      raw === 'blue' ||
      raw === 'navy'
    ) {
      return raw;
    }
  } catch (error) {
    console.error('getThemePreference error:', error);
  }

  return 'light';
}

export async function saveThemePreference(value: ThemeName) {
  await AsyncStorage.setItem(THEME_KEY, value);
}

export async function getOnboardingCompleted() {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
  } catch (error) {
    console.error('getOnboardingCompleted error:', error);
    return false;
  }
}

export async function setOnboardingCompleted(value: boolean) {
  await AsyncStorage.setItem(ONBOARDING_KEY, String(value));
}
