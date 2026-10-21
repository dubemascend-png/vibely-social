import { supabase } from '../supabase';
import { throwIfError, withRetry } from './request';

export async function listNotifications(userId: string, limit = 40) {
  return withRetry(async () => {
    const { data, error } = await supabase.from('notifications').select('*,actor:profiles!notifications_actor_id_fkey(id,username,display_name,avatar_url,is_verified)').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
    throwIfError(error);
    return data ?? [];
  });
}
export async function markNotificationRead(notificationId: string, userId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('recipient_id', userId);
  throwIfError(error);
}
export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', userId).eq('is_read', false);
  throwIfError(error);
}
