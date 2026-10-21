import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function getProfile(userId: string) {
  return withRetry(async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    throwIfError(error);
    return data;
  });
}
export async function updateOwnProfile(userId: string, patch: { display_name?: string; username?: string; bio?: string; avatar_url?: string | null; cover_url?: string | null; website?: string | null }) {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single();
  throwIfError(error);
  return data;
}
export async function searchProfiles(query: string, limit = 20) {
  const q = query.trim().replace(/[,%()]/g, ' ');
  if (!q) return [];
  const { data, error } = await supabase.from('profiles').select('id,username,display_name,avatar_url,bio,is_verified').or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(Math.min(50, Math.max(1, limit)));
  throwIfError(error);
  return data ?? [];
}
