import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

/** For navigating from outside a screen — a tapped push notification. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
