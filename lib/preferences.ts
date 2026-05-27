import {
  appPreferencesRepository,
  type AppLocale,
} from './appPreferencesRepository';
import type { ThemeName } from './theme';

export async function getThemePreference(): Promise<ThemeName> {
  return appPreferencesRepository.getThemePreference();
}

export async function saveThemePreference(value: ThemeName) {
  await appPreferencesRepository.saveThemePreference(value);
}

export async function getOnboardingCompleted() {
  return appPreferencesRepository.getOnboardingCompleted();
}

export async function setOnboardingCompleted(value: boolean) {
  await appPreferencesRepository.setOnboardingCompleted(value);
}

export async function getLocalePreference(): Promise<AppLocale> {
  return appPreferencesRepository.getLocalePreference();
}

export async function saveLocalePreference(value: AppLocale) {
  await appPreferencesRepository.saveLocalePreference(value);
}
