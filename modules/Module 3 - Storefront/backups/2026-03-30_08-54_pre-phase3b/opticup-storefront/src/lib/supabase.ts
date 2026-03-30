import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Read-only Supabase client for storefront.
 * Uses anon key — can only access Views and RPC functions.
 * Returns null if env vars are not configured (build-time without DB).
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
        global: {
          headers: { 'x-client': 'opticup-storefront' }
        }
      })
    : null;
