import { createClient } from '@supabase/supabase-js';

const processEnv = typeof process !== 'undefined' ? process.env : {};
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};
const url = processEnv.NEXT_PUBLIC_SUPABASE_URL || viteEnv.VITE_SUPABASE_URL;
const key = processEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabaseConfigured = Boolean(url && key);
export const supabase = createClient(url || 'https://example.supabase.co', key || 'missing-publishable-key');
