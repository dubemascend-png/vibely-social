import { supabase } from '../supabase';
import { throwIfError } from './request';

export async function setPostLiked(postId: string, userId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase.from('likes').upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
    throwIfError(error);
  } else {
    const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
    throwIfError(error);
  }
}
