import { createClient } from '@supabase/supabase-js';

// Supabase client singleton
let supabase = null;

export function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          'x-application-name': 'hotel-booking-api'
        }
      }
    });
  }

  return supabase;
}

// Database helper functions
export async function executeQuery(query, params = {}) {
  const client = getSupabaseClient();
  const { data, error } = await query(client, params);
  
  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(`Database error: ${error.message}`);
  }
  
  return data;
}

// Connection pool management
export async function checkDatabaseConnection() {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('_health_check').select('1').limit(1);
    
    // If table doesn't exist, that's okay - we just want to check connection
    if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}