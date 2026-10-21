# Backend security audit — Phase A

Date: 2026-10-21
Project: Vibe.ly Supabase project already configured by this repository.

## Confirmed foundation

- Supabase Auth is used for email/password sign-in, registration, password recovery and persisted sessions.
- Core tables including `profiles`, `posts`, `follows`, `likes`, `comments`, `conversations`, `conversation_members`, `messages`, `notifications`, `communities`, `community_members`, video libraries/preferences/playlists, playback events and recommendation feedback exist.
- RLS is enabled on the inspected core tables. Policies are already present for many ownership and participant boundaries.
- Frontend configuration uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; no service-role key should be added to the client.

## Findings from Supabase advisors

The security advisor reported these tables with RLS enabled but no policies: `admin_audit_log`, `admin_enforcement_actions`, `admin_invitations`, and `media_processing_jobs`. These may be intentionally server-only; verify intended access before adding any client policy. Do not expose them just to make a client request succeed.

The advisor also reported exposed `SECURITY DEFINER` functions, including:
- `admin_set_profile_verified(uuid, boolean)` callable by `anon`
- `enforce_vibely_publication_permissions()` callable by `anon` and `authenticated`
- Multiple privileged/admin or data-aggregation functions callable by `authenticated`

These need a function-by-function review of function body, intended caller, grants and trigger usage. In particular, a trigger-only function should not be callable as a Data API RPC. Do not blanket-revoke authenticated execution from every function: some RPCs may be intentionally used by the app and should contain explicit authorization checks. Do not add `SECURITY DEFINER` as a workaround for an RLS error.

## Phase A code changes

- Added a shared `src/services/` layer for auth, profiles, posts, comments, follows, videos, communities, events, messages, notifications, search, recommendations, uploads, analytics and request handling.
- Auth flows in `src/App.tsx` now call the shared auth service; session restore and sign-out errors are surfaced through friendly error handling.
- Service queries use the existing schema where verified. Analytics is best-effort until a dedicated analytics table is added through a reviewed migration.
- No database tables or policies were changed in this phase; the existing RLS configuration is preserved.

## Follow-up security checks

1. Review each reported SECURITY DEFINER function's definition and grants; restrict unauthenticated RPC access where not intentional.
2. Verify that private conversations can be read only by their members and community content follows the actual membership/visibility rules.
3. Verify private-account visibility and follow-request behavior; the currently inspected `profiles` SELECT policy permits signed-in users to read profile rows, so privacy behavior must not rely on UI hiding alone.
4. Keep server-side validation and RLS tests for every new table and mutation.
5. Add analytics storage only through a migration with owner-scoped RLS; never silently create a client-accessible table without policies.
