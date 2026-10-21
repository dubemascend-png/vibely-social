create or replace function public.admin_audit_row_change()
returns trigger language plpgsql security definer set search_path to 'public','auth'
as $function$
declare v_old jsonb:='{}'::jsonb;v_new jsonb:='{}'::jsonb;v_target_id text;v_reason text;v_actor uuid:=auth.uid();
begin
 if tg_op in ('UPDATE','DELETE') then v_old:=to_jsonb(old); end if;
 if tg_op in ('INSERT','UPDATE') then v_new:=to_jsonb(new); end if;
 -- This is an admin audit trail, not a log of ordinary member activity.
 if v_actor is null or not exists(select 1 from public.admin_memberships m where m.user_id=v_actor and m.status='active') then
  if tg_op='DELETE' then return old; end if; return new;
 end if;
 v_target_id:=coalesce(v_new->>'id',v_old->>'id',v_new->>'key',v_old->>'key',v_new->>'user_id',v_old->>'user_id');
 v_reason:=coalesce(v_new->>'reason',v_new->>'reviewer_note',v_new->>'internal_note',v_old->>'reason',v_old->>'reviewer_note');
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,details,outcome)
 values(v_actor,lower(tg_table_name)||'.'||lower(tg_op),tg_table_name,v_target_id,v_reason,jsonb_build_object('before',v_old,'after',v_new),'success');
 if tg_op='DELETE' then return old; end if; return new;
end $function$;
drop trigger if exists audit_account_appeals_changes on public.account_appeals;
