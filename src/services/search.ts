import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function searchPeople(query: string, limit = 20) {
  const q = query.trim().replace(/[,%()]/g, ' ');
  if (!q) return [];
  return withRetry(async () => {
    const { data, error } = await supabase.from('profiles').select('id,username,display_name,avatar_url,bio,is_verified').or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(Math.min(50, Math.max(1, limit)));
    throwIfError(error);
    return data ?? [];
  });
}
export async function searchPosts(query: string, limit = 20) {
  const q = query.trim();
  if (!q) return [];
  return withRetry(async () => {
    const { data, error } = await supabase.from('posts').select('*,profiles!posts_author_id_fkey(id,username,display_name,avatar_url,is_verified)').ilike('caption', '%' + q.replace(/[%_,]/g, ' ') + '%').order('created_at', { ascending: false }).limit(Math.min(50, Math.max(1, limit)));
    throwIfError(error);
    return data ?? [];
  });
}
