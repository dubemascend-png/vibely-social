create or replace function public.admin_take_moderation_action(p_target_user_id uuid,p_action text,p_reason text,p_duration_hours integer default null,p_report_id uuid default null)
returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
 v_actor uuid:=auth.uid();v_status text;v_expires timestamptz;v_action_id uuid:=gen_random_uuid();v_title text;v_body text;v_record_action text;
 v_actor_role text;v_target_role text;v_actor_rank integer;v_target_rank integer;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_action not in ('restrict','ban','delete','restore') then raise exception 'Unsupported moderation action'; end if;
 if p_target_user_id=v_actor then raise exception 'You cannot moderate your own account' using errcode='42501'; end if;
 if p_reason is null or length(trim(p_reason))<5 then raise exception 'Please provide a reason of at least 5 characters'; end if;
 if not exists(select 1 from auth.users u where u.id=p_target_user_id) then raise exception 'Target account not found'; end if;
 select r.name into v_actor_role from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.user_id=v_actor and m.status='active';
 if v_actor_role is null then raise exception 'Active administrator access required' using errcode='42501'; end if;
 if not exists(
  select 1 from public.admin_memberships am join public.admin_roles ar on ar.id=am.role_id
  where am.user_id=v_actor and am.status='active' and case p_action
   when 'restrict' then (ar.permissions ? '*' or ar.permissions ? 'users.manage' or ar.permissions ? 'users.suspend' or ar.permissions ? 'moderation.manage')
   when 'ban' then (ar.permissions ? '*' or ar.permissions ? 'users.manage' or ar.permissions ? 'users.ban')
   when 'delete' then (ar.permissions ? '*' or ar.permissions ? 'users.manage' or ar.permissions ? 'users.delete')
   when 'restore' then (ar.permissions ? '*' or ar.permissions ? 'users.manage' or ar.permissions ? 'users.reinstate')
   else false end
 ) then raise exception 'Permission denied for this enforcement action' using errcode='42501'; end if;
 select r.name into v_target_role from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.user_id=p_target_user_id and m.status='active';
 if v_target_role is not null then
  v_actor_rank:=case v_actor_role when 'Owner' then 100 when 'Super Administrator' then 90 when 'Admin' then 80 when 'Senior Moderator' then 70 when 'Moderator' then 60 else 40 end;
  v_target_rank:=case v_target_role when 'Owner' then 100 when 'Super Administrator' then 90 when 'Admin' then 80 when 'Senior Moderator' then 70 when 'Moderator' then 60 else 40 end;
  if v_actor_rank<=v_target_rank then raise exception 'You cannot moderate an administrator with an equal or higher role' using errcode='42501'; end if;
 end if;
 if p_action='restrict' then
  if p_duration_hours is null or p_duration_hours not in (24,168,720) then raise exception 'Choose 1, 7, or 30 days'; end if;
  v_status:='restricted';v_expires:=now()+make_interval(hours=>p_duration_hours);v_record_action:='restrict';
  v_title:='Your Vibe.ly account has been temporarily restricted';
  v_body:='Reason: '||trim(p_reason)||'. Access is scheduled to return on '||to_char(v_expires at time zone 'UTC','YYYY-MM-DD HH24:MI "UTC"')||'. You may submit an appeal if you believe this action is incorrect.';
 elsif p_action='ban' then
  v_status:='banned';v_expires:=null;v_record_action:='ban';
  v_title:='Your Vibe.ly account has been banned';v_body:='Reason: '||trim(p_reason)||'. Your account access has been disabled. You may submit an appeal for review.';
 elsif p_action='delete' then
  v_status:='deleted';v_expires:=null;v_record_action:='ban';
  v_title:='Your Vibe.ly account has been marked for deletion';v_body:='Reason: '||trim(p_reason)||'. Your account has been disabled and hidden from normal use. This is a soft deletion so you can see this notice and appeal; it does not permanently erase account data.';
 else
  v_record_action:='reinstate';
  update public.user_account_restrictions set status='restricted',expires_at=now()-interval '1 second',reason=trim(p_reason),acted_by=v_actor,updated_at=now() where user_id=p_target_user_id;
  v_title:='Your Vibe.ly account restriction has been removed';v_body:='The moderation team restored access to your account. Note: '||trim(p_reason)||'.';
 end if;
 if p_action<>'restore' then
  insert into public.user_account_restrictions(user_id,status,reason,expires_at,acted_by,updated_at)
  values(p_target_user_id,v_status,trim(p_reason),v_expires,v_actor,now())
  on conflict(user_id) do update set status=excluded.status,reason=excluded.reason,expires_at=excluded.expires_at,acted_by=excluded.acted_by,updated_at=now();
 end if;
 insert into public.notifications(recipient_id,actor_id,kind,is_read,title,body) values(p_target_user_id,v_actor,'moderation_action',false,v_title,v_body);
 if p_action in ('restrict','ban','restore') then
  insert into public.admin_enforcement_actions(target_user_id,action,reason,ends_at,actor_id,status) values(p_target_user_id,v_record_action,trim(p_reason),v_expires,v_actor,'active') returning id into v_action_id;
 end if;
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,details)
 values(v_actor,'user.'||p_action,'user',p_target_user_id::text,trim(p_reason),jsonb_build_object('report_id',p_report_id,'duration_hours',p_duration_hours,'status',case when p_action='restore' then 'active' else v_status end,'actor_role',v_actor_role,'target_role',v_target_role));
 if p_report_id is not null then update public.reports set status='resolved' where id=p_report_id; end if;
 return v_action_id;
end;
$function$;
revoke all on function public.admin_take_moderation_action(uuid,text,text,integer,uuid) from public,anon;
grant execute on function public.admin_take_moderation_action(uuid,text,text,integer,uuid) to authenticated;
