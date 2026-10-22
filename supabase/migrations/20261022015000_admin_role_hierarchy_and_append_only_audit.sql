-- Harden administrative role assignment and make audit records append-only.
-- Keep all authorization checks inside Postgres; UI checks are not a security boundary.

create or replace function public.admin_assign_role(p_target_user_id uuid, p_role_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_actor_permissions jsonb;
  v_target_role text;
  v_target_permissions jsonb;
  v_new_role text;
  v_new_permissions jsonb;
  v_active_super_count integer;
  v_actor_rank integer;
  v_target_rank integer;
  v_new_rank integer;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if v_actor = p_target_user_id then
    raise exception 'You cannot change your own administrative role' using errcode = '42501';
  end if;

  select r.name, r.permissions
    into v_actor_role, v_actor_permissions
  from public.admin_memberships m
  join public.admin_roles r on r.id = m.role_id
  where m.user_id = v_actor and m.status = 'active';

  if v_actor_role is null
     or not (v_actor_role = 'Owner'
       or (v_actor_role = 'Super Administrator' and coalesce(v_actor_permissions, '[]'::jsonb) ? 'roles.manage')) then
    raise exception 'Only authorized Super Administrators can assign roles' using errcode = '42501';
  end if;

  select r.name, r.permissions
    into v_target_role, v_target_permissions
  from public.admin_memberships m
  join public.admin_roles r on r.id = m.role_id
  where m.user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'Administrator membership not found' using errcode = 'P0002';
  end if;
  if v_target_role = 'Owner' then
    raise exception 'An Owner cannot be modified by this role-assignment workflow' using errcode = '42501';
  end if;

  select r.name, r.permissions into v_new_role, v_new_permissions
  from public.admin_roles r where r.id = p_role_id;
  if v_new_role is null then
    raise exception 'Role not found' using errcode = 'P0002';
  end if;

  v_actor_rank := case v_actor_role
    when 'Owner' then 100
    when 'Super Administrator' then 90
    when 'Admin' then 80
    when 'Senior Moderator' then 60
    when 'Moderator' then 50
    else 40
  end;
  v_target_rank := case v_target_role
    when 'Owner' then 100
    when 'Super Administrator' then 90
    when 'Admin' then 80
    when 'Senior Moderator' then 60
    when 'Moderator' then 50
    else 40
  end;
  v_new_rank := case v_new_role
    when 'Owner' then 100
    when 'Super Administrator' then 90
    when 'Admin' then 80
    when 'Senior Moderator' then 60
    when 'Moderator' then 50
    else 40
  end;

  if v_target_rank >= v_actor_rank then
    raise exception 'You cannot act on an administrator with an equal or higher role' using errcode = '42501';
  end if;
  if v_new_rank >= v_actor_rank then
    raise exception 'You cannot assign a role equal to or higher than your own' using errcode = '42501';
  end if;

  -- For non-Owner actors, both the target's current role and the new role
  -- must be strict subsets of the actor's effective permission set.
  if v_actor_role <> 'Owner' then
    if coalesce(v_target_permissions, '[]'::jsonb) ? '*'
       or exists (
         select 1 from jsonb_array_elements_text(coalesce(v_target_permissions, '[]'::jsonb)) p(permission)
         where not (coalesce(v_actor_permissions, '[]'::jsonb) ? p.permission)
       ) then
      raise exception 'You cannot manage an administrator whose permissions equal or exceed yours' using errcode = '42501';
    end if;
    if coalesce(v_new_permissions, '[]'::jsonb) ? '*'
       or exists (
         select 1 from jsonb_array_elements_text(coalesce(v_new_permissions, '[]'::jsonb)) p(permission)
         where not (coalesce(v_actor_permissions, '[]'::jsonb) ? p.permission)
       ) then
      raise exception 'You cannot assign permissions you do not hold' using errcode = '42501';
    end if;
  end if;

  if v_target_role in ('Owner', 'Super Administrator')
     and v_new_role not in ('Owner', 'Super Administrator') then
    select count(*) into v_active_super_count
    from public.admin_memberships m
    join public.admin_roles r on r.id = m.role_id
    where m.status = 'active' and r.name in ('Owner', 'Super Administrator');
    if v_active_super_count <= 2 then
      raise exception 'At least two active Owner/Super Administrator accounts must remain' using errcode = '42501';
    end if;
  end if;

  update public.admin_memberships
    set role_id = p_role_id, updated_at = now()
    where user_id = p_target_user_id;

  insert into public.admin_audit_log(actor_id, action, target_type, target_id, reason, details)
  values (v_actor, 'admin.role.assign', 'admin_membership', p_target_user_id::text,
    'Administrative role changed',
    jsonb_build_object('from', v_target_role, 'to', v_new_role));

  return true;
end;
$function$;

-- This generic audit writer accepts caller-supplied action and target values.
-- No client code uses it; only trusted server-side code may invoke it.
revoke all on function public.admin_record_audit(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_record_audit(text, text, text, text, jsonb) to service_role;

-- Audit history must not be editable/deletable through ordinary database roles.
create or replace function public.prevent_admin_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception 'Administrative audit history is append-only'
    using errcode = '42501';
end;
$function$;

drop trigger if exists admin_audit_log_append_only on public.admin_audit_log;
create trigger admin_audit_log_append_only
before update or delete on public.admin_audit_log
for each row execute function public.prevent_admin_audit_mutation();
