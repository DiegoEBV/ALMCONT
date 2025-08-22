import dotenv from 'dotenv';
import { supabase } from './supabaseNode.js';

dotenv.config();

async function getUserId() {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email')
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    
    console.log('Found user:', data);
    return data.id;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

getUserId().then(id => {
  console.log('User ID:', id);
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});