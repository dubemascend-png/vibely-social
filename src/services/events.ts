import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function listCommunityEvents(communityId?: string, limit = 30) {
  return withRetry(async () => {
    let query = supabase.from('community_events').select('*').order('starts_at', { ascending: true }).limit(Math.min(100, Math.max(1, limit)));
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
