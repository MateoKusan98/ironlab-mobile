import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth.store';
import { logService } from './log.service';

const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://localhost:3020/api`;

// The bare refresh call below has no client timeout, so if its network leg stalls
// the whole request chain hangs with no error. This watchdog is the only signal we
// get for that case — it logs a breadcrumb without altering behaviour.
const STALL_MS = 12000;

// Transparently retry requests that fail at the network level (no HTTP response
// ever came back). The common trigger is a keep-alive socket the server/proxy
// closed during a long idle stretch — e.g. resting between sets: the first save
// after the rest writes onto a dead connection and errors instantly, while a
// fresh connection succeeds. This automates the "just tap again" the user would
// otherwise do by hand. Only no-response failures are retried; a real HTTP
// error (4xx/5xx) is a genuine server answer and is never retried here.
const MAX_NETWORK_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 400;

function isRetryableNetworkError(error: AxiosError): boolean {
  if (error.code === 'ERR_CANCELED') return false; // deliberate cancel — leave it
  // A response means the server was reached and answered — not a transient
  // connection failure, so don't retry (would risk masking real errors).
  return !error.response;
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Turn an axios failure into a structured log entry.
function logApiError(error: AxiosError) {
  const cfg = (error.config ?? {}) as InternalAxiosRequestConfig & { metadata?: { startTime: number } };
  const durationMs = cfg.metadata?.startTime ? Date.now() - cfg.metadata.startTime : undefined;
  const status = error.response?.status;
  const serverMsg = (error.response?.data as any)?.message;
  const detail = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg ?? error.message;
  logService.capture({
    level: 'error',
    source: 'api',
    message: `${error.code ?? 'API_ERROR'}: ${detail}`,
    route: cfg.url,
    method: cfg.method?.toUpperCase(),
    statusCode: status,
    context: { durationMs, code: error.code },
  });
}

// Request interceptor: attach access token + stamp start time for duration metrics
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    (config as any).metadata = { startTime: Date.now() };
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: auto-refresh on 401
let isRefreshing = false;
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Impersonation sessions have no refresh token by design — when the
      // short-lived access token lapses, exit back to the admin session
      // instead of attempting a refresh or logging out entirely.
      if (useAuthStore.getState().impersonator) {
        await useAuthStore.getState().stopImpersonation();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        logApiError(error);
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      // Watchdog: the refresh call has no timeout, so a stalled network leg here
      // hangs the original request forever with no error. Leave a breadcrumb if it
      // takes too long — this is the silent "infinite Saving" signature.
      const refreshStall = setTimeout(() => {
        logService.capture({
          level: 'stalled',
          source: 'stall',
          message: `Token refresh stalled >${STALL_MS}ms — original request (${originalRequest.method?.toUpperCase()} ${originalRequest.url}) is hanging`,
          route: '/auth/refresh',
          method: 'POST',
          context: { stallMs: STALL_MS, blockedRequest: originalRequest.url },
        });
      }, STALL_MS);

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken as string;
        const newRefreshToken = data.data.refreshToken as string;

        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        logService.capture({
          level: 'error',
          source: 'api',
          message: `Token refresh failed: ${(refreshError as AxiosError)?.message ?? 'unknown'} — user logged out`,
          route: '/auth/refresh',
          method: 'POST',
          statusCode: (refreshError as AxiosError)?.response?.status,
        });
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        clearTimeout(refreshStall);
        isRefreshing = false;
      }
    }

    // Transient network failure (dead keep-alive socket, brief connectivity
    // blip): retry a couple of times with a short backoff before surfacing it,
    // so a single stale connection doesn't turn into a user-facing error.
    const retryCfg = error.config as (InternalAxiosRequestConfig & { _netRetryCount?: number }) | undefined;
    if (retryCfg && isRetryableNetworkError(error)) {
      retryCfg._netRetryCount = (retryCfg._netRetryCount ?? 0) + 1;
      if (retryCfg._netRetryCount <= MAX_NETWORK_RETRIES) {
        await new Promise((resolve) => setTimeout(() => resolve(undefined), RETRY_BASE_DELAY_MS * retryCfg._netRetryCount!));
        return api(retryCfg);
      }
      logService.capture({
        level: 'error',
        source: 'api',
        message: `${error.code ?? 'NETWORK_ERROR'} after ${MAX_NETWORK_RETRIES} retries: ${error.message}`,
        route: retryCfg.url,
        method: retryCfg.method?.toUpperCase(),
        context: { code: error.code, retries: MAX_NETWORK_RETRIES },
      });
      return Promise.reject(error);
    }

    logApiError(error);
    return Promise.reject(error);
  },
);
