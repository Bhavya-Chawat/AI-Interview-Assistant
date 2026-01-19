/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for authentication and storage.
 * 
 * SETUP REQUIRED:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Get your Project URL and Anon Key from Settings > API
 * 3. Add them to your .env file:
 *    - VITE_SUPABASE_URL=your_project_url
 *    - VITE_SUPABASE_ANON_KEY=your_anon_key
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
