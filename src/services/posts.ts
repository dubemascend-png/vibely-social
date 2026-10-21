import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function listFeed(options: { limit?: number; before?: string; authorId?: string } = {}) {
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  return withRetry(async () => {
    let query = supabase.from('posts').select('*,profiles!posts_author_id_fkey(id,username,display_name,avatar_url,is_verified),likes(user_id),comments(id,body,author_id,created_at)').order('created_at', { ascending: false }).limit(limit);
    if (options.before) query = query.lt('created_at', options.before);
    if (options.authorId) query = query.eq('author_id', options.authorId);
    const { data, error } = await query;
    throwIfError(error);
    return data ?? [];
  });
}
export async function createPost(input: { author_id: string; caption: string; media_url?: string | null; media_type?: 'text' | 'image' | 'video'; visibility?: 'public' | 'followers' }) {
  const caption = input.caption.trim();
  if (!caption && !input.media_url) throw new Error('Add a caption or media before publishing.');
  if (caption.length > 5000) throw new Error('Captions must be 5,000 characters or fewer.');
  const { data, error } = await supabase.from('posts').insert({ ...input, caption }).select('*').single();
  throwIfError(error);
  return data;
}
export async function updateOwnPost(postId: string, authorId: string, patch: { caption?: string; visibility?: 'public' | 'followers' }) {
  const { data, error } = await supabase.from('posts').update(patch).eq('id', postId).eq('author_id', authorId).select('*').single();
  throwIfError(error);
  return data;
}
export async function deleteOwnPost(postId: string, authorId: string) {
  const { error } = await supabase.from('posts').delete().eq('id', postId).eq('author_id', authorId);
  throwIfError(error);
}
