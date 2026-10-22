-- Prevent any membership update/delete path from reducing active top-level administrators below two.
-- This guard is intentionally stricter than UI checks and covers future admin-management workflows.

create or replace function public.guard_minimum_active_super_admins()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_old_role text;
  v_new_role text;
  v_remaining integer;
begin
  if tg_op = 'INSERT' then
    return new;
  end if;

  select r.name into v_old_role
  from public.admin_roles r where r.id = old.role_id;

  if old.status = 'active' and v_old_role in ('Owner', 'Super Administrator') then
    if tg_op = 'DELETE' then
      select count(*) into v_remaining
      from public.admin_memberships m
      join public.admin_roles r on r.id = m.role_id
      where m.status = 'active'
        and r.name in ('Owner', 'Super Administrator')
        and m.user_id <> old.user_id;
      if v_remaining < 2 then
        raise exception 'At least two active Owner/Super Administrator accounts must remain'
          using errcode = '42501';
      end if;
      return old;
    end if;

    select r.name into v_new_role
    from public.admin_roles r where r.id = new.role_id;

    if new.status <> 'active' or v_new_role not in ('Owner', 'Super Administrator') then
      select count(*) into v_remaining
      from public.admin_memberships m
      join public.admin_roles r on r.id = m.role_id
      where m.status = 'active'
        and r.name in ('Owner', 'Super Administrator')
        and m.user_id <> old.user_id;
      if v_remaining < 2 then
        raise exception 'At least two active Owner/Super Administrator accounts must remain'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists admin_membership_minimum_super_admins on public.admin_memberships;
create trigger admin_membership_minimum_super_admins
before update of role_id, status or delete on public.admin_memberships
for each row execute function public.guard_minimum_active_super_admins();
