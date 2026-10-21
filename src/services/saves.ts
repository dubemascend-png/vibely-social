import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function listSavedPostIds(userId: string) {
  const { data, error } = await supabase.from('post_saves').select('post_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(500);
  throwIfError(error);
  return (data ?? []).map(row => row.post_id);
}
export async function savePost(userId: string, postId: string) {
  const { error } = await supabase.from('post_saves').upsert({ user_id: userId, post_id: postId }, { onConflict: 'user_id,post_id', ignoreDuplicates: true });
  throwIfError(error);
}
export async function unsavePost(userId: string, postId: string) {
  const { error } = await supabase.from('post_saves').delete().eq('user_id', userId).eq('post_id', postId);
  throwIfError(error);
}
export async function listSavedPosts(userId: string, limit = 100) {
  return withRetry(async () => {
    const ids = await listSavedPostIds(userId);
    if (!ids.length) return [];
    const { data, error } = await supabase.from('posts').select('*,profiles!posts_author_id_fkey(id,username,display_name,avatar_url,is_verified),likes(user_id),comments(id,body,author_id)').in('id', ids.slice(0, Math.min(100, Math.max(1, limit))));
    throwIfError(error);
    const order = new Map(ids.map((id,index)=>[id,index]));
    return (data ?? []).sort((a,b)=>(order.get(a.id)??0)-(order.get(b.id)??0));
  });
}
export async function listLikedPosts(userId: string, limit = 100) {
  return withRetry(async () => {
    const { data: likes, error: likesError } = await supabase.from('likes').select('post_id,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
    throwIfError(likesError);
    const ids = (likes ?? []).map(row => row.post_id);
    if (!ids.length) return [];
    const { data, error } = await supabase.from('posts').select('*,profiles!posts_author_id_fkey(id,username,display_name,avatar_url,is_verified),likes(user_id),comments(id,body,author_id)').in('id', ids);
    throwIfError(error);
    const order = new Map(ids.map((id,index)=>[id,index]));
    return (data ?? []).sort((a,b)=>(order.get(a.id)??0)-(order.get(b.id)??0));
  });
}
