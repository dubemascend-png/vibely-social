import { supabase } from '../supabase';
import { throwIfError } from './request';

export async function recordRecommendationFeedback(userId: string, postId: string, action: 'not_interested' | 'show_less' | 'show_more') {
  const { error } = await supabase.from('recommendation_feedback').upsert({ user_id: userId, post_id: postId, feedback_type: action }, { onConflict: 'user_id,post_id' });
  throwIfError(error);
}
export async function recordRecommendationEvent(userId: string, postId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  const { error } = await supabase.from('recommendation_events').insert({ user_id: userId, post_id: postId, event_type: eventType, metadata });
  throwIfError(error);
}
