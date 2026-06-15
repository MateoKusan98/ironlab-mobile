import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { UserResponse } from '@shared';

interface ImpersonatorSession {
  user: UserResponse;
  accessToken: string;
  refreshToken: string | null;
}

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** The stashed admin session while impersonating; null when not impersonating. */
  impersonator: ImpersonatorSession | null;

  setAuth: (user: UserResponse, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: UserResponse) => void;
  logout: () => void;
  loadStoredAuth: () => Promise<void>;
  startImpersonation: (targetUser: UserResponse, accessToken: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const IMPERSONATOR_KEY = 'impersonator';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  impersonator: null,

  setAuth: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  setTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },

  setUser: async (user) => {
    set({ user });
    await SecureStore.setItemAsync('user', JSON.stringify(user));
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync(IMPERSONATOR_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      impersonator: null,
    });
  },

  startImpersonation: async (targetUser, accessToken) => {
    const { user, accessToken: adminAccess, refreshToken: adminRefresh, impersonator } = get();
    // Already impersonating? Keep the original admin stash, don't nest.
    if (!impersonator && user && adminAccess) {
      const stash: ImpersonatorSession = {
        user,
        accessToken: adminAccess,
        refreshToken: adminRefresh,
      };
      await SecureStore.setItemAsync(IMPERSONATOR_KEY, JSON.stringify(stash));
      set({ impersonator: stash });
    }

    // Swap the active session to the target. No refresh token for impersonation —
    // when the access token lapses the client auto-exits back to the admin session.
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.setItemAsync('user', JSON.stringify(targetUser));
    set({ user: targetUser, accessToken, refreshToken: null, isAuthenticated: true });
  },

  stopImpersonation: async () => {
    const stash = get().impersonator;
    if (!stash) return;

    await SecureStore.setItemAsync('accessToken', stash.accessToken);
    if (stash.refreshToken) {
      await SecureStore.setItemAsync('refreshToken', stash.refreshToken);
    } else {
      await SecureStore.deleteItemAsync('refreshToken');
    }
    await SecureStore.setItemAsync('user', JSON.stringify(stash.user));
    await SecureStore.deleteItemAsync(IMPERSONATOR_KEY);

    set({
      user: stash.user,
      accessToken: stash.accessToken,
      refreshToken: stash.refreshToken,
      isAuthenticated: true,
      impersonator: null,
    });
  },

  loadStoredAuth: async () => {
    try {
      const [accessToken, refreshToken, userJson, impersonatorJson] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('refreshToken'),
        SecureStore.getItemAsync('user'),
        SecureStore.getItemAsync(IMPERSONATOR_KEY),
      ]);

      const hydrate = (user: UserResponse) => {
        // Safety: Ensure new fields have defaults if missing from old stored data
        if (user.isNutritionSetupComplete === undefined) {
          user.isNutritionSetupComplete = false;
        }
        if (user.isAICoachSetupComplete === undefined) {
          user.isAICoachSetupComplete = false;
        }
        return user;
      };

      // Resume an in-progress impersonation session (no refresh token by design).
      if (impersonatorJson && accessToken && userJson) {
        const user = hydrate(JSON.parse(userJson) as UserResponse);
        const impersonator = JSON.parse(impersonatorJson) as ImpersonatorSession;
        set({
          user,
          accessToken,
          refreshToken: null,
          isAuthenticated: true,
          impersonator,
          isLoading: false,
        });
        return;
      }

      if (accessToken && refreshToken && userJson) {
        const user = hydrate(JSON.parse(userJson) as UserResponse);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
