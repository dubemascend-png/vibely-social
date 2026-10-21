-- These tables are internal-only. Application access is mediated by permission-checked RPCs or trusted server code.
-- Direct table grants would be unsafe when RLS is enabled without user-facing policies.
revoke all privileges on table public.admin_enforcement_actions from anon, authenticated;
revoke all privileges on table public.admin_invitations from anon, authenticated;
revoke all privileges on table public.media_processing_jobs from anon, authenticated;
