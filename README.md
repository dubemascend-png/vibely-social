# Vibely Social

Mobile-first social networking web app built with React, TypeScript, Vite, and Supabase. This repository and its backend are separate from eCuisine.

## Implemented in the initial frontend
- Email/password registration and sign-in using Supabase Auth
- Responsive mobile/desktop social feed
- Text, photo, and video posts uploaded to the `vibely-posts` storage bucket
- Like/unlike posts and add comments
- Discover profiles and follow/unfollow members
- Basic profile view and mobile navigation
- Progressive Web App manifest

## Environment variables
Set these in `.env.local` or your hosting provider's environment settings:

```env
VITE_SUPABASE_URL=https://jzcxybjtexyeoweyelfg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use only the publishable/anon key in browser apps. **Never put a service-role key or any secret key in Vite client environment variables.**

## Run locally
```bash
npm install
npm run dev
npm run build
```

## Deployment
Import this repository into Vercel, Netlify, or another Vite-compatible static host and set the two environment variables above. Add the deployed URL to Supabase Auth's Site URL and Redirect URLs. The Android app/package should be built after web deployment is verified.

## Remaining work
This is the first working frontend foundation, not a finished production social network. Messaging and notifications screens are placeholders. Profile editing, password recovery, account settings, moderation/report flows, automated tests, Android packaging, deployment, and end-to-end verification remain. Email confirmation behavior depends on Supabase Auth settings.