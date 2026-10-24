
import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env
  : (typeof globalThis !== 'undefined' && globalThis.process?.env)
    ? globalThis.process.env
    : {};

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://irdrdbwkfccplloirndz.supabase.co';
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_yMCbw7Fy-WOMIN94PWZH4w_tOo3r39m';

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  if (typeof console !== 'undefined' && env.DEV) {
    console.warn(
      '[Supabase Notice] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in environment. Falling back to project configuration.'
    );
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey);

