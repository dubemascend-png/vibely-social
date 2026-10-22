drop policy if exists "admins can read reports" on public.reports;
create policy "admins can read reports" on public.reports for select to authenticated using (
 exists(select 1 from public.admin_memberships am join public.admin_roles ar on ar.id=am.role_id
 where am.user_id=auth.uid() and am.status='active' and (ar.permissions ? '*' or ar.permissions ? 'moderation.manage' or ar.permissions ? 'reports.view' or ar.permissions ? 'reports.review' or ar.permissions ? 'reports.manage'))
);
drop policy if exists "admins can update reports" on public.reports;
create policy "admins can update reports" on public.reports for update to authenticated using (
 exists(select 1 from public.admin_memberships am join public.admin_roles ar on ar.id=am.role_id
 where am.user_id=auth.uid() and am.status='active' and (ar.permissions ? '*' or ar.permissions ? 'moderation.manage' or ar.permissions ? 'reports.manage'))
) with check (
 exists(select 1 from public.admin_memberships am join public.admin_roles ar on ar.id=am.role_id
 where am.user_id=auth.uid() and am.status='active' and (ar.permissions ? '*' or ar.permissions ? 'moderation.manage' or ar.permissions ? 'reports.manage'))
);
drop policy if exists "Moderators can review account appeals" on public.account_appeals;
create policy "Moderators can review account appeals" on public.account_appeals for select to authenticated using (
 user_id=auth.uid() or exists(select 1 from public.admin_memberships am join public.admin_roles ar on ar.id=am.role_id
 where am.user_id=auth.uid() and am.status='active' and (ar.permissions ? '*' or ar.permissions ? 'users.manage' or ar.permissions ? 'moderation.manage' or ar.permissions ? 'appeals.review' or ar.permissions ? 'appeals.resolve'))
);
drop policy if exists "Moderators can update account appeals" on public.account_appeals;
create policy "Moderators can update account appeals" on public.account_appeals for update to authenticated using (
 exists(select 1 from public.admin_memberships am join public.admin_roles ar on ar.id=am.role_id
 where am.user_id=auth.uid() and am.status='active' and (ar.permissions ? '*' or ar.permissions ? 'users.manage' or ar.permissions ? 'moderation.manage' or ar.permissions ? 'appeals.review' or ar.permissions ? 'appeals.resolve'))
) with check (
 exists(select 1 from public.admin_memberships am join public.admin_roles ar on ar.id=am.role_id
 where am.user_id=auth.uid() and am.status='active' and (ar.permissions ? '*' or ar.permissions ? 'users.manage' or ar.permissions ? 'moderation.manage' or ar.permissions ? 'appeals.review' or ar.permissions ? 'appeals.resolve'))
);
drop policy if exists moderation_cases_read on public.moderation_cases;
create policy moderation_cases_read on public.moderation_cases for select to authenticated using (
 public.admin_has_permission('reports.view') or public.admin_has_permission('reports.review') or public.admin_has_permission('reports.manage') or public.admin_has_permission('moderation.manage')
);
drop policy if exists moderation_cases_write on public.moderation_cases;
create policy moderation_cases_write on public.moderation_cases for all to authenticated using (
 public.admin_has_permission('moderation.manage') or public.admin_has_permission('reports.manage')
) with check (
 public.admin_has_permission('moderation.manage') or public.admin_has_permission('reports.manage')
);

create or replace function public.admin_update_report_status(p_report_id uuid,p_status text,p_reason text default null)
returns boolean language plpgsql security definer set search_path to 'public','auth'
as $function$
declare v_actor uuid:=auth.uid();v_previous text;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not (public.admin_has_permission('reports.review') or public.admin_has_permission('reports.manage') or public.admin_has_permission('moderation.manage')) then raise exception 'Report review permission required' using errcode='42501'; end if;
 if p_status not in ('pending','reviewing','resolved','dismissed','escalated') then raise exception 'Unsupported report status'; end if;
 select status into v_previous from public.reports where id=p_report_id for update;
 if not found then raise exception 'Report not found'; end if;
 update public.reports set status=p_status where id=p_report_id;
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,details,outcome)
 values(v_actor,'report.status.'||p_status,'report',p_report_id::text,nullif(trim(coalesce(p_reason,'')),''),jsonb_build_object('previous_status',v_previous,'new_status',p_status),'success');
 return true;
end;
$function$;
revoke all on function public.admin_update_report_status(uuid,text,text) from public,anon;
grant execute on function public.admin_update_report_status(uuid,text,text) to authenticated;
