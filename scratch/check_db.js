
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

async function checkData() {
  const { data: rawItems } = await supabase.from('products').select('name, type').eq('type', 'RAW');
  console.log('Raw Items:', rawItems);
  
  const { data: finishedItems } = await supabase.from('products').select('name, type').eq('type', 'FINISHED');
  console.log('Finished Items:', finishedItems);
}

checkData();
