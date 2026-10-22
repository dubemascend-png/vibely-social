-- Keep report evidence snapshots separate from the ordinary moderation queue.
drop policy if exists report_evidence_read on public.report_evidence;
create policy report_evidence_read on public.report_evidence for select to authenticated
using (public.admin_has_permission('reports.evidence.view'));
drop policy if exists report_evidence_write on public.report_evidence;
create policy report_evidence_write on public.report_evidence for insert to authenticated
with check (public.admin_has_permission('reports.evidence.manage'));
update public.admin_roles
set permissions = case when permissions ? 'reports.evidence.view' then permissions else permissions || '["reports.evidence.view"]'::jsonb end
where name='Super Administrator';
