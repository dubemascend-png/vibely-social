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
