-- Applied to Supabase project jzcxybjtexyeoweyelfg on 2026-10-22.
-- Adds aggregate admin visibility for the new social domains and permission-gated audit reads.
create or replace function public.admin_dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'auth'
as $function$
declare result jsonb;
begin
  if not public.admin_has_permission('dashboard.view') then
    raise exception 'Administrative permission required' using errcode='42501';
  end if;
  select jsonb_build_object(
    'total_users',(select count(*) from auth.users),
    'new_users_7d',(select count(*) from auth.users where created_at >= now()-interval '7 days'),
    'new_users_30d',(select count(*) from auth.users where created_at >= now()-interval '30 days'),
    'total_posts',(select count(*) from public.posts),
    'total_videos',(select count(*) from public.posts where media_type='video'),
    'total_communities',(select count(*) from public.communities),
    'total_messages',(select count(*) from public.messages),
    'total_reports',(select count(*) from public.reports),
    'open_reports',(select count(*) from public.reports where status in ('pending','reviewing')),
    'pending_appeals',(select count(*) from public.account_appeals where status in ('pending','under_review')),
    'pending_message_requests',(select count(*) from public.message_requests where status='pending'),
    'active_stories',(select count(*) from public.stories where expires_at>now()),
    'active_admins',(select count(*) from public.admin_memberships where status='active'),
    'pending_invitations',(select count(*) from public.admin_invitations where status='pending' and expires_at>now()),
    'generated_at',now()
  ) into result;
  return result;
end
$function$;

alter table public.admin_audit_log enable row level security;
grant select on public.admin_audit_log to authenticated;
drop policy if exists "Active admins with audit permission read audit log" on public.admin_audit_log;
create policy "Active admins with audit permission read audit log"
on public.admin_audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_memberships m
    join public.admin_roles r on r.id=m.role_id
    where m.user_id=(select auth.uid())
      and m.status='active'
      and (r.permissions ? '*' or r.permissions ? 'audit.view')
  )
);
