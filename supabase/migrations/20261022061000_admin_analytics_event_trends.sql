-- Privacy-preserving event trends for authorized Vibe.ly administrators.
-- Returns daily aggregates only; never returns user IDs or event properties.

create or replace function public.admin_analytics_event_trend(p_since timestamptz default now() - interval '30 days')
returns table (
  event_day date,
  event_name text,
  event_count bigint,
  unique_users bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_since timestamptz := greatest(
    coalesce(p_since, now() - interval '30 days'),
    now() - interval '90 days'
  );
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.admin_memberships m
    join public.admin_roles r on r.id = m.role_id
    where m.user_id = v_actor
      and m.status = 'active'
      and (coalesce(r.permissions, '[]'::jsonb) ? '*'
        or coalesce(r.permissions, '[]'::jsonb) ? 'analytics.view')
  ) then
    raise exception 'Analytics permission required' using errcode = '42501';
  end if;

  return query
  select
    ae.created_at::date as event_day,
    ae.event_name,
    count(*)::bigint as event_count,
    count(distinct ae.user_id)::bigint as unique_users
  from public.analytics_events ae
  where ae.created_at >= v_since
    and ae.created_at <= now()
  group by ae.created_at::date, ae.event_name
  order by ae.created_at::date, ae.event_name;
end;
$function$;

revoke all on function public.admin_analytics_event_trend(timestamptz) from public, anon;
grant execute on function public.admin_analytics_event_trend(timestamptz) to authenticated, service_role;
