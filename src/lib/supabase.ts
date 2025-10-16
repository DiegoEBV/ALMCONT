import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debugging: Log environment variables status
console.log('🔍 Supabase Environment Variables Check:')
console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Defined' : '❌ Missing')
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Defined' : '❌ Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = []
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY')
  
  console.error('❌ Missing Supabase environment variables:', missingVars.join(', '))
  console.error('🔧 To fix this:')
  console.error('1. Go to GitHub repository Settings > Secrets and variables > Actions')
  console.error('2. Add the following secrets:')
  console.error('   - VITE_SUPABASE_URL: Your Supabase project URL')
  console.error('   - VITE_SUPABASE_ANON_KEY: Your Supabase anon key')
  
  throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}`)
}

console.log('✅ Supabase client initialized successfully')

// Cliente principal para operaciones normales
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Función para establecer contexto de usuario autenticado
export const setSupabaseUserContext = async (userId: string) => {
  try {
    // Establecer el contexto del usuario en Supabase usando RPC
    await supabase.rpc('set_user_context', { user_id: userId })
  } catch (error) {
    console.warn('No se pudo establecer el contexto de usuario:', error)
  }
}