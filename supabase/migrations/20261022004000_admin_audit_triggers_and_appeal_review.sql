-- Audited admin writes and independent appeal review.
create or replace function public.admin_audit_row_change()
returns trigger language plpgsql security definer set search_path to 'public','auth'
as $function$
declare v_old jsonb:='{}'::jsonb;v_new jsonb:='{}'::jsonb;v_target_id text;v_reason text;
begin
 if tg_op in ('UPDATE','DELETE') then v_old:=to_jsonb(old); end if;
 if tg_op in ('INSERT','UPDATE') then v_new:=to_jsonb(new); end if;
 v_target_id:=coalesce(v_new->>'id',v_old->>'id',v_new->>'key',v_old->>'key',v_new->>'user_id',v_old->>'user_id');
 v_reason:=coalesce(v_new->>'reason',v_new->>'reviewer_note',v_new->>'internal_note',v_old->>'reason',v_old->>'reviewer_note');
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,details,outcome)
 values(auth.uid(),lower(tg_table_name)||'.'||lower(tg_op),tg_table_name,v_target_id,v_reason,jsonb_build_object('before',v_old,'after',v_new),'success');
 if tg_op='DELETE' then return old; end if;
 return new;
end $function$;

do $$
declare t text;
begin
 foreach t in array array['admin_policies','admin_strikes','moderation_cases','report_evidence','verification_requests','support_tickets','canned_responses','admin_announcements','admin_feature_flags','admin_sessions','account_appeals','reports'] loop
  execute format('drop trigger if exists %I on public.%I', 'audit_'||t||'_changes', t);
  execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.admin_audit_row_change()', 'audit_'||t||'_changes', t);
 end loop;
end $$;

-- Prevent clients from deleting internal records directly; reversible changes are updates and are audited.
revoke delete on public.admin_policies,public.admin_strikes,public.moderation_cases,public.report_evidence,public.verification_requests,public.support_tickets,public.canned_responses,public.admin_announcements,public.admin_feature_flags,public.admin_sessions from authenticated;

create or replace function public.admin_review_appeal(p_appeal_id uuid,p_status text,p_note text default null)
returns boolean language plpgsql security definer set search_path to 'public','auth'
as $function$
declare v_actor uuid:=auth.uid();v_appeal public.account_appeals%rowtype;v_original_actor uuid;v_title text;v_body text;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not (public.admin_has_permission('appeals.review') or public.admin_has_permission('users.manage')) then raise exception 'Appeal review permission required' using errcode='42501'; end if;
 if p_status not in ('under_review','approved','rejected') then raise exception 'Unsupported appeal status'; end if;
 select * into v_appeal from public.account_appeals where id=p_appeal_id for update;
 if not found then raise exception 'Appeal not found'; end if;
 select ea.actor_id into v_original_actor from public.admin_enforcement_actions ea where ea.target_user_id=v_appeal.user_id order by ea.created_at desc limit 1;
 if v_original_actor is null then
  select al.actor_id into v_original_actor from public.admin_audit_log al where al.target_type='user' and al.target_id=v_appeal.user_id::text and al.action in ('user.restrict','user.ban','user.delete') order by al.created_at desc limit 1;
 end if;
 if p_status in ('approved','rejected') and v_original_actor=v_actor then raise exception 'A different administrator must decide this appeal' using errcode='42501'; end if;
 update public.account_appeals set status=p_status,reviewer_id=v_actor,reviewer_note=nullif(trim(coalesce(p_note,'')),''),reviewed_at=case when p_status='under_review' then null else now() end where id=p_appeal_id;
 if p_status='approved' then
  delete from public.user_account_restrictions where user_id=v_appeal.user_id;
  v_title:='Your Vibe.ly appeal was approved';
  v_body:='A reviewer overturned the previous account action. Your account restriction has been removed.';
 elsif p_status='rejected' then
  v_title:='Your Vibe.ly appeal was reviewed';
  v_body:='The moderation team reviewed your appeal and upheld the original action.'||case when nullif(trim(coalesce(p_note,'')),'') is null then '' else ' Reviewer note: '||trim(p_note) end;
 else
  v_title:='Your Vibe.ly appeal is under review';
  v_body:='Your appeal has been assigned for review.';
 end if;
 insert into public.notifications(recipient_id,actor_id,kind,is_read,title,body) values(v_appeal.user_id,v_actor,'appeal_update',false,v_title,v_body);
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,details,outcome)
 values(v_actor,'appeal.'||p_status,'appeal',p_appeal_id::text,nullif(trim(coalesce(p_note,'')),''),jsonb_build_object('user_id',v_appeal.user_id,'previous_status',v_appeal.status,'new_status',p_status,'original_action_actor',v_original_actor),'success');
 return true;
end $function$;
revoke all on function public.admin_review_appeal(uuid,text,text) from public,anon;
grant execute on function public.admin_review_appeal(uuid,text,text) to authenticated;
