-- Mask personal data in bulk directory results; revealing one record requires an explicit permission and an audit event.
update public.admin_roles set permissions=case when permissions ? 'users.pii.reveal' then permissions else permissions || '["users.pii.reveal"]'::jsonb end where name='Owner';

create or replace function public.admin_user_directory(p_search text default null,p_offset integer default 0,p_limit integer default 100)
returns table(id uuid,email text,phone text,last_sign_in_at timestamptz,email_confirmed_at timestamptz,username text,display_name text,bio text,avatar_url text,cover_url text,website text,is_private boolean,profile_created_at timestamptz,profile_updated_at timestamptz)
language plpgsql stable security definer set search_path to ''
as $function$
begin
 if not exists(select 1 from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.user_id=auth.uid() and m.status='active' and (r.permissions ? '*' or r.permissions ? 'users.view' or r.permissions ? 'users.manage')) then
  raise exception 'Insufficient administrator permissions' using errcode='42501';
 end if;
 return query
 select u.id,
  case when u.email is null then null else left(u.email,1)||'***'||substring(u.email from position('@' in u.email)) end,
  case when u.phone is null then null else '••••••'||right(regexp_replace(u.phone,'\D','','g'),2) end,
  u.last_sign_in_at,u.email_confirmed_at,p.username,p.display_name,p.bio,p.avatar_url,p.cover_url,p.website,p.is_private,p.created_at,p.updated_at
 from auth.users u join public.profiles p on p.id=u.id
 where p_search is null or trim(p_search)='' or p.username ilike '%'||trim(p_search)||'%' or p.display_name ilike '%'||trim(p_search)||'%' or u.email ilike '%'||trim(p_search)||'%'
 order by p.created_at desc offset greatest(0,least(coalesce(p_offset,0),100000)) limit greatest(1,least(coalesce(p_limit,100),100));
end;
$function$;

create or replace function public.admin_reveal_user_pii(p_user_id uuid)
returns table(email text,phone text)
language plpgsql security definer set search_path to 'public','auth'
as $function$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not exists(select 1 from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.user_id=v_actor and m.status='active' and r.permissions ? 'users.pii.reveal') then
  raise exception 'Explicit personal-data reveal permission required' using errcode='42501';
 end if;
 return query select u.email::text,u.phone::text from auth.users u where u.id=p_user_id;
 if not found then raise exception 'User not found'; end if;
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,details,outcome)
 values(v_actor,'user.pii.reveal','user',p_user_id::text,'Authorized personal data reveal',jsonb_build_object('fields',jsonb_build_array('email','phone')),'success');
end;
$function$;
revoke all on function public.admin_user_directory(text,integer,integer) from public,anon;
grant execute on function public.admin_user_directory(text,integer,integer) to authenticated;
revoke all on function public.admin_reveal_user_pii(uuid) from public,anon;
grant execute on function public.admin_reveal_user_pii(uuid) to authenticated;
