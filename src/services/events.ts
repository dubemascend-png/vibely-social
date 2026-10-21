import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function listCommunityEvents(communityId?: string, limit = 30) {
  return withRetry(async () => {
    let query = supabase.from('community_events').select('*').eq('status', 'published').gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(Math.min(100, Math.max(1, limit)));
    if (communityId) query = query.eq('community_id', communityId);
    const { data, error } = await query;
    throwIfError(error);
    return data ?? [];
  });
}
export async function rsvpToEvent(eventId: string, userId: string, response: 'going' | 'interested' | 'not_going' = 'going') {
  const { error } = await supabase.from('community_event_rsvps').upsert({ event_id: eventId, user_id: userId, response }, { onConflict: 'event_id,user_id' });
  throwIfError(error);
}

export async function cancelEventRsvp(eventId: string, userId: string) {
  const { error } = await supabase.from('community_event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId);
  throwIfError(error);
}
export async function listEventRsvpIds(userId: string) {
  const { data, error } = await supabase.from('community_event_rsvps').select('event_id').eq('user_id', userId);
  throwIfError(error);
  return (data ?? []).map(row => row.event_id);
}
