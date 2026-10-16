import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://irdrdbwkfccplloirndz.supabase.co';
const supabaseKey = 'sb_publishable_yMCbw7Fy-WOMIN94PWZH4w_tOo3r39m';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('places').select('*').limit(5);
  console.log('Places data count:', data ? data.length : 0);
  console.log('Sample place:', data && data[0] ? data[0] : null);
  console.log('Places error:', error);
}

test();
