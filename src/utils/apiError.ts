import axios from 'axios';

/** Error body the NestJS backend returns (`{ statusCode, message, error }`). */
export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

/**
 * The message to show the user for a failed request.
 *
 * Every call site used to do this inline off a `catch (e: any)`, which meant a
 * typo like `e.reponse` compiled fine and silently fell through to the fallback.
 *
 * `class-validator` returns an ARRAY of messages when a DTO fails, so those are
 * joined one-per-line — which is what the call sites that handled it were already
 * doing by hand, and what the ones that forgot should have been doing.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) return msg.length ? msg.join('\n') : fallback;
    if (typeof msg === 'string' && msg) return msg;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** HTTP status of a failed request, or undefined if it never reached the server. */
export function apiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
