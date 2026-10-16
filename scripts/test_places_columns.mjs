import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://irdrdbwkfccplloirndz.supabase.co';
const supabaseKey = 'sb_publishable_yMCbw7Fy-WOMIN94PWZH4w_tOo3r39m';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // Try inserting with all fields
  const testRow = {
    name: 'موقع تجريبي',
    name_en: 'Test Site',
    slug: 'test-site-check',
    city: 'القاهرة',
    category: 'historical',
    description: 'وصف تجريبي',
    image_url: 'https://example.com/test.jpg',
    gallery: ['https://example.com/test1.jpg'],
    latitude: 30.0444,
    longitude: 31.2357,
    is_published: true
  };
  const { data, error } = await supabase.from('places').insert(testRow).select();
  console.log('Insert test result:', data);
  console.log('Insert test error:', error);

  if (data && data.length > 0) {
    // Delete the test row
    await supabase.from('places').delete().eq('slug', 'test-site-check');
    console.log('Cleaned up test row.');
  }
}

test();
