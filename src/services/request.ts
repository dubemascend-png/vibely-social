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
  let lastError: unknown;
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
  if (/invalid login credentials/.test(message)) return 'That email and password don’t match. Check them and try again.';
  if (/email not confirmed/.test(message)) return 'Please confirm your email from the link we sent you before signing in.';
  if (/rate limit|too many requests|over_email_send_rate_limit/.test(message)) return 'You’ve made several requests in a short time. Please wait a little and try again.';
  if (/duplicate key|already exists|unique constraint/.test(message)) return 'That item already exists. Refresh and try again.';
  if (/row-level security|permission denied|not allowed/.test(message)) return 'You don’t have permission to do that.';
  if (/failed to fetch|networkerror|fetch failed/.test(message)) return 'We couldn’t reach Vibe.ly. Check your connection and try again.';
  return value.message || fallback;
}
