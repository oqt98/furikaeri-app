import { useRouter, useSegments, type Href } from 'expo-router';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  getLocalePreference,
  getOnboardingCompleted,
  getThemePreference,
  saveLocalePreference,
  setOnboardingCompleted,
  saveThemePreference,
} from './preferences';
import { getLocaleTag, translate, type TranslationKey } from './i18n';
import { getTheme, type AppTheme, type ThemeName } from './theme';
import type { AppLocale } from './appPreferencesRepository';

type ThemeContextValue = {
  themeName: ThemeName;
  theme: AppTheme;
  setThemeName: (value: ThemeName) => Promise<void>;
  locale: AppLocale;
  localeTag: string;
  setLocale: (value: AppLocale) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  reopenOnboarding: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [themeName, setThemeNameState] = useState<ThemeName>('light');
  const [locale, setLocaleState] = useState<AppLocale>('ja');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        if (process.env.NODE_ENV === 'test') {
          setIsReady(true);
          return;
        }

        const [savedTheme, savedLocale, onboardingCompleted] = await Promise.all([
          getThemePreference(),
          getLocalePreference(),
          getOnboardingCompleted(),
        ]);

        if (!isMounted) return;

        setThemeNameState(savedTheme);
        setLocaleState(savedLocale);

        const firstSegment = String(segments[0] ?? '');
        const isOnboardingRoute = firstSegment === 'onboarding';
        if (!onboardingCompleted && !isOnboardingRoute) {
          router.replace('/onboarding' as Href);
          return;
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [router, segments]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      theme: getTheme(themeName),
      locale,
      localeTag: getLocaleTag(locale),
      setThemeName: async (nextThemeName) => {
        setThemeNameState(nextThemeName);
        await saveThemePreference(nextThemeName);
      },
      setLocale: async (nextLocale) => {
        setLocaleState(nextLocale);
        await saveLocalePreference(nextLocale);
      },
      completeOnboarding: async () => {
        await setOnboardingCompleted(true);
        router.replace('/(tabs)' as Href);
      },
      reopenOnboarding: () => {
        router.push('/onboarding' as Href);
      },
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, router, themeName]
  );

  if (!isReady) {
    const fallbackTheme = getTheme(themeName);
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fallbackTheme.colors.background,
        }}
      >
        <ActivityIndicator color={fallbackTheme.colors.primary} />
      </View>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
}
