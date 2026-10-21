import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function listConversationMessages(conversationId: string, limit = 50, before?: string) {
  return withRetry(async () => {
    let query = supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
    if (before) query = query.lt('created_at', before);
    const { data, error } = await query;
    throwIfError(error);
    return (data ?? []).reverse();
  });
}
export async function sendMessage(input: { conversation_id: string; sender_id: string; body: string }) {
  const body = input.body.trim();
  if (!body || body.length > 10000) throw new Error('Messages must be between 1 and 10,000 characters.');
  const { data, error } = await supabase.from('messages').insert({ ...input, body }).select('*').single();
  throwIfError(error);
  return data;
}
export function subscribeToConversation(conversationId: string, onInsert: (message: Record<string, unknown>) => void) {
  const channel = supabase.channel('messages:' + conversationId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + conversationId }, payload => onInsert(payload.new as Record<string, unknown>)).subscribe();
  return () => { void supabase.removeChannel(channel); };
}
