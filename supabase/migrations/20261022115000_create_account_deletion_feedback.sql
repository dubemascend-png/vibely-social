create table if not exists public.account_deletion_feedback (
  id uuid primary key default gen_random_uuid(),
  reason text not null check (reason in (
    'I no longer use Vibe.ly',
    'I have privacy or security concerns',
    'I’m receiving too many notifications',
    'I’m experiencing technical problems',
    'I’m not finding the content or people I want',
    'I’m concerned about harassment or inappropriate content',
    'I’m switching to another platform',
    'I created another account',
    'Other'
  )),
  details text null check (details is null or char_length(details) <= 2000),
  created_at timestamptz not null default now()
);
alter table public.account_deletion_feedback enable row level security;
revoke all on table public.account_deletion_feedback from anon, authenticated;
grant insert on table public.account_deletion_feedback to service_role;
