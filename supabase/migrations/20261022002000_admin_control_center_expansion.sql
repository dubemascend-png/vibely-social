-- Vibe.ly Admin Control Center: operational queues, policy library, support, communications and system flags.
-- All admin table access is gated by the existing server-side public.admin_has_permission() function.
create table if not exists public.admin_policies (
 id uuid primary key default gen_random_uuid(),
 policy_code text not null unique,
 category text not null,
 title text not null,
 description text not null default '',
 severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
 strike_expiry_days integer not null default 90 check (strike_expiry_days between 1 and 3650),
 zero_tolerance boolean not null default false,
 enabled boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.admin_strikes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 policy_id uuid references public.admin_policies(id) on delete set null,
 policy_code text not null,
 severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
 reason text not null,
 source_report_id uuid references public.reports(id) on delete set null,
 issued_by uuid references auth.users(id) on delete set null,
 expires_at timestamptz,
 status text not null default 'active' check (status in ('active','expired','revoked')),
 created_at timestamptz not null default now()
);
create table if not exists public.moderation_cases (
 id uuid primary key default gen_random_uuid(),
 title text not null default 'Community report',
 category text not null default 'other',
 severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
 status text not null default 'new' check (status in ('new','in_review','escalated','resolved','dismissed')),
 assignee_id uuid references auth.users(id) on delete set null,
 created_by uuid references auth.users(id) on delete set null,
 related_report_ids uuid[] not null default '{}',
 target_user_id uuid references auth.users(id) on delete set null,
 target_post_id uuid references public.posts(id) on delete set null,
 snapshot jsonb not null default '{}'::jsonb,
 sla_due_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.report_evidence (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.reports(id) on delete cascade,
 evidence_type text not null default 'note',
 evidence jsonb not null default '{}'::jsonb,
 captured_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists public.verification_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 statement text not null default '',
 links text[] not null default '{}',
 status text not null default 'pending' check (status in ('pending','in_review','approved','rejected','revoked')),
 reviewer_id uuid references auth.users(id) on delete set null,
 reviewer_note text,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.support_tickets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete set null,
 subject text not null,
 body text not null default '',
 status text not null default 'open' check (status in ('open','in_progress','waiting','resolved','closed')),
 priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
 assigned_to uuid references auth.users(id) on delete set null,
 internal_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.canned_responses (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 body text not null,
 category text not null default 'general',
 enabled boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.admin_announcements (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 body text not null,
 channel text not null default 'in_app' check (channel in ('in_app','push','email')),
 audience jsonb not null default '{"type":"all"}'::jsonb,
 status text not null default 'draft' check (status in ('draft','scheduled','sent','cancelled')),
 scheduled_at timestamptz,
 sent_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.admin_feature_flags (
 key text primary key,
 description text not null default '',
 enabled boolean not null default false,
 config jsonb not null default '{}'::jsonb,
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
create table if not exists public.admin_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 session_label text not null default 'Admin session',
 last_seen_at timestamptz not null default now(),
 expires_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz not null default now()
);

create index if not exists admin_strikes_user_created_idx on public.admin_strikes(user_id, created_at desc);
create index if not exists admin_strikes_expiry_idx on public.admin_strikes(status, expires_at);
create index if not exists moderation_cases_queue_idx on public.moderation_cases(status, severity, created_at);
create index if not exists moderation_cases_assignee_idx on public.moderation_cases(assignee_id, status, updated_at desc);
create index if not exists report_evidence_report_idx on public.report_evidence(report_id, created_at);
create index if not exists verification_requests_queue_idx on public.verification_requests(status, created_at);
create index if not exists support_tickets_queue_idx on public.support_tickets(status, priority, updated_at desc);
create index if not exists admin_announcements_queue_idx on public.admin_announcements(status, scheduled_at);
create index if not exists admin_sessions_user_idx on public.admin_sessions(user_id, created_at desc);

alter table public.admin_policies enable row level security;
alter table public.admin_strikes enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.report_evidence enable row level security;
alter table public.verification_requests enable row level security;
alter table public.support_tickets enable row level security;
alter table public.canned_responses enable row level security;
alter table public.admin_announcements enable row level security;
alter table public.admin_feature_flags enable row level security;
alter table public.admin_sessions enable row level security;

revoke all on public.admin_policies, public.admin_strikes, public.moderation_cases, public.report_evidence, public.verification_requests, public.support_tickets, public.canned_responses, public.admin_announcements, public.admin_feature_flags, public.admin_sessions from anon;
grant select, insert, update, delete on public.admin_policies, public.admin_strikes, public.moderation_cases, public.report_evidence, public.verification_requests, public.support_tickets, public.canned_responses, public.admin_announcements, public.admin_feature_flags, public.admin_sessions to authenticated;

drop policy if exists admin_policies_read on public.admin_policies;
create policy admin_policies_read on public.admin_policies for select to authenticated using (public.admin_has_permission('enforcement.view') or public.admin_has_permission('enforcement.manage') or public.admin_has_permission('policies.view'));
drop policy if exists admin_policies_write on public.admin_policies;
create policy admin_policies_write on public.admin_policies for all to authenticated using (public.admin_has_permission('enforcement.manage') or public.admin_has_permission('policies.manage')) with check (public.admin_has_permission('enforcement.manage') or public.admin_has_permission('policies.manage'));

drop policy if exists admin_strikes_read on public.admin_strikes;
create policy admin_strikes_read on public.admin_strikes for select to authenticated using (public.admin_has_permission('enforcement.view') or public.admin_has_permission('enforcement.manage'));
drop policy if exists admin_strikes_write on public.admin_strikes;
create policy admin_strikes_write on public.admin_strikes for all to authenticated using (public.admin_has_permission('enforcement.manage')) with check (public.admin_has_permission('enforcement.manage'));

drop policy if exists moderation_cases_read on public.moderation_cases;
create policy moderation_cases_read on public.moderation_cases for select to authenticated using (public.admin_has_permission('reports.view') or public.admin_has_permission('moderation.manage'));
drop policy if exists moderation_cases_write on public.moderation_cases;
create policy moderation_cases_write on public.moderation_cases for all to authenticated using (public.admin_has_permission('moderation.manage') or public.admin_has_permission('reports.manage')) with check (public.admin_has_permission('moderation.manage') or public.admin_has_permission('reports.manage'));

drop policy if exists report_evidence_read on public.report_evidence;
create policy report_evidence_read on public.report_evidence for select to authenticated using (public.admin_has_permission('reports.view') or public.admin_has_permission('moderation.manage'));
drop policy if exists report_evidence_write on public.report_evidence;
create policy report_evidence_write on public.report_evidence for all to authenticated using (public.admin_has_permission('moderation.manage') or public.admin_has_permission('reports.manage')) with check (public.admin_has_permission('moderation.manage') or public.admin_has_permission('reports.manage'));

drop policy if exists verification_requests_read on public.verification_requests;
create policy verification_requests_read on public.verification_requests for select to authenticated using (public.admin_has_permission('verification.view') or public.admin_has_permission('users.manage'));
drop policy if exists verification_requests_write on public.verification_requests;
create policy verification_requests_write on public.verification_requests for all to authenticated using (public.admin_has_permission('verification.manage') or public.admin_has_permission('users.manage')) with check (public.admin_has_permission('verification.manage') or public.admin_has_permission('users.manage'));

drop policy if exists support_tickets_read on public.support_tickets;
create policy support_tickets_read on public.support_tickets for select to authenticated using (public.admin_has_permission('support.view') or public.admin_has_permission('support.manage'));
drop policy if exists support_tickets_write on public.support_tickets;
create policy support_tickets_write on public.support_tickets for all to authenticated using (public.admin_has_permission('support.manage')) with check (public.admin_has_permission('support.manage'));

drop policy if exists canned_responses_read on public.canned_responses;
create policy canned_responses_read on public.canned_responses for select to authenticated using (public.admin_has_permission('support.view') or public.admin_has_permission('support.manage'));
drop policy if exists canned_responses_write on public.canned_responses;
create policy canned_responses_write on public.canned_responses for all to authenticated using (public.admin_has_permission('support.manage')) with check (public.admin_has_permission('support.manage'));

drop policy if exists admin_announcements_read on public.admin_announcements;
create policy admin_announcements_read on public.admin_announcements for select to authenticated using (public.admin_has_permission('communications.view') or public.admin_has_permission('communications.manage'));
drop policy if exists admin_announcements_write on public.admin_announcements;
create policy admin_announcements_write on public.admin_announcements for all to authenticated using (public.admin_has_permission('communications.manage')) with check (public.admin_has_permission('communications.manage'));

drop policy if exists admin_feature_flags_read on public.admin_feature_flags;
create policy admin_feature_flags_read on public.admin_feature_flags for select to authenticated using (public.admin_has_permission('system.view') or public.admin_has_permission('system.manage'));
drop policy if exists admin_feature_flags_write on public.admin_feature_flags;
create policy admin_feature_flags_write on public.admin_feature_flags for all to authenticated using (public.admin_has_permission('system.manage')) with check (public.admin_has_permission('system.manage'));

drop policy if exists admin_sessions_read on public.admin_sessions;
create policy admin_sessions_read on public.admin_sessions for select to authenticated using (public.admin_has_permission('admins.manage') or user_id=auth.uid());
drop policy if exists admin_sessions_write on public.admin_sessions;
create policy admin_sessions_write on public.admin_sessions for all to authenticated using (public.admin_has_permission('admins.manage')) with check (public.admin_has_permission('admins.manage'));

-- Server-enforced role creation: only the platform owner may create custom roles.
create or replace function public.admin_create_role(p_name text, p_description text, p_permissions jsonb)
returns uuid language plpgsql security definer set search_path to 'public','auth'
as $function$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not exists(select 1 from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.user_id=v_actor and m.status='active' and (r.name='Owner' or (r.name='Super Administrator' and r.permissions ? '*'))) then
   raise exception 'Only the platform owner can create administrative roles' using errcode='42501';
 end if;
 if length(trim(coalesce(p_name,''))) < 3 or length(trim(coalesce(p_name,''))) > 60 then raise exception 'Role name must be 3–60 characters'; end if;
 if jsonb_typeof(p_permissions) <> 'array' then raise exception 'Permissions must be a JSON array'; end if;
 if p_permissions ? '*' then raise exception 'Wildcard permissions are reserved for the platform owner'; end if;
 insert into public.admin_roles(name,description,permissions,is_system) values(trim(p_name),coalesce(trim(p_description),''),p_permissions,false) returning id into v_id;
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,details) values(v_actor,'admin.role.create','admin_role',v_id::text,'Role created',jsonb_build_object('name',trim(p_name),'permissions',p_permissions));
 return v_id;
end $function$;

create or replace function public.admin_assign_role(p_target_user_id uuid, p_role_id uuid)
returns boolean language plpgsql security definer set search_path to 'public','auth'
as $function$
declare v_actor uuid := auth.uid(); v_target_role text; v_new_role text; v_active_super_count integer;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if v_actor=p_target_user_id then raise exception 'You cannot change your own administrative role' using errcode='42501'; end if;
 if not exists(select 1 from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.user_id=v_actor and m.status='active' and (r.name='Owner' or (r.name='Super Administrator' and r.permissions ? '*'))) then
   raise exception 'Only the platform owner can assign administrative roles' using errcode='42501';
 end if;
 select r.name into v_target_role from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.user_id=p_target_user_id;
 select name into v_new_role from public.admin_roles where id=p_role_id;
 if v_new_role is null then raise exception 'Role not found'; end if;
 if v_target_role in ('Owner','Super Administrator') and v_new_role not in ('Owner','Super Administrator') then
   select count(*) into v_active_super_count from public.admin_memberships m join public.admin_roles r on r.id=m.role_id where m.status='active' and r.name in ('Owner','Super Administrator');
   if v_active_super_count <= 2 then raise exception 'At least two active platform owners/super administrators must remain'; end if;
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

insert into public.admin_policies(policy_code,category,title,description,severity,strike_expiry_days,zero_tolerance)
values
 ('HARASSMENT','harassment','Harassment and bullying','Targeted abuse, intimidation, or repeated unwanted contact.','medium',90,false),
 ('HATE','hate','Hateful conduct','Attacks or dehumanization targeting protected characteristics.','high',180,false),
 ('SPAM','spam','Spam and manipulation','Repeated unsolicited content, fake engagement, or platform manipulation.','low',90,false),
 ('SCAM','scams','Fraud and scams','Deceptive schemes, impersonation for gain, or malicious links.','high',180,false),
 ('IMPERSONATION','impersonation','Impersonation','Misrepresenting identity or pretending to be another person or organization.','medium',90,false),
 ('THREATS','violence','Credible threats','Credible threats of violence require urgent specialist review.','critical',365,true),
 ('MINOR_SAFETY','minor_safety','Child safety','Potential child exploitation or abuse requires restricted specialist handling.','critical',365,true),
 ('NUDITY','nudity','Sexual content','Sexual content that violates community rules.','high',90,false)
on conflict(policy_code) do nothing;

insert into public.admin_feature_flags(key,description,enabled)
values
 ('discover_recommendations','Enable personalized Discover recommendations',true),
 ('community_events','Enable community event surfaces',true),
 ('creator_studio','Enable creator studio tools',true),
 ('maintenance_mode','Maintenance mode (owner-controlled)',false)
on conflict(key) do nothing;
