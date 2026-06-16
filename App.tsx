import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import './src/i18n';
import { AppNavigator } from './src/navigation/AppNavigator';
import { BadgeCelebrationProvider } from './src/contexts/BadgeCelebrationContext';
import { WhatsNewProvider } from './src/contexts/WhatsNewContext';
import { SplashScreen } from './src/screens/SplashScreen';
import { useAuthStore } from './src/stores/auth.store';
import { useSettingsStore } from './src/stores/settings.store';
import { registerPushToken } from './src/services/pushNotification.service';
import { logService } from './src/services/log.service';
import { theme } from './src/theme';

// Capture uncaught JS errors (crashes) so we can see them per-user in the admin
// Error Logs screen. Installed once at module load; chains the default handler so
// the app's normal red-box / crash behaviour is preserved.
const ErrorUtilsRef = (global as any).ErrorUtils;
if (ErrorUtilsRef?.setGlobalHandler) {
  const previousHandler = ErrorUtilsRef.getGlobalHandler?.();
  ErrorUtilsRef.setGlobalHandler((error: any, isFatal?: boolean) => {
    logService.capture({
      level: isFatal ? 'fatal' : 'error',
      source: 'js',
      message: error?.message ? String(error.message) : String(error),
      stack: error?.stack ? String(error.stack) : undefined,
      context: { isFatal: !!isFatal },
    });
    previousHandler?.(error, isFatal);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent: React.FC = () => {
  const { isLoading, isAuthenticated, loadStoredAuth } = useAuthStore();
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    loadStoredAuth();
    loadSettings();
  }, [loadStoredAuth, loadSettings]);

  useEffect(() => {
    if (isAuthenticated) {
      registerPushToken();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return <AppNavigator />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <BadgeCelebrationProvider>
          <WhatsNewProvider>
            <AppContent />
          </WhatsNewProvider>
        </BadgeCelebrationProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
