-- Ingest reports into merged moderation cases and preserve evidence snapshots without exposing critical media in standard queues.
alter table public.moderation_cases add column if not exists reporter_count integer not null default 1;
create index if not exists moderation_cases_target_post_idx on public.moderation_cases(target_post_id) where target_post_id is not null;
create index if not exists moderation_cases_target_user_idx on public.moderation_cases(target_user_id) where target_user_id is not null;

create or replace function public.ingest_report_into_moderation_case()
returns trigger language plpgsql security definer set search_path to 'public','auth'
as $function$
declare
 v_post public.posts%rowtype;v_target_user uuid;v_category text;v_severity text;v_case_id uuid;v_due timestamptz;v_snapshot jsonb:='{}'::jsonb;
begin
 if new.post_id is not null then
  select * into v_post from public.posts where id=new.post_id;
  v_target_user:=coalesce(new.reported_user_id,v_post.author_id);
  v_snapshot:=jsonb_build_object('post_id',new.post_id,'author_id',v_post.author_id,'caption',v_post.caption,'media_type',v_post.media_type,'created_at',v_post.created_at,'report_reason',new.reason);
 else
  v_target_user:=new.reported_user_id;
  v_snapshot:=jsonb_build_object('reported_user_id',new.reported_user_id,'report_reason',new.reason);
 end if;
 v_category:=case
  when lower(new.reason) like '%child%' or lower(new.reason) like '%minor%' or lower(new.reason) like '%sexual exploit%' then 'minor_safety'
  when lower(new.reason) like '%threat%' or lower(new.reason) like '%violence%' then 'violence'
  when lower(new.reason) like '%hate%' then 'hate'
  when lower(new.reason) like '%harass%' or lower(new.reason) like '%bully%' then 'harassment'
  when lower(new.reason) like '%spam%' then 'spam'
  when lower(new.reason) like '%scam%' or lower(new.reason) like '%fraud%' then 'scams'
  else 'other' end;
 v_severity:=case when v_category in ('minor_safety','violence') then 'critical' when v_category in ('hate','scams') then 'high' when v_category in ('harassment') then 'medium' else 'low' end;
 v_due:=now()+case v_severity when 'critical' then interval '15 minutes' when 'high' then interval '4 hours' when 'medium' then interval '24 hours' else interval '72 hours' end;
 if new.post_id is not null then
  select id into v_case_id from public.moderation_cases where target_post_id=new.post_id and status not in ('resolved','dismissed') order by created_at desc limit 1 for update;
 elsif v_target_user is not null then
  select id into v_case_id from public.moderation_cases where target_post_id is null and target_user_id=v_target_user and status not in ('resolved','dismissed') order by created_at desc limit 1 for update;
 end if;
 if v_case_id is null then
  insert into public.moderation_cases(title,category,severity,status,created_by,related_report_ids,target_user_id,target_post_id,snapshot,sla_due_at,reporter_count)
  values('Community report',v_category,v_severity,case when v_severity='critical' then 'escalated' else 'new' end,new.reporter_id,array[new.id],v_target_user,new.post_id,v_snapshot,v_due,1)
  returning id into v_case_id;
 else
  update public.moderation_cases set
   related_report_ids=case when new.id=any(related_report_ids) then related_report_ids else array_append(related_report_ids,new.id) end,
   reporter_count=reporter_count+case when new.id=any(related_report_ids) then 0 else 1 end,
   severity=case when array_position(array['low','medium','high','critical'],v_severity)>array_position(array['low','medium','high','critical'],severity) then v_severity else severity end,
   category=v_category,
   status=case when v_severity='critical' then 'escalated' else status end,
   snapshot=coalesce(snapshot,'{}'::jsonb)||v_snapshot,
   sla_due_at=least(coalesce(sla_due_at,v_due),v_due),
   updated_at=now()
  where id=v_case_id;
 end if;
 insert into public.report_evidence(report_id,evidence_type,evidence,captured_by)
 values(new.id,'report_snapshot',v_snapshot,new.reporter_id);
 return new;
end $function$;
drop trigger if exists reports_to_moderation_case on public.reports;
create trigger reports_to_moderation_case after insert on public.reports for each row execute function public.ingest_report_into_moderation_case();
revoke all on function public.ingest_report_into_moderation_case() from public,anon,authenticated;
