import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';
import { useAuthStore } from '../stores/auth.store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://localhost:3020/api`;
const APP_VERSION = Constants.expoConfig?.version ?? undefined;

/**
 * Dedicated client with NO interceptors. The main `api` instance auto-logs failed
 * requests through here, so logging must never flow back through `api` — otherwise
 * a failing log call would log itself forever. This client also has a short timeout
 * and swallows all of its own errors.
 */
const logApi = axios.create({
  baseURL: API_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

export interface ClientLogPayload {
  level?: 'error' | 'warning' | 'fatal' | 'stalled';
  source?: 'api' | 'js' | 'stall' | 'manual';
  message: string;
  stack?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  context?: Record<string, any>;
}

export interface ClientErrorLogEntry {
  id: string;
  email: string | null;
  userId: string | null;
  level: string;
  source: string;
  message: string;
  stack: string | null;
  route: string | null;
  method: string | null;
  statusCode: number | null;
  context: Record<string, any> | null;
  appVersion: string | null;
  platform: string | null;
  createdAt: string;
}

// Guardrails so a crash loop can't flood the backend.
const MAX_PER_MINUTE = 20;
const DEDUPE_MS = 10_000;
let windowStart = Date.now();
let sentInWindow = 0;
const recent = new Map<string, number>(); // signature -> last sent (ms)

export const logService = {
  /** Fire-and-forget. Never throws, never blocks the UI. */
  capture: async (payload: ClientLogPayload): Promise<void> => {
    try {
      const now = Date.now();
      if (now - windowStart > 60_000) {
        windowStart = now;
        sentInWindow = 0;
      }
      if (sentInWindow >= MAX_PER_MINUTE) return;

      const sig = [
        payload.source ?? 'api',
        payload.statusCode ?? '',
        payload.route ?? '',
        (payload.message ?? '').slice(0, 80),
      ].join('|');
      const last = recent.get(sig);
      if (last && now - last < DEDUPE_MS) return;
      recent.set(sig, now);
      sentInWindow++;

      const { user } = useAuthStore.getState();
      await logApi.post('/client-logs', {
        level: payload.level ?? 'error',
        source: payload.source ?? 'api',
        message: (payload.message ?? 'Unknown error').slice(0, 4000),
        stack: payload.stack ? String(payload.stack).slice(0, 20000) : undefined,
        route: payload.route,
        method: payload.method,
        statusCode: payload.statusCode,
        context: payload.context,
        email: user?.email,
        userId: user?.id,
        appVersion: APP_VERSION,
        platform: Platform.OS,
      });
    } catch {
      // Logging must be invisible — never surface its own failures.
    }
  },

  /** Admin-only: fetch recent client logs, optionally filtered by email. */
  getClientLogs: async (
    email?: string,
    level?: string,
    limit = 100,
  ): Promise<ClientErrorLogEntry[]> => {
    const { data } = await api.get<{ data: ClientErrorLogEntry[] }>('/client-logs', {
      params: {
        email: email?.trim() || undefined,
        level: level || undefined,
        limit,
      },
    });
    return data.data;
  },
};
