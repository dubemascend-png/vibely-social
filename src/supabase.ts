import { createClient } from '@supabase/supabase-js';

// Use direct property access so Next.js can inline public variables at build time.
// Keep Vite fallbacks for local development with the legacy Vite entry point.
const nextUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;
const nextKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : undefined;
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};
const url = nextUrl || viteEnv.VITE_SUPABASE_URL;
const key = nextKey || viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);
export const supabase = createClient(url || 'https://example.supabase.co', key || 'missing-publishable-key');
