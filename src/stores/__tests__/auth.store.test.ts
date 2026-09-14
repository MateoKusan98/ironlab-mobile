/**
 * Regression cover for the 2026-09-14 "it logged me out again" incident.
 *
 * Prod had 511 logged 401s and ZERO refresh failures — the refresh call always
 * succeeded, and the app threw the new token away immediately after getting it.
 * `setTokens` awaited two SecureStore round-trips before calling `set()`, while
 * api.ts's request interceptor re-stamps Authorization from the store on every
 * request. The retry therefore went back out carrying the OLD, expired token.
 *
 * The assertion that matters is the SYNCHRONOUS one: the store must hold the new
 * token before the keystore write settles, because the retry leaves in a
 * microtask and the keystore write is a native round-trip.
 */
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
}));

jest.mock('../../services/sentry', () => ({
  captureSentryException: jest.fn(),
}));

/* eslint-disable import/first */
import { useAuthStore } from '../auth.store';
import { captureSentryException } from '../../services/sentry';
/* eslint-enable import/first */

const USER = { id: 'u1', email: 'mateokusan@gmail.com' } as never;

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks wipes calls but NOT implementations, so restore the resolving
  // default here or a per-test override leaks into the next case.
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async () => undefined);
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async () => undefined);
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    impersonator: null,
  });
});

describe('setTokens', () => {
  it('exposes the refreshed access token before the keystore write settles (the 511×401 bug)', () => {
    useAuthStore.setState({ accessToken: 'expired', refreshToken: 'old-refresh' });
    // A keystore write that NEVER settles — the pathological end of the native
    // round-trip the old implementation awaited before touching the store.
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(() => new Promise(() => {}));

    useAuthStore.getState().setTokens('fresh-access', 'fresh-refresh');

    // No await: this is the window in which api.ts re-sends the original request.
    expect(useAuthStore.getState().accessToken).toBe('fresh-access');
    expect(useAuthStore.getState().refreshToken).toBe('fresh-refresh');
  });

  it('still persists to the keystore so the session survives a cold start', async () => {
    useAuthStore.getState().setTokens('fresh-access', 'fresh-refresh');
    await new Promise<void>((r) => setImmediate(() => r()));

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', 'fresh-access');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'fresh-refresh');
  });

  it('keeps the in-memory session alive when the keystore write fails, and reports it', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keystore unavailable'));

    useAuthStore.getState().setTokens('fresh-access', 'fresh-refresh');
    await new Promise<void>((r) => setImmediate(() => r()));

    // A failed write must never cost the athlete the session they are mid-workout in.
    expect(useAuthStore.getState().accessToken).toBe('fresh-access');
    expect(captureSentryException).toHaveBeenCalled();
  });
});

describe('setAuth', () => {
  it('authenticates synchronously so the first request after login carries the token', () => {
    useAuthStore.getState().setAuth(USER, 'access-1', 'refresh-1');

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('access-1');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-1');
  });
});

describe('logout', () => {
  it('clears memory synchronously so no request can carry the dead token', () => {
    useAuthStore.setState({ accessToken: 'live', refreshToken: 'live-refresh', isAuthenticated: true });
    // A keystore that never settles: api.ts calls logout() un-awaited, so waiting
    // on the deletes would keep serving the dead token to every request meanwhile.
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(() => new Promise(() => {}));

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('impersonation', () => {
  it('swaps to the target token in memory before the keystore settles', async () => {
    useAuthStore.setState({
      user: { id: 'admin', email: 'admin@x.y' } as never,
      accessToken: 'admin-access',
      refreshToken: 'admin-refresh',
      isAuthenticated: true,
    });
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(() => new Promise(() => {}));

    void useAuthStore.getState().startImpersonation({ id: 'target' } as never, 'target-access');

    // Requests must stop carrying the ADMIN's token immediately.
    expect(useAuthStore.getState().accessToken).toBe('target-access');
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it('restores the admin session in memory before the keystore settles', async () => {
    useAuthStore.setState({
      user: { id: 'target' } as never,
      accessToken: 'target-access',
      refreshToken: null,
      isAuthenticated: true,
      impersonator: {
        user: { id: 'admin' } as never,
        accessToken: 'admin-access',
        refreshToken: 'admin-refresh',
      },
    });
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(() => new Promise(() => {}));

    void useAuthStore.getState().stopImpersonation();

    expect(useAuthStore.getState().accessToken).toBe('admin-access');
    expect(useAuthStore.getState().refreshToken).toBe('admin-refresh');
    expect(useAuthStore.getState().impersonator).toBeNull();
  });
});
