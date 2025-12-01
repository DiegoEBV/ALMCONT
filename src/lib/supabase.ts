import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

console.log('✅ Supabase client initialized successfully')

// Cliente principal para operaciones normales
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Función para establecer contexto de usuario autenticado
export const setSupabaseUserContext = async (userId: string) => {
  try {
    await supabase.rpc('set_user_context', { user_id: userId })
  } catch (error) {
    console.error('Error setting user context:', error)
  }
}