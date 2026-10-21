import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export type DraftKind = 'post' | 'video' | 'story' | 'poll' | 'community_post' | 'event';
export type PostDraft = { id: string; user_id: string; kind: DraftKind; title: string; caption: string; payload: Record<string, unknown>; status: 'draft' | 'scheduled' | 'published'; scheduled_at: string | null; created_at: string; updated_at: string };

export async function listOwnDrafts(userId: string) {
  return withRetry(async () => {
    const { data, error } = await supabase.from('post_drafts').select('*').eq('user_id', userId).neq('status', 'published').order('updated_at', { ascending: false }).limit(100);
    throwIfError(error);
    return (data ?? []) as PostDraft[];
  });
}
export async function createDraft(input: { userId: string; kind: DraftKind; title?: string; caption?: string; payload?: Record<string, unknown> }) {
  const { data, error } = await supabase.from('post_drafts').insert({ user_id: input.userId, kind: input.kind, title: (input.title ?? '').trim().slice(0, 160), caption: (input.caption ?? '').trim().slice(0, 5000), payload: input.payload ?? {}, status: 'draft', updated_at: new Date().toISOString() }).select('*').single();
  throwIfError(error);
  return data as PostDraft;
}
export async function scheduleDraft(draftId: string, userId: string, scheduledAt: string) {
  const date = new Date(scheduledAt);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new Error('Choose a future date and time.');
  const { data, error } = await supabase.from('post_drafts').update({ status: 'scheduled', scheduled_at: date.toISOString(), updated_at: new Date().toISOString() }).eq('id', draftId).eq('user_id', userId).select('*').single();
  throwIfError(error);
  return data as PostDraft;
}
export async function deleteDraft(draftId: string, userId: string) {
  const { error } = await supabase.from('post_drafts').delete().eq('id', draftId).eq('user_id', userId);
  throwIfError(error);
}
