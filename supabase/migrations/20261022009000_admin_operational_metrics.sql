create or replace function public.admin_dashboard_summary()
returns jsonb language plpgsql stable security definer set search_path to 'public','auth'
as $function$
declare result jsonb;
begin
 if not public.admin_has_permission('dashboard.view') then raise exception 'Administrative permission required' using errcode='42501'; end if;
 select jsonb_build_object(
  'total_users',(select count(*) from auth.users),
  'new_users_today',(select count(*) from auth.users where created_at >= (date_trunc('day',now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')),
  'new_users_7d',(select count(*) from auth.users where created_at >= now()-interval '7 days'),
  'new_users_30d',(select count(*) from auth.users where created_at >= now()-interval '30 days'),
  'dau',(select count(*) from public.profiles where last_seen_at >= now()-interval '24 hours'),
  'mau',(select count(*) from public.profiles where last_seen_at >= now()-interval '30 days'),
  'total_posts',(select count(*) from public.posts),
  'total_videos',(select count(*) from public.posts where media_type='video'),
  'total_communities',(select count(*) from public.communities),
  'total_messages',(select count(*) from public.messages),
  'total_reports',(select count(*) from public.reports),
  'open_reports',(select count(*) from public.reports where status in ('pending','reviewing','review')),
  'pending_appeals',(select count(*) from public.account_appeals where status in ('pending','under_review')),
  'pending_message_requests',(select count(*) from public.message_requests where status='pending'),
  'active_stories',(select count(*) from public.stories where expires_at>now()),
  'active_admins',(select count(*) from public.admin_memberships where status='active'),
  'pending_invitations',(select count(*) from public.admin_invitations where status='pending' and expires_at>now()),
  'active_bans',(select count(*) from public.user_account_restrictions where status='banned'),
  'active_restrictions',(select count(*) from public.user_account_restrictions where status='restricted' and (expires_at is null or expires_at>now())),
  'sla_breached_cases',(select count(*) from public.moderation_cases where status not in ('resolved','dismissed') and sla_due_at<now()),
  'critical_cases',(select count(*) from public.moderation_cases where severity='critical' and status not in ('resolved','dismissed')),
  'failed_uploads',(select count(*) from public.media_processing_jobs where status in ('failed','error')),
  'generated_at',now()
 ) into result;
 return result;
end $function$;
revoke all on function public.admin_dashboard_summary() from public,anon;
grant execute on function public.admin_dashboard_summary() to authenticated;
