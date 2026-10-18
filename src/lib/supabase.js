
import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env
  : (typeof globalThis !== 'undefined' && globalThis.process?.env)
    ? globalThis.process.env
    : {};

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://irdrdbwkfccplloirndz.supabase.co';
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_yMCbw7Fy-WOMIN94PWZH4w_tOo3r39m';

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  // Use known project credentials or warning
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);

