-- Enforce aal2 for administrative data access and privileged RPCs.
-- Apply this migration only with the corresponding MFA enrollment UI deployed.

create or replace function public.admin_require_mfa()
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $function$
begin
  if coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    raise exception 'Multi-factor authentication is required for administrator operations'
      using errcode = '42501';
  end if;
end;
$function$;

revoke all on function public.admin_require_mfa() from public, anon, authenticated;

create or replace function public.admin_has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
    and exists (
      select 1
      from public.admin_memberships m
      join public.admin_roles r on r.id = m.role_id
      where m.user_id = auth.uid()
        and m.status = 'active'
        and (r.permissions ? '*' or r.permissions ? required_permission)
    );
$function$;

-- Several older RPCs perform direct membership checks rather than calling
-- admin_has_permission. Inject the same server-side MFA check into those
-- exact deployed function definitions, failing closed if a definition differs.
do $migration$
declare
  v_signature text;
  v_oid regprocedure;
  v_definition text;
  v_begin_pos integer;
  v_signatures text[] := array[
    'public.admin_assign_role(uuid, uuid)',
    'public.admin_create_role(text, text, jsonb)',
    'public.admin_reveal_user_pii(uuid, text)',
    'public.admin_set_profile_verified(uuid, boolean)',
    'public.admin_take_moderation_action(uuid, text, text, integer, uuid)',
    'public.admin_user_directory(text, integer, integer)'
  ];
begin
  foreach v_signature in array v_signatures loop
    v_oid := to_regprocedure(v_signature);
    if v_oid is null then
      raise exception 'Required administrative function is missing: %', v_signature;
    end if;
    v_definition := pg_get_functiondef(v_oid);
    if position('public.admin_require_mfa()' in v_definition) = 0 then
      v_begin_pos := position(E'\nbegin' in lower(v_definition));
      if v_begin_pos = 0 then
        raise exception 'Could not safely locate function body BEGIN for %', v_signature;
      end if;
      v_definition := overlay(
        v_definition placing E'\n  perform public.admin_require_mfa();'
        from v_begin_pos + length(E'\nbegin') for 0
      );
      execute v_definition;
    end if;
  end loop;
end;
$migration$;

-- The generic writer accepts arbitrary audit event metadata and has no client
-- callers. Do not expose it to API roles once MFA-gated permission checks apply.
revoke all on function public.admin_record_audit(text, text, text, text, jsonb)
  from public, anon, authenticated, service_role;
