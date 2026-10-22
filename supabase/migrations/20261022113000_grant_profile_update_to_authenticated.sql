-- Restore the table-level UPDATE privilege required by PostgREST.
-- Row-level security still limits profile updates to the authenticated user's own row.
grant update on table public.profiles to authenticated;
