/**
 * Supabase client configuration for FishMap
 * Centralized client instance for authentication and database operations
 */

import { createClient } from '@supabase/supabase-js';

// Environment variable keys for different platforms
const SUPABASE_URL_KEY = typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL
  ? process.env.VITE_SUPABASE_URL
  : import.meta?.env?.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY = typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY
  ? process.env.VITE_SUPABASE_ANON_KEY
  : import.meta?.env?.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!SUPABASE_URL_KEY || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing required Supabase environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file. ' +
    'See docs/supabase-setup.md for setup instructions.'
  );
}

/**
 * Shared Supabase client instance
 * This client is configured with:
 * - Automatic session persistence in localStorage (web)
 * - Auto-refresh for expired sessions
 * - Proper auth headers for all requests
 */
export const supabase = createClient(SUPABASE_URL_KEY, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Type definitions for Supabase Auth
 */
export type { User, Session, AuthError } from '@supabase/supabase-js';
