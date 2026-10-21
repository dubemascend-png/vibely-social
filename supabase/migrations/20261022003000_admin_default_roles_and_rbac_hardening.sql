-- Default least-privilege admin roles and hardened role-management RPCs.
insert into public.admin_roles(name,description,permissions,is_system) values
 ('Admin','Platform operations with broad access, excluding owner-level role and system controls.','["dashboard.view","users.view","users.manage","users.ban","users.suspend","users.reinstate","content.review","content.remove","content.restore","reports.view","reports.manage","appeals.review","appeals.resolve","verification.view","verification.manage","communities.view","communities.manage","analytics.view","audit.view","communications.view","communications.manage","support.view","support.manage","enforcement.view","enforcement.manage"]'::jsonb,true),
 ('Moderator','Report queue, content review, warnings, and temporary restrictions.','["dashboard.view","users.view","users.suspend","content.review","content.remove","reports.view","moderation.manage","enforcement.view"]'::jsonb,true),
 ('Senior Moderator','Moderator permissions plus permanent bans and appeal review.','["dashboard.view","users.view","users.suspend","users.ban","content.review","content.remove","content.restore","reports.view","moderation.manage","appeals.review","appeals.resolve","enforcement.view"]'::jsonb,true),
 ('Support Agent','Support inbox and limited user lookup.','["dashboard.view","users.view","support.view","support.manage"]'::jsonb,true),
 ('Community Manager','Community operations. Community-level scoping should be added before assigning production access.','["dashboard.view","communities.view","communities.manage"]'::jsonb,true),
 ('Verification Reviewer','Verification queue and badge decisions only.','["dashboard.view","verification.view","verification.manage"]'::jsonb,true),
 ('Analyst','Read-only platform analytics; no raw-data export.','["dashboard.view","analytics.view"]'::jsonb,true)
on conflict(name) do nothing;

update public.admin_roles
set permissions = (
 select jsonb_agg(distinct item)
 from jsonb_array_elements_text(admin_roles.permissions || '["roles.manage","admins.manage","system.view","system.manage","content.review","content.remove","content.restore","reports.view","reports.manage","appeals.review","appeals.resolve","enforcement.view","enforcement.manage","verification.view","verification.manage","communities.view","communities.manage","communications.view","communications.manage","support.view","support.manage","messages_safety.view","analytics.view","audit.view","users.view","users.manage","users.ban","users.suspend","users.reinstate","dashboard.view"]'::jsonb) as item
)
where name='Super Administrator';

create or replace function public.admin_create_role(p_name text,p_description text,p_permissions jsonb)
returns uuid language plpgsql security definer set search_path to 'public','auth'
as $function$
declare v_actor uuid:=auth.uid();v_id uuid;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not exists(select 1 from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.user_id=v_actor and m.status='active' and (r.name='Owner' or (r.name='Super Administrator' and r.permissions ? 'roles.manage'))) then
  raise exception 'Only Super Administrators can create roles' using errcode='42501';
 end if;
 if length(trim(coalesce(p_name,'')))<3 or length(trim(coalesce(p_name,'')))>60 then raise exception 'Role name must be 3–60 characters'; end if;
 if jsonb_typeof(p_permissions)<>'array' then raise exception 'Permissions must be a JSON array'; end if;
 if p_permissions ? '*' then raise exception 'Wildcard permissions are reserved for the Owner'; end if;
 insert into public.admin_roles(name,description,permissions,is_system) values(trim(p_name),coalesce(trim(p_description),''),p_permissions,false) returning id into v_id;
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,details) values(v_actor,'admin.role.create','admin_role',v_id::text,'Role created',jsonb_build_object('name',trim(p_name),'permissions',p_permissions));
 return v_id;
end $function$;

create or replace function public.admin_assign_role(p_target_user_id uuid,p_role_id uuid)
returns boolean language plpgsql security definer set search_path to 'public','auth'
as $function$
declare v_actor uuid:=auth.uid();v_target_role text;v_new_role text;v_actor_role text;v_active_super_count integer;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if v_actor=p_target_user_id then raise exception 'You cannot change your own administrative role' using errcode='42501'; end if;
 select r.name into v_actor_role from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.user_id=v_actor and m.status='active' and (r.name='Owner' or (r.name='Super Administrator' and r.permissions ? 'roles.manage'));
 if v_actor_role is null then raise exception 'Only Super Administrators can assign roles' using errcode='42501'; end if;
 select r.name into v_target_role from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.user_id=p_target_user_id;
 select name into v_new_role from public.admin_roles where id=p_role_id;
 if v_new_role is null then raise exception 'Role not found'; end if;
 if v_new_role in ('Owner','Super Administrator','Admin') and v_actor_role<>'Owner' then raise exception 'Only the Owner may assign Owner, Super Administrator, or Admin roles' using errcode='42501'; end if;
 if v_target_role in ('Owner','Super Administrator') and v_new_role not in ('Owner','Super Administrator') then
  select count(*) into v_active_super_count from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.status='active' and r.name in ('Owner','Super Administrator');
  if v_active_super_count<=2 then raise exception 'At least two active Owner/Super Administrator accounts must remain' using errcode='42501'; end if;
 end if;
 update public.admin_memberships set role_id=p_role_id,updated_at=now() where user_id=p_target_user_id;
 if not found then raise exception 'Administrator membership not found'; end if;
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,details) values(v_actor,'admin.role.assign','admin_membership',p_target_user_id::text,'Administrative role changed',jsonb_build_object('from',v_target_role,'to',v_new_role));
 return true;
end $function$;
revoke all on function public.admin_create_role(text,text,jsonb) from public,anon;
revoke all on function public.admin_assign_role(uuid,uuid) from public,anon;
grant execute on function public.admin_create_role(text,text,jsonb) to authenticated;
grant execute on function public.admin_assign_role(uuid,uuid) to authenticated;
