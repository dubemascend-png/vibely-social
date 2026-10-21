create or replace function public.admin_review_verification_request(p_request_id uuid,p_status text,p_note text default null)
returns boolean language plpgsql security definer set search_path to 'public','auth'
as $function$
declare v_actor uuid:=auth.uid();v_request public.verification_requests%rowtype;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not (public.admin_has_permission('verification.manage') or public.admin_has_permission('users.manage')) then raise exception 'Verification review permission required' using errcode='42501'; end if;
 if p_status not in ('approved','rejected') then raise exception 'Unsupported verification decision'; end if;
 select * into v_request from public.verification_requests where id=p_request_id for update;
 if not found then raise exception 'Verification request not found'; end if;
 if v_request.status not in ('pending','in_review') then raise exception 'This verification request has already been decided'; end if;
 if p_status='approved' then
  update public.profiles set is_verified=true,updated_at=now() where id=v_request.user_id;
  if not found then raise exception 'The requested profile no longer exists'; end if;
 end if;
 update public.verification_requests set status=p_status,reviewer_id=v_actor,reviewer_note=nullif(trim(coalesce(p_note,'')),''),reviewed_at=now(),updated_at=now() where id=p_request_id;
 insert into public.notifications(recipient_id,actor_id,kind,is_read,title,body)
 values(v_request.user_id,v_actor,'verification_update',false,
  case when p_status='approved' then 'Your Vibe.ly verification was approved' else 'Your Vibe.ly verification request was reviewed' end,
  case when p_status='approved' then 'Your purple verification badge is now active.' else 'Your verification request was not approved this time.'||case when nullif(trim(coalesce(p_note,'')),'') is null then '' else ' Note: '||trim(p_note) end end);
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,details,outcome)
 values(v_actor,'verification.'||p_status,'verification_request',p_request_id::text,nullif(trim(coalesce(p_note,'')),''),jsonb_build_object('user_id',v_request.user_id,'status_before',v_request.status,'status_after',p_status),'success');
 return true;
end $function$;
revoke all on function public.admin_review_verification_request(uuid,text,text) from public,anon;
grant execute on function public.admin_review_verification_request(uuid,text,text) to authenticated;
