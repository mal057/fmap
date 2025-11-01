/**
 * Supabase client configuration for FishMap
 * Centralized client instance for authentication and database operations
 */

import { createClient } from '@supabase/supabase-js';

// Environment variable keys for different platforms
// Check multiple sources to ensure compatibility across build tools and environments
const SUPABASE_URL_KEY =
  // First check Vite's import.meta.env (for browser/Vite environments)
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  // Then check process.env (for Node.js/build time)
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  // Check window for any runtime injected variables
  (typeof window !== 'undefined' && (window as any).VITE_SUPABASE_URL) ||
  undefined;

const SUPABASE_ANON_KEY =
  // First check Vite's import.meta.env (for browser/Vite environments)
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  // Then check process.env (for Node.js/build time)
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  // Check window for any runtime injected variables
  (typeof window !== 'undefined' && (window as any).VITE_SUPABASE_ANON_KEY) ||
  undefined;

// Debug logging in development
if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  console.log('[shared-utils/supabase.ts] Environment check:');
  console.log('  SUPABASE_URL_KEY:', SUPABASE_URL_KEY || 'NOT SET');
  console.log('  SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET');
  console.log('  import.meta available:', typeof import.meta !== 'undefined');
  console.log('  import.meta.env:', typeof import.meta !== 'undefined' ? import.meta.env : 'N/A');
}

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
