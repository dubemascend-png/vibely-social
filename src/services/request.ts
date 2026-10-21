import type { PostgrestError } from '@supabase/supabase-js';

export class ServiceError extends Error {
  code?: string;
  status?: number;
  retryable: boolean;
  constructor(message: string, options: { code?: string; status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = 'ServiceError';
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

export function toServiceError(error: unknown): ServiceError {
  if (error instanceof ServiceError) return error;
  const candidate = error as { message?: string; code?: string; status?: number; name?: string } | null;
  const message = candidate?.message || 'Something went wrong. Please try again.';
  const status = candidate?.status;
  const code = candidate?.code;
  const retryable = !isOnline() || status === 408 || status === 429 || (typeof status === 'number' && status >= 500) ||
    /network|fetch failed|timeout|temporar|connection reset/i.test(message);
  return new ServiceError(message, { code, status, retryable });
}

export function throwIfError(error: PostgrestError | null): void {
  if (error) throw toServiceError(error);
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

export async function withRetry<T>(operation: () => Promise<T>, options: { attempts?: number; baseDelayMs?: number } = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = Math.max(100, options.baseDelayMs ?? 350);
  let lastError: ServiceError = new ServiceError('The request could not be completed.');
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (!isOnline()) throw new ServiceError('You appear to be offline. Check your connection and try again.', { retryable: true });
    try {
      return await operation();
    } catch (error) {
      lastError = toServiceError(error);
      if (!lastError.retryable || attempt === attempts - 1) break;
      await new Promise(resolve => setTimeout(resolve, baseDelayMs * (2 ** attempt) + Math.round(Math.random() * 120)));
    }
  }
  throw toServiceError(lastError);
}

export function friendlyError(error: unknown, fallback = 'We couldn’t complete that just now. Please try again.'): string {
  const value = toServiceError(error);
  const message = value.message.toLowerCase();
  if (!isOnline()) return 'You’re offline. Reconnect to continue.';
  if (/invalid login credentials|invalid_credentials/.test(message)) return 'We couldn’t sign you in with those details. Check your email and password, or choose “Forgot password?” to reset it.';
  if (/email not confirmed|email_not_confirmed/.test(message)) return 'Please confirm your email using the verification link before signing in. If it has expired, request a new one.';
  if (/refresh token not found|invalid refresh token|session not found/.test(message)) return 'Your saved sign-in session has expired. Sign in again to continue.';
  if (/user is banned|user_banned|account is disabled/.test(message)) return 'This account is currently disabled. If you believe this is a mistake, contact Vibe.ly support or use the appeal option shown on the account notice.';
  if (/rate limit|too many requests|over_email_send_rate_limit|over_request_rate_limit|429/.test(message)) return 'Too many attempts in a short time. Please wait a few minutes before trying again. For password recovery, avoid repeatedly requesting emails.';
  if (/duplicate key|already exists|unique constraint/.test(message)) return 'That item already exists. Refresh and try again.';
  if (/row-level security|permission denied|not allowed/.test(message)) return 'You don’t have permission to do that.';
  if (/failed to fetch|networkerror|fetch failed/.test(message)) return 'We couldn’t reach Vibe.ly. Check your connection and try again.';
  return value.message || fallback;
}
