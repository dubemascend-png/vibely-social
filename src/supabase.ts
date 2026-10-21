import { createClient } from '@supabase/supabase-js';

// Use direct property access so Next.js can inline public variables at build time.
// Keep Vite fallbacks for local development with the legacy Vite entry point.
const nextUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;
const nextKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : undefined;
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};
const url = nextUrl || viteEnv.VITE_SUPABASE_URL;
const key = nextKey || viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);

// Keep auth confirmation and password-recovery links inside the deployed app.
// GitHub Pages project sites require the repository base path; custom/root hosts do not.
export function getAppRedirectUrl(route = ''): string {
  if (typeof window === 'undefined') return '';
  const isProjectSite = window.location.pathname === '/vibely-social' ||
    window.location.pathname.startsWith('/vibely-social/');
  const base = isProjectSite ? '/vibely-social/' : '/';
  return new URL(route.replace(/^\\//, ''), window.location.origin + base).toString();
}

export const supabase = createClient(url || 'https://example.supabase.co', key || 'missing-publishable-key');
