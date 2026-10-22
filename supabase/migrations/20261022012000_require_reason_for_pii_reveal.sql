drop function if exists public.admin_reveal_user_pii(uuid);
create or replace function public.admin_reveal_user_pii(p_user_id uuid,p_reason text)
returns table(email text,phone text)
language plpgsql security definer set search_path to 'public','auth'
as $function$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not exists(select 1 from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.user_id=v_actor and m.status='active' and r.permissions ? 'users.pii.reveal') then
  raise exception 'Explicit personal-data reveal permission required' using errcode='42501';
 end if;
 if p_reason is null or length(trim(p_reason))<5 then raise exception 'A reason of at least five characters is required' using errcode='22023'; end if;
 return query select u.email::text,u.phone::text from auth.users u where u.id=p_user_id;
 if not found then raise exception 'User not found'; end if;
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,details,outcome)
 values(v_actor,'user.pii.reveal','user',p_user_id::text,trim(p_reason),jsonb_build_object('fields',jsonb_build_array('email','phone')),'success');
end;
$function$;
revoke all on function public.admin_reveal_user_pii(uuid,text) from public,anon;
grant execute on function public.admin_reveal_user_pii(uuid,text) to authenticated;
