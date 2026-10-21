import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export type MessageRequest = { id: string; sender_id: string; recipient_id: string; conversation_id: string|null; status: 'pending'|'accepted'|'declined'|'blocked'; created_at: string; updated_at: string };
export async function listIncomingMessageRequests(userId: string) {
  return withRetry(async () => {
    const { data, error } = await supabase.from('message_requests').select('*').eq('recipient_id', userId).eq('status', 'pending').order('created_at', { ascending: false }).limit(100);
    throwIfError(error);
    return (data ?? []) as MessageRequest[];
  });
}
export async function createMessageRequest(senderId: string, recipientId: string) {
  if (senderId === recipientId) throw new Error('You cannot message yourself.');
  const { data, error } = await supabase.from('message_requests').insert({ sender_id: senderId, recipient_id: recipientId, status: 'pending' }).select('*').single();
  throwIfError(error);
  return data as MessageRequest;
}
export async function respondToMessageRequest(requestId: string, recipientId: string, status: 'accepted'|'declined'|'blocked', conversationId?: string) {
  const { data, error } = await supabase.from('message_requests').update({ status, conversation_id: conversationId ?? null, updated_at: new Date().toISOString() }).eq('id', requestId).eq('recipient_id', recipientId).eq('status', 'pending').select('*').single();
  throwIfError(error);
  return data as MessageRequest;
}

export async function acceptMessageRequest(request: MessageRequest, recipientId: string) {
  if (request.recipient_id !== recipientId || request.status !== 'pending') throw new Error('This request is no longer available.');
  const { data: conversation, error: conversationError } = await supabase.from('conversations').insert({ created_by: recipientId, is_group: false, title: null }).select('id').single();
  throwIfError(conversationError);
  if (!conversation) throw new Error('Could not create a conversation for this request.');
  const members = await supabase.from('conversation_members').insert([{ conversation_id: conversation.id, user_id: recipientId }, { conversation_id: conversation.id, user_id: request.sender_id }]);
  if (members.error) {
    await supabase.from('conversations').delete().eq('id', conversation.id).eq('created_by', recipientId);
    throwIfError(members.error);
  }
  const { data, error } = await supabase.from('message_requests').update({ status: 'accepted', conversation_id: conversation.id, updated_at: new Date().toISOString() }).eq('id', request.id).eq('recipient_id', recipientId).eq('status', 'pending').select('*').single();
  if (error) {
    await supabase.from('conversations').delete().eq('id', conversation.id).eq('created_by', recipientId);
    throwIfError(error);
  }
  return { request: data as MessageRequest, conversationId: conversation.id };
}
