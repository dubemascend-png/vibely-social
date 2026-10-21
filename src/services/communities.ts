import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function listCommunities(limit = 30) {
  return withRetry(async () => {
    const { data, error } = await supabase.from('communities').select('*').order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
    throwIfError(error);
    return data ?? [];
  });
}
export async function createCommunity(input: { name: string; slug: string; description?: string; created_by: string; privacy?: 'public' | 'private' }) {
  const name = input.name.trim();
  if (name.length < 3 || name.length > 80) throw new Error('Community names must be 3–80 characters.');
  const { data, error } = await supabase.from('communities').insert({ ...input, name, description: input.description?.trim() ?? '', privacy: input.privacy ?? 'public' }).select('*').single();
  throwIfError(error);
  return data;
}
export async function joinCommunity(communityId: string, userId: string) {
  const { error } = await supabase.from('community_members').upsert({ community_id: communityId, user_id: userId, role: 'member' }, { onConflict: 'community_id,user_id', ignoreDuplicates: true });
  throwIfError(error);
}
export async function leaveCommunity(communityId: string, userId: string) {
  const { error } = await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId);
  throwIfError(error);
}
