/**
 * End-to-end cover for the 2026-09-14 logout/401 incident, at the layer that
 * actually broke: what Authorization header the RETRY carries.
 *
 * Prod symptom was 511 logged 401s with zero refresh failures — `/auth/refresh`
 * always succeeded, then the retry went back out with the expired token anyway,
 * because the request interceptor re-stamps Authorization from the store and the
 * store had not been updated yet. Mid-workout set-saves died every ~20 minutes.
 */
import axios from 'axios';
import type { AxiosAdapter } from 'axios';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
}));

jest.mock('../sentry', () => ({
  captureSentryException: jest.fn(),
  addApiFailureBreadcrumb: jest.fn(),
}));

jest.mock('../log.service', () => ({
  logService: { capture: jest.fn() },
}));

/* eslint-disable import/first */
import { api } from '../api';
import { useAuthStore } from '../../stores/auth.store';
/* eslint-enable import/first */

const EXPIRED = 'expired-access-token';
const FRESH = 'fresh-access-token';

/** Every Authorization header the transport actually saw, in order. */
let seen: (string | undefined)[] = [];

/** Stands in for the server: 401s anything that is not the fresh token. */
const adapter: AxiosAdapter = async (config) => {
  const auth = config.headers?.Authorization as string | undefined;
  seen.push(auth);
  if (auth !== `Bearer ${FRESH}`) {
    return Promise.reject(
      Object.assign(new Error('Unauthorized'), {
        isAxiosError: true,
        config,
        response: { status: 401, data: { message: 'Unauthorized' }, config, headers: {}, statusText: 'Unauthorized' },
      }),
    );
  }
  return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
};

beforeEach(() => {
  seen = [];
  jest.clearAllMocks();
  api.defaults.adapter = adapter;
  useAuthStore.setState({
    user: null,
    accessToken: EXPIRED,
    refreshToken: 'old-refresh-token',
    isAuthenticated: true,
    isLoading: false,
    impersonator: null,
  });
  jest.spyOn(axios, 'post').mockResolvedValue({
    data: { data: { accessToken: FRESH, refreshToken: 'new-refresh-token' } },
  });
});

afterEach(() => jest.restoreAllMocks());

it('re-sends the original request with the REFRESHED token, not the expired one', async () => {
  const res = await api.post('/sessions/abc/sets', { weight: 180, reps: 8, rpe: 7 });

  expect(res.status).toBe(200);
  expect(seen).toEqual([`Bearer ${EXPIRED}`, `Bearer ${FRESH}`]);
  // One refresh, and the athlete's set was saved rather than lost.
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
});

it('refreshes once for a burst of concurrent 401s and never logs the athlete out', async () => {
  // Four set-saves in flight when the access token lapses. Each queued retry used
  // to re-enter the refresh branch after the mutex released, firing extra
  // refreshes that rotate the server's single stored hash and strand dead tokens.
  const results = await Promise.all([
    api.post('/sessions/abc/sets', { reps: 1 }),
    api.post('/sessions/abc/sets', { reps: 2 }),
    api.patch('/sessions/sets/xyz', { reps: 3 }),
    api.get('/sessions/active'),
  ]);

  expect(results.every((r) => r.status === 200)).toBe(true);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState().accessToken).toBe(FRESH);
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
});
