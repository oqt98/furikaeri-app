import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SupabaseBootstrap } from '../lib/supabase/SupabaseBootstrap';
import { AppThemeProvider } from '../lib/theme-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SupabaseBootstrap>
        <AppThemeProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AppThemeProvider>
      </SupabaseBootstrap>
    </GestureHandlerRootView>
  );
}
