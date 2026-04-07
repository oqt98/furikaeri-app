import { useRouter, useSegments } from 'expo-router';
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
  getOnboardingCompleted,
  getThemePreference,
  saveThemePreference,
} from './preferences';
import { getTheme, type AppTheme, type ThemeName } from './theme';

type ThemeContextValue = {
  themeName: ThemeName;
  theme: AppTheme;
  setThemeName: (value: ThemeName) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [themeName, setThemeNameState] = useState<ThemeName>('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        if (process.env.NODE_ENV === 'test') {
          setIsReady(true);
          return;
        }

        const [savedTheme, onboardingCompleted] = await Promise.all([
          getThemePreference(),
          getOnboardingCompleted(),
        ]);

        if (!isMounted) return;

        setThemeNameState(savedTheme);

        const isOnboardingRoute = segments[0] === 'onboarding';
        if (!onboardingCompleted && !isOnboardingRoute) {
          router.replace('/onboarding');
          return;
        }

        if (onboardingCompleted && isOnboardingRoute) {
          router.replace('/(tabs)');
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
      setThemeName: async (nextThemeName) => {
        setThemeNameState(nextThemeName);
        await saveThemePreference(nextThemeName);
      },
    }),
    [themeName]
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
