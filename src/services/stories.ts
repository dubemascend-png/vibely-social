import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export type StoryRecord = { id: string; user_id: string; media_url: string; media_type: 'image'|'video'; caption: string; audience: 'public'|'followers'; expires_at: string; created_at: string; profile?: { username: string|null; display_name: string|null; avatar_url: string|null; is_verified?: boolean } };

export async function listActiveStories(limit = 100) {
  return withRetry(async () => {
    const { data, error } = await supabase.from('stories').select('id,user_id,media_url,media_type,caption,audience,expires_at,created_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(Math.min(200, Math.max(1, limit)));
    throwIfError(error);
    const stories = data ?? [];
    const ids = [...new Set(stories.map(story => story.user_id))];
    const profiles = ids.length ? await supabase.from('profiles').select('id,username,display_name,avatar_url,is_verified').in('id', ids) : { data: [], error: null };
    throwIfError(profiles.error);
    const byId = new Map((profiles.data ?? []).map(profile => [profile.id, profile]));
    return stories.map(story => ({ ...story, profile: byId.get(story.user_id) })) as StoryRecord[];
  });
}
export async function createStory(input: { userId: string; mediaUrl: string; mediaType: 'image'|'video'; caption?: string; audience?: 'public'|'followers' }) {
  const caption = (input.caption ?? '').trim();
  if (caption.length > 500) throw new Error('Story captions must be 500 characters or fewer.');
  const { data, error } = await supabase.from('stories').insert({ user_id: input.userId, media_url: input.mediaUrl, media_type: input.mediaType, caption, audience: input.audience ?? 'followers' }).select('*').single();
  throwIfError(error);
  if (!data) throw new Error('Your story could not be published. Please retry.');
  return data as StoryRecord;
}
export async function deleteOwnStory(storyId: string, userId: string) {
  const { error } = await supabase.from('stories').delete().eq('id', storyId).eq('user_id', userId);
  throwIfError(error);
}
