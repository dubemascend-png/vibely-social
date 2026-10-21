import type { AuthChangeEvent, Session, SignUpWithPasswordCredentials, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured, getAppRedirectUrl } from '../supabase';
import { toServiceError } from './request';

export { supabaseConfigured };

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toServiceError(error);
  return data.session;
}

export function subscribeToAuthChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw toServiceError(error);
  if (!data.user) throw new Error('Sign in did not return a user. Please try again.');
  return data.user;
}

export async function signUp(email: string, password: string, displayName: string): Promise<{ user: User | null; needsEmailConfirmation: boolean }> {
  const credentials: SignUpWithPasswordCredentials = {
    email: email.trim(),
    password,
    options: { data: { display_name: displayName.trim() || email.split('@')[0] }, emailRedirectTo: getAppRedirectUrl() },
  };
  const { data, error } = await supabase.auth.signUp({ ...credentials, email: email.trim().toLowerCase() });
  if (error) throw toServiceError(error);
  return { user: data.user, needsEmailConfirmation: !data.session };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: getAppRedirectUrl() });
  if (error) throw toServiceError(error);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toServiceError(error);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toServiceError(error);
}
