import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import './src/i18n';
import { AppNavigator } from './src/navigation/AppNavigator';
import { BadgeCelebrationProvider } from './src/contexts/BadgeCelebrationContext';
import { SplashScreen } from './src/screens/SplashScreen';
import { useAuthStore } from './src/stores/auth.store';
import { useSettingsStore } from './src/stores/settings.store';
import { registerPushToken } from './src/services/pushNotification.service';
import { theme } from './src/theme';

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
          <AppContent />
        </BadgeCelebrationProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
