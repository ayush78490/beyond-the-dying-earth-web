import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client (anon key — safe in the browser; the waitlist table is guarded by RLS).
 * Without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (local development) the X sign-in and
 * signups are simulated in the browser.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true },
      })
    : null;
