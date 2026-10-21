import { supabase } from '../supabase';
import { throwIfError } from './request';

export async function listComments(postId: string, limit = 50) {
  const { data, error } = await supabase.from('comments').select('*,profiles!comments_author_id_fkey(id,username,display_name,avatar_url,is_verified)').eq('post_id', postId).order('created_at', { ascending: true }).limit(Math.min(100, Math.max(1, limit)));
  throwIfError(error);
  return data ?? [];
}
export async function createComment(postId: string, authorId: string, body: string, parentId?: string) {
  const text = body.trim();
  if (!text || text.length > 2000) throw new Error('Comments must be between 1 and 2,000 characters.');
  // parentId is accepted for threaded API consistency; the base comments table currently supports flat comments only.
  const { data, error } = await supabase.from('comments').insert({ post_id: postId, author_id: authorId, body: text }).select('*').single();
  throwIfError(error);
  return data;
}
