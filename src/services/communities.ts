import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function listCommunities(limit = 30) {
  return withRetry(async () => {
    const { data, error } = await supabase.from('communities').select('*').order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
    throwIfError(error);
    return data ?? [];
  });
}
export async function createCommunity(input: { name: string; slug: string; description?: string; created_by: string; privacy?: 'public' | 'private' | 'invite_only'; rules?: string[]; topics?: string[]; cover_url?: string | null }) {
  const name = input.name.trim();
  if (name.length < 3 || name.length > 80) throw new Error('Community names must be 3–80 characters.');
  const { data, error } = await supabase.from('communities').insert({ ...input, name, description: input.description?.trim() ?? '', privacy: input.privacy ?? 'public', rules: (input.rules ?? []).map(rule => rule.trim()).filter(Boolean).slice(0,10), topics: (input.topics ?? []).map(topic => topic.trim()).filter(Boolean).slice(0,10), cover_url: input.cover_url ?? null }).select('*').single();
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

export async function listCommunityPosts(communityId: string, limit = 100) {
  return withRetry(async () => {
    const { data, error } = await supabase.from('community_posts').select('id,community_id,author_id,body,created_at').eq('community_id', communityId).order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
    throwIfError(error);
    return data ?? [];
  });
}
export async function createCommunityPost(communityId: string, authorId: string, body: string) {
  const cleanBody = body.trim();
  if (!cleanBody || cleanBody.length > 5000) throw new Error('Community posts must be between 1 and 5,000 characters.');
  const { data, error } = await supabase.from('community_posts').insert({ community_id: communityId, author_id: authorId, body: cleanBody }).select('id,community_id,author_id,body,created_at').single();
  throwIfError(error);
  return data;
}
export async function deleteOwnCommunityPost(postId: string, authorId: string) {
  const { error } = await supabase.from('community_posts').delete().eq('id', postId).eq('author_id', authorId);
  throwIfError(error);
}

export async function listPublicCommunities(limit = 60) {
  const { data, error } = await supabase.from('communities').select('id,name,slug,description,privacy,created_at').eq('privacy', 'public').order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
  throwIfError(error);
  return data ?? [];
}
export async function listCommunityMembershipIds(userId: string) {
  const { data, error } = await supabase.from('community_members').select('community_id').eq('user_id', userId);
  throwIfError(error);
  return (data ?? []).map(row => row.community_id);
}
