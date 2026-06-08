import { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { makeRedirectUri } from 'expo-auth-session';
import { Alert } from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { authService } from '../services/auth.service';

WebBrowser.maybeCompleteAuthSession();

export function useSocialAuth() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    redirectUri: makeRedirectUri({ scheme: 'ironlab', path: 'auth' }),
  });

  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
    redirectUri: makeRedirectUri({ scheme: 'ironlab', path: 'auth' }),
  });

  useEffect(() => {
    if (googleResponse?.type === 'success' && googleResponse.authentication?.accessToken) {
      handleSocialAuth('google', googleResponse.authentication.accessToken);
    } else if (googleResponse?.type === 'error') {
      Alert.alert('Google Sign-In', googleResponse.error?.message ?? 'Sign-in was cancelled');
    }
  }, [googleResponse]);

  useEffect(() => {
    if (fbResponse?.type === 'success' && fbResponse.authentication?.accessToken) {
      handleSocialAuth('facebook', fbResponse.authentication.accessToken);
    } else if (fbResponse?.type === 'error') {
      Alert.alert('Facebook Sign-In', fbResponse.error?.message ?? 'Sign-in was cancelled');
    }
  }, [fbResponse]);

  const handleSocialAuth = async (provider: 'google' | 'facebook', accessToken: string) => {
    setIsLoading(true);
    try {
      const response = await authService.socialAuth({ provider, accessToken });
      await setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken);
    } catch (error: any) {
      const message = error.response?.data?.message ?? 'Something went wrong. Please try again.';
      Alert.alert('Sign-In Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signInWithGoogle: () => googlePromptAsync(),
    signInWithFacebook: () => fbPromptAsync(),
    isGoogleReady: !!googleRequest,
    isFacebookReady: !!fbRequest,
    isLoading,
  };
}
