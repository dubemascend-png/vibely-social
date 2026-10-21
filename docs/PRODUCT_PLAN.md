# vibe.ly — Product plan and implementation roadmap

**Product:** vibe.ly  
**Tagline:** Find Your People. Feel the Vibe.  
**Principle:** nearby discovery is opt-in, location is approximate, and users control who can contact them.

## Repository and infrastructure assessment

- Web repository: `dubemascend-png/vibely-social`
- Backend: separate Supabase project `jzcxybjtexyeoweyelfg` in Europe West.
- Existing web app: React + TypeScript + Vite starter. It is not yet the requested Next.js production architecture.
- Existing database: profiles, posts, follows, likes, comments, conversations, conversation_members, messages, notifications, blocks, and reports. RLS is enabled on all inspected public tables.
- Existing storage: public avatar and post-media buckets. Public media is suitable only for intentionally public content; private account/story/message media needs private buckets and signed access.
- Existing build check: GitHub Actions workflow added; its first run exposed a missing-lockfile/cache configuration issue, which has been corrected. Verify the latest run before treating CI as passing.
- eCuisine resources are out of scope and must not be modified.

## Design rationale from public product documentation

- TikTok: a discovery feed can help users find creators beyond their existing network, but it should provide preference controls, content diversity, and understandable recommendation reasons. Source: https://www.tiktok.com/safety/en/making-your-feed-for-you
- Snapchat: location sharing is off by default and users choose who can see their location. vibe.ly should apply the stricter nearby-discovery interpretation: opt-in, approximate area only, pause/hide control, and no background tracking. Source: https://help.snapchat.com/hc/en-us/articles/7012309470740-How-do-I-share-my-location-on-Snap-Map
- WhatsApp: group conversations benefit from voice/video notes, events, polls, and privacy controls. Prioritize dependable text and group messaging first; add richer message types only after delivery, access control, and reporting are reliable. Source: https://www.whatsapp.com/groups
- Reddit: interest communities work when users can find topic-based groups with distinct membership and moderation models. Source: https://support.reddithelp.com/hc/en-us/articles/204533569-What-are-communities-or-subreddits

These are interaction principles, not UI templates or assets to copy.

## Product design system

- Brand: custom lowercase wordmark `vibe.ly`; abstract rounded “v” icon.
- Palette: electric violet primary, coral/pink warmth, cyan accent, soft neutral light surfaces, deliberate dark theme.
- Typography: Manrope for expressive headings; a readable sans-serif for body and controls.
- Mobile navigation: Home, Discover, Create, Messages, Profile. Notifications are accessible from the top bar and message inbox.
- Motion: short purposeful transitions, reduced-motion support, skeletons and explicit loading/error/empty states.
- Accessibility: keyboard focus, semantic controls, readable contrast, touch targets, alt text and captions.

## Delivery milestones

### Milestone 1 — Stable core foundation
1. Align the UI queries and writes with the actual Supabase schema.
2. Make the CI build reproducible and passing.
3. Complete registration, email verification messaging, sign-in, password recovery, profile editing, unique usernames, and safe session handling.
4. Complete paginated feed, posts, media, likes, comments, follow/unfollow, saved posts, and user reporting.
5. Verify RLS and cross-account access before exposing the app publicly.

### Milestone 2 — Privacy and nearby discovery
1. Add user settings, normalized interests, opt-in nearby-discovery preferences, and manual city/area selection.
2. Add follow requests for private accounts and enforce protected-post visibility in RLS.
3. Add blocks, mutes, privacy-aware search, approximate distance only, and explicit location permission UX.
4. Do not persist or display precise device coordinates by default.

### Milestone 3 — Communication and daily sharing
1. Real-time direct/group messages with member-only reads, pagination, read states, retry handling, and reporting.
2. Notifications created only from real events, read state, category preferences, and realtime updates.
3. Stories with audience controls and server-enforced expiry.
4. Short video feed with efficient playback, upload limits, and moderation controls.

### Milestone 4 — Communities and safety operations
1. Public/private communities, join requests, moderators, rules, and community reporting.
2. Moderation queues, actions, appeals, and audit logs.
3. Server-enforced owner/admin/moderator/support roles; never trust hidden routes or user-editable metadata.
4. Account deactivation/deletion and documented data-retention rules.

### Milestone 5 — Architecture, native mobile, release
1. Move the web app to Next.js + TypeScript + Tailwind once the core behavior and schema are stable; preserve existing functionality during migration.
2. Add a separate Expo React Native app sharing the same Supabase auth and data contracts.
3. Add automated unit/integration/end-to-end tests and security policy tests.
4. Deploy the web app, configure auth redirect URLs and email delivery, then build and test the Android app on a physical device.
5. Verify production secrets, privacy settings, backups, monitoring, performance budgets, and release checklists.

## Security and quality gates

- RLS enabled on every exposed user-data table.
- Test access as two unrelated authenticated users and as anonymous users.
- Private accounts and blocked users must not leak protected posts, messages, or nearby status.
- Never put service-role/secret keys in browser or mobile bundles.
- Never claim end-to-end encryption without a reviewed implementation.
- Nearby visibility defaults off; no silent background location tracking.
- Media access and file size/type must be enforced by storage policy/server-side checks, not only the UI.
- Each feature is marked implemented only after its success, failure, empty, loading, privacy, and cross-account behavior is tested.

## Current status (not a production-ready release)

The initial UI supports basic email/password auth, a feed, post uploads, likes, comments, and follow/unfollow, but several screens are placeholders. Messaging, notifications, Stories, nearby discovery, communities, admin/moderation workflows, password recovery, account deletion, the Next.js migration, Expo app, deployment, and end-to-end testing are still pending. Do not represent the current repository as complete or deployed.
