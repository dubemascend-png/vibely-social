import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function listVideos(options: { limit?: number; before?: string } = {}) {
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  return withRetry(async () => {
    let query = supabase.from('posts').select('*,profiles!posts_author_id_fkey(id,username,display_name,avatar_url,is_verified),post_media(position,media_assets(object_path,bucket_id,mime_type,video_metadata(title,duration_seconds,playback_status)))').eq('media_type', 'video').order('created_at', { ascending: false }).limit(limit);
    if (options.before) query = query.lt('created_at', options.before);
    const { data, error } = await query;
    throwIfError(error);
    return data ?? [];
  });
}
export async function saveVideo(userId: string, postId: string, collectionType: 'watch_later' | 'history' = 'watch_later', positionSeconds = 0) {
  const { error } = await supabase.from('video_library_items').upsert({ user_id: userId, post_id: postId, collection_type: collectionType, last_position_seconds: Math.max(0, positionSeconds) }, { onConflict: 'user_id,post_id,collection_type' });
  throwIfError(error);
}
export async function removeSavedVideo(userId: string, postId: string, collectionType: 'watch_later' | 'history' = 'watch_later') {
  const { error } = await supabase.from('video_library_items').delete().eq('user_id', userId).eq('post_id', postId).eq('collection_type', collectionType);
  throwIfError(error);
}
export async function recordPlayback(userId: string, postId: string, eventType: 'start' | 'progress' | 'complete', positionSeconds = 0, durationSeconds = 0) {
  const { error } = await supabase.from('video_playback_events').insert({ user_id: userId, post_id: postId, event_type: eventType, event_key: crypto.randomUUID(), position_seconds: Math.max(0, positionSeconds), duration_seconds: Math.max(0, durationSeconds) });
  throwIfError(error);
}

export async function listVideoLibrary(userId: string, collectionType: 'watch_later' | 'history' = 'watch_later', limit = 100) {
  const { data, error } = await supabase.from('video_library_items').select('post_id,last_position_seconds,updated_at,watched_at').eq('user_id', userId).eq('collection_type', collectionType).order('updated_at', { ascending: false }).limit(Math.min(200, Math.max(1, limit)));
  throwIfError(error);
  return data ?? [];
}
