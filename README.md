# vibe.ly — Find Your People. Feel the Vibe.

Mobile-first social platform using Next.js App Router, React, TypeScript, Tailwind CSS, and Supabase. The Vite entry remains as a temporary fallback while the Next.js path becomes the primary web app. This repository and backend are separate from eCuisine.

## Latest deployment
- Profile picture and profile cover/background image uploads are implemented.
- Android Social and Admin APKs are built by the GitHub Actions workflow and published under `public/downloads/`.
- Download the apps from [Vibe.ly Downloads](https://dubemascend-png.github.io/vibely-social/downloads/).
- This deployment is a test build, not a claim that every planned feature is production-ready.

## Current working features
- Email/password sign-up and sign-in with Supabase Auth
- Email-based password recovery and reset flow
- Profile editing for display name, username, and bio
- Responsive feed with text, image, and video posts
- Opt-in nearby discovery by manually selected city/area; no precise coordinates or background tracking
- Supabase media uploads, likes, comments, follow/unfollow
- Direct conversations and realtime text messages
- Realtime in-app notifications for follows, likes, comments, and new messages
- Notification read state and mark-all-read
- RLS-enabled database foundation and private-schema notification triggers
- Responsive mobile navigation

## Supabase environment
Set these in `.env.local` or your hosting provider:

```env
VITE_SUPABASE_URL=https://jzcxybjtexyeoweyelfg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Only use the publishable key in client-side code. Never put a service-role or secret key in Vite/Next.js public environment variables or mobile binaries.

## Run locally
```bash
npm install
npm run dev
npm run build
```

## Roadmap and research
See [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md) for product rationale, privacy principles, architecture, milestones, and acceptance gates.

## Not yet production complete
Nearby discovery and its opt-in privacy settings, private-account follow requests, Stories, short-video recommendation/processing, communities, admin/moderation tools, account deletion/deactivation, full message privacy controls, automated end-to-end and RLS boundary tests, Next.js migration, Expo native app, deployment, push notifications, and physical-device verification remain to be built and tested. The current repo is not yet a production release.

## Backend services (Phase A)

Supabase remains the source of truth. New feature work should use the shared modules under `src/services/` rather than repeating queries inside screens.

- `auth.ts`: session restoration, sign-in/up, password recovery, sign-out.
- `profiles.ts`, `posts.ts`, `comments.ts`, `follows.ts`: account and feed operations.
- `videos.ts`, `recommendations.ts`, `uploads.ts`, `analytics.ts`: playback, feedback, media and best-effort analytics.
- `communities.ts`, `events.ts`, `messages.ts`, `messageRequests.ts`, `notes.ts`, `stories.ts`, `polls.ts`, `drafts.ts`, `likes.ts`, `notifications.ts`, `search.ts`: feature-specific data operations.
- `request.ts`: retryable request errors, offline awareness and friendly error messages.

The Phase A migrations add owner-scoped `post_drafts` and `analytics_events`, expiry-aware `stories` and `user_notes`, `message_requests`, and community rules/topics metadata. Service functions validate user input for usability, but database RLS remains the security boundary. Do not put Supabase service-role keys in frontend environment variables. See [the backend security audit](docs/backend/SECURITY_AUDIT.md) for the current findings and items that require deliberate review.

### Local environment

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The publishable key is intended for client use; never use a service-role/secret key in the browser or APK.

### Seed realistic demo data (server-side only)

The guarded seed script is `scripts/seed-demo.mjs`. Run it only against a project where demo content is wanted, from a local terminal or trusted server environment:

```bash
SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVER_ONLY_SERVICE_ROLE_KEY" \
ALLOW_DEMO_SEED=true \
node scripts/seed-demo.mjs
```

The script creates or reuses two demo profiles, sample posts, follows, a community, a community post, a comment, a like, and a 24-hour note. It uses the service-role key, so **never** add that key to `.env.local` variables prefixed with `NEXT_PUBLIC_`, GitHub Pages, or the Android client. The safety flag is required to avoid accidental seeding.


### Admin Control Center expansion

The admin UI now includes permission-filtered navigation for Overview, Users, Content, Vibes, Communities, Moderation, Appeals, Enforcement, Purple Verification, Messages Safety, Analytics, Communications, Support, Admin Team & Roles, Audit log, System, and Settings.

The applied Supabase migrations for the admin expansion are:

- `20261022002000_admin_control_center_expansion.sql`: policy/strike/case/evidence/verification/support/announcement/feature-flag/session tables, RLS policies, initial policy data, and role RPC foundations.
- `20261022003000_admin_default_roles_and_rbac_hardening.sql`: least-privilege role presets and server-checked role creation/assignment.
- `20261022004000_admin_audit_triggers_and_appeal_review.sql` and `20261022004500_limit_audit_trigger_to_admin_activity.sql`: append-only audit trail events for admin table changes and independent appeal decisions.
- `20261022005000_secure_verification_decisions.sql`: atomic, permission-checked verification decisions with user notification.
- `20261022006000_moderation_case_ingestion.sql`: merges reports on the same content/account into moderation cases, sets severity/SLA, and captures report snapshots.
- `20261022007000_admin_content_read_policies.sql`: permission-checked admin read policies for content and communities.
- `20261022008000_restrict_sensitive_report_evidence.sql`: restricts evidence-table access to the dedicated `reports.evidence.view` permission.
- `20261022009000_admin_operational_metrics.sql`: adds Lagos-day signups, DAU/MAU, active enforcement, breached SLA, critical case, and failed-upload metrics to the server-checked dashboard summary.
- `20261022010000_action_specific_moderation_permissions.sql`: enforces action-specific permissions and prevents admins acting on peers or higher-ranked administrators.
- `20261022011000_mask_user_pii_and_audit_reveals.sql` and `20261022012000_require_reason_for_pii_reveal.sql`: mask contact details by default and require explicit permission plus a reason for logged reveal.
- `20261022013000_align_review_permissions_and_report_rpc.sql`: aligns report/appeal RLS with scoped review permissions and routes report status updates through an audited RPC.
- [Admin role permission test matrix](docs/admin/ROLE_PERMISSION_TEST_MATRIX.md): intended allow/deny matrix and manual test checklist.

The current console uses live database reads for content, Vibes, communities, reports/cases, appeals, policy records, verification requests, message-volume counts, support tickets, announcements, feature flags, roles, and audit history. The Messages Safety page intentionally shows counts only, never private message bodies.

**Not yet complete and must not be represented as live functionality:** email delivery for admin invitations and announcements, admin 2FA enforcement/session revocation, custom charts/cohort retention, data export workflows, advanced community enforcement, and user-facing submission flows for verification/support. Announcement creation saves drafts only; it does not send email or push. The role/session schema is groundwork and does not itself enforce MFA. The case snapshot stores report metadata without attaching media URLs for critical categories; restricted evidence review is permission-gated separately.

The active root account currently uses the `Owner` role with wildcard permissions. Keep this role private, provision a second trusted Super Administrator before attempting to demote the owner, and test role access with separate accounts before inviting staff. The database blocks self-role changes and prevents demotion when it would leave fewer than two active Owner/Super Administrator accounts.

### Verification

Run `npm run lint` and `npm run build` before shipping changes. Feature phases should also include a manual authenticated-user check and a cross-user RLS check for any new or changed data path.


### Admin dashboard coverage

The admin overview uses the permission-checked `admin_dashboard_summary()` RPC for live counts of registered users, posts, videos, communities, messages, reports, open reports, pending appeals, message requests, active stories, and administrators. The Audit log section reads the latest 100 records from `admin_audit_log`; its RLS policy allows only active administrators with `*` or `audit.view` permission to read records.

Authentication errors are normalized into actionable messages. If a user sees “Invalid login credentials”, the project logs cannot distinguish a mistyped password from an account that does not exist in this Supabase project. Verify that the app is pointed at the intended project before attempting account recovery. Password reset emails are subject to the configured Supabase email provider and its rate limits.
