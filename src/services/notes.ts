import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function listActiveNotes(userId: string, limit = 50) {
  return withRetry(async () => {
    const { data, error } = await supabase.from('user_notes').select('id,user_id,body,expires_at,created_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
    throwIfError(error);
    return (data ?? []).sort((a, b) => Number(b.user_id === userId) - Number(a.user_id === userId));
  });
}
export async function createNote(userId: string, body: string) {
  const clean = body.trim();
  if (!clean || clean.length > 80) throw new Error('Notes must be between 1 and 80 characters.');
  const { data, error } = await supabase.from('user_notes').insert({ user_id: userId, body: clean }).select('*').single();
  throwIfError(error);
  return data;
}
export async function deleteOwnNote(noteId: string, userId: string) {
  const { error } = await supabase.from('user_notes').delete().eq('id', noteId).eq('user_id', userId);
  throwIfError(error);
}
