# vibe.ly — Find Your People. Feel the Vibe.

Mobile-first social platform using React, TypeScript, Vite, and Supabase as the current implementation foundation. The roadmap documents a planned migration to Next.js for web and Expo/React Native for Android/iOS. This repository and backend are separate from eCuisine.

## Current working features
- Email/password sign-up and sign-in with Supabase Auth
- Email-based password recovery and reset flow
- Profile editing for display name, username, and bio
- Responsive feed with text, image, and video posts
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
