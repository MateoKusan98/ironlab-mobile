import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ActivityIndicator, View } from 'react-native';
import './src/i18n';
import { AppNavigator } from './src/navigation/AppNavigator';
import { BadgeCelebrationProvider } from './src/contexts/BadgeCelebrationContext';
import { WhatsNewProvider } from './src/contexts/WhatsNewContext';
import { ForceUpdateProvider } from './src/contexts/ForceUpdateContext';
import { SplashScreen } from './src/screens/SplashScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAuthStore } from './src/stores/auth.store';
import { useSettingsStore } from './src/stores/settings.store';
import { registerPushToken } from './src/services/pushNotification.service';
import { logService } from './src/services/log.service';
import { initSentry, setSentryUser, Sentry } from './src/services/sentry';
import { theme } from './src/theme';

// Before anything else installs an error handler, so Sentry's own handler is
// the one ours chains into below.
initSentry();

// Capture uncaught JS errors (crashes) so we can see them per-user in the admin
// Error Logs screen. Installed once at module load; chains the default handler so
// the app's normal red-box / crash behaviour is preserved.
const ErrorUtilsRef = (globalThis as any).ErrorUtils;
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
  const user = useAuthStore((s) => s.user);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    loadStoredAuth();
    loadSettings();
  }, [loadStoredAuth, loadSettings]);

  // One place to keep Sentry's identity in sync — covers login, logout, stored-
  // session restore and both directions of impersonation.
  useEffect(() => {
    setSentryUser(user);
  }, [user]);

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

function App() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="light" />
            <ForceUpdateProvider>
              <BadgeCelebrationProvider>
                <WhatsNewProvider>
                  <AppContent />
                </WhatsNewProvider>
              </BadgeCelebrationProvider>
            </ForceUpdateProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

// Sentry.wrap adds the native crash context (touch breadcrumbs, app-start
// timings) that Sentry.init alone can't reach. No-ops when Sentry is disabled.
export default Sentry.wrap(App);
