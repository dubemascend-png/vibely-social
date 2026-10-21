import { supabase } from '../supabase';
import { throwIfError } from './request';

export async function recordRecommendationFeedback(userId: string, postId: string, action: 'not_interested' | 'show_less' | 'like' | 'save' | 'share' | 'follow' | 'hide' | 'dismiss') {
  const feedback = action === 'not_interested' ? 'not_relevant' : action;
  const { error } = await supabase.from('recommendation_feedback').insert({ user_id: userId, post_id: postId, feedback });
  throwIfError(error);
}
export async function recordRecommendationEvent(userId: string, postId: string, eventType: 'impression' | 'open' | 'watch' | 'like' | 'save' | 'share' | 'follow' | 'hide' | 'skip' | 'report', metadata: Record<string, unknown> = {}) {
  const { error } = await supabase.from('recommendation_events').insert({ user_id: userId, post_id: postId, event_type: eventType, event_key: crypto.randomUUID(), metadata });
  throwIfError(error);
}
