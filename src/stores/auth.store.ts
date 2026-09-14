import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { UserResponse } from '@shared';
import { captureSentryException } from '../services/sentry';

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

/**
 * Persist tokens to the keystore WITHOUT blocking the in-memory update.
 *
 * 2026-09-14 prod: `setTokens` used to await two SecureStore writes BEFORE calling
 * `set()`, and api.ts calls it un-awaited. Those writes are native round-trips while
 * the retry's request interceptor runs a microtask later — so the interceptor read
 * the OLD access token out of the store and re-stamped it onto the very request the
 * refresh had just fixed (api.ts overwrites Authorization from the store on every
 * request). Result: a successful refresh still produced a 401, `_retry` was already
 * set, and the request failed. 511 logged 401s and no refresh failures at all —
 * mid-workout set-saves dying every ~20 minutes on a token-plumbing detail.
 *
 * The store is what the request interceptor reads, so the store is the source of
 * truth and must be updated synchronously. The keystore is the durable BACKUP and
 * can settle afterwards. Do not re-order this to await persistence first.
 */
function persistTokens(accessToken: string, refreshToken: string | null): void {
  void (async () => {
    try {
      await SecureStore.setItemAsync('accessToken', accessToken);
      if (refreshToken === null) {
        await SecureStore.deleteItemAsync('refreshToken');
      } else {
        await SecureStore.setItemAsync('refreshToken', refreshToken);
      }
    } catch (error) {
      // A failed write means this session is alive in memory but will NOT survive a
      // cold start — the athlete gets bounced to the login screen next launch with
      // nothing in the logs to explain it. Report it rather than swallowing it.
      captureSentryException(error, { scope: 'auth.persistTokens' });
    }
  })();
}

/**
 * Wipe the keystore copy of the session. Mirrors persistTokens: the caller has
 * ALREADY cleared memory, because memory is what the request interceptor reads —
 * a token that is gone from the store can no longer be attached to a request even
 * if the keystore delete is slow or fails.
 */
function clearPersistedAuth(): void {
  void (async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('accessToken'),
        SecureStore.deleteItemAsync('refreshToken'),
        SecureStore.deleteItemAsync('user'),
        SecureStore.deleteItemAsync(IMPERSONATOR_KEY),
      ]);
    } catch (error) {
      // A failed delete leaves a dead session on disk that loadStoredAuth would
      // restore into a signed-in-looking app on next launch. Worth knowing about.
      captureSentryException(error, { scope: 'auth.clearPersistedAuth' });
    }
  })();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  impersonator: null,

  setAuth: (user, accessToken, refreshToken) => {
    set({ user, accessToken, refreshToken, isAuthenticated: true });
    persistTokens(accessToken, refreshToken);
    void SecureStore.setItemAsync('user', JSON.stringify(user)).catch((error) =>
      captureSentryException(error, { scope: 'auth.setAuth.user' }),
    );
  },

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    persistTokens(accessToken, refreshToken);
  },

  setUser: async (user) => {
    set({ user });
    await SecureStore.setItemAsync('user', JSON.stringify(user));
  },

  logout: () => {
    // Memory first. api.ts calls this un-awaited from the response interceptor, so
    // anything that waited on four keystore deletes would keep handing the dead
    // token to every request that fires in the meantime.
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      impersonator: null,
    });
    clearPersistedAuth();
  },

  startImpersonation: async (targetUser, accessToken) => {
    const { user, accessToken: adminAccess, refreshToken: adminRefresh, impersonator } = get();

    // Already impersonating? Keep the original admin stash, don't nest.
    const isNewStash = !impersonator && !!user && !!adminAccess;
    const stash: ImpersonatorSession | null = isNewStash
      ? { user: user!, accessToken: adminAccess!, refreshToken: adminRefresh }
      : impersonator;

    // Swap the active session to the target. No refresh token for impersonation —
    // when the access token lapses the client auto-exits back to the admin session.
    // Memory first, for the same reason as setTokens: the request interceptor reads
    // the store, so until this lands requests still carry the ADMIN's token.
    set({ user: targetUser, accessToken, refreshToken: null, isAuthenticated: true, impersonator: stash });

    persistTokens(accessToken, null);
    if (isNewStash && stash) {
      await SecureStore.setItemAsync(IMPERSONATOR_KEY, JSON.stringify(stash));
    }
    await SecureStore.setItemAsync('user', JSON.stringify(targetUser));
  },

  stopImpersonation: async () => {
    const stash = get().impersonator;
    if (!stash) return;

    // Memory first — the next request must stop carrying the target's token
    // immediately, not once four keystore writes have settled.
    set({
      user: stash.user,
      accessToken: stash.accessToken,
      refreshToken: stash.refreshToken,
      isAuthenticated: true,
      impersonator: null,
    });

    persistTokens(stash.accessToken, stash.refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(stash.user));
    await SecureStore.deleteItemAsync(IMPERSONATOR_KEY);
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
