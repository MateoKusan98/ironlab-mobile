import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { UserResponse } from '@shared';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Sentry runs only in real builds with a DSN configured. Dev is excluded on
 * purpose: Metro already shows every error in the red box, and dev noise would
 * drown the reports that come from actual devices.
 */
export const sentryEnabled = !!dsn && !__DEV__;

/**
 * Crash reporting for the app. This complements — does not replace — the
 * existing logService/admin Error Logs pipeline: logService only sees what we
 * instrumented, while Sentry also catches native crashes, gives us grouped
 * issues with release/device breakdowns, and keeps breadcrumbs from before the
 * crash. Call once, as early as possible at module load.
 */
export function initSentry(): void {
  if (!sentryEnabled) return;

  Sentry.init({
    dsn,
    // Matches the runtimeVersion policy (appVersion), so an issue points at a
    // specific released build.
    release: Constants.expoConfig?.version,
    environment: process.env.EXPO_PUBLIC_ENV ?? 'production',
    // Low sample rate: this install is for crashes, and traces are what burns
    // the event quota on a free plan.
    tracesSampleRate: 0.2,
    // Athletes' training and body data are none of Sentry's business — no
    // request bodies, no IPs. Identity is set deliberately in setSentryUser.
    sendDefaultPii: false,
  });
}

/**
 * Ties events to an account so a report can be traced back to who hit it.
 * Called on every auth transition, including impersonation start/stop, so the
 * attached identity is always the session actually in use.
 */
export function setSentryUser(user: UserResponse | null): void {
  if (!sentryEnabled) return;
  Sentry.setUser(user ? { id: user.id, email: user.email } : null);
}

/**
 * Records a failed request as a breadcrumb rather than an event. Breadcrumbs
 * cost nothing against the quota and are what makes a later crash readable —
 * "the app died right after /ai-coach/generate-plan 500'd" instead of a bare
 * stack trace.
 */
export function addApiFailureBreadcrumb(data: {
  method?: string;
  url?: string;
  statusCode?: number;
  code?: string;
}): void {
  if (!sentryEnabled) return;
  Sentry.addBreadcrumb({
    category: 'http',
    type: 'http',
    level: data.statusCode && data.statusCode >= 500 ? 'error' : 'warning',
    message: `${data.method ?? 'GET'} ${data.url ?? 'unknown'} → ${data.statusCode ?? data.code ?? 'failed'}`,
    data,
  });
}

/** Manual report for a caught error that the user was shielded from. */
export function captureSentryException(error: unknown, context?: Record<string, unknown>): void {
  if (!sentryEnabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export { Sentry };
