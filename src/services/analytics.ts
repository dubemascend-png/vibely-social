import { supabase } from '../supabase';
import { throwIfError } from './request';

export type AnalyticsEvent = 'screen_view' | 'post_created' | 'video_watched' | 'share' | 'save';
export async function trackEvent(userId: string | null, event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  // Analytics is intentionally best-effort; it must never block a core user action.
  if (!userId) return;
  try {
    const { error } = await supabase.from('analytics_events').insert({ user_id: userId, event_name: event, properties });
    if (error && error.code !== '42P01' && error.code !== 'PGRST205') throwIfError(error);
  } catch {
    // The analytics table may not exist in every deployed schema yet. Never fail the primary flow.
  }
}
