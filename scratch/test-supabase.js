const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  const { data, error } = await supabase
    .from('bottles')
    .select('*')
    .eq('serial', 'TEST1')
    .single();
    
  if (error) {
    console.error('Error fetching bottles:', error);
  } else {
    console.log('Successfully fetched bottles:', data);
  }

  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .limit(1);
    
  if (userError) {
    console.error('Error fetching users:', userError);
  } else {
    console.log('Successfully fetched users:', users);
  }
}

test();
