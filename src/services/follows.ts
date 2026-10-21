import { supabase } from '../supabase';
import { throwIfError } from './request';

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error('You cannot follow your own account.');
  const { error } = await supabase.from('follows').upsert({ follower_id: followerId, following_id: followingId }, { onConflict: 'follower_id,following_id', ignoreDuplicates: true });
  throwIfError(error);
}
export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
  throwIfError(error);
}
export async function listFollowing(userId: string) {
  const { data, error } = await supabase.from('follows').select('following_id,created_at').eq('follower_id', userId).order('created_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}
