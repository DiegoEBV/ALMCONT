import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debugging: Log environment variables status
console.log('🔍 Supabase Environment Variables Check:')
console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Defined' : '❌ Missing')
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Defined' : '❌ Missing')

// Additional debugging for production
console.log('🌍 Environment:', import.meta.env.MODE)
console.log('🔗 Current URL:', window.location.href)
console.log('📦 All env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')))

if (supabaseUrl) {
  console.log('🔗 Supabase URL (first 30 chars):', supabaseUrl.substring(0, 30) + '...')
}
if (supabaseAnonKey) {
  console.log('🔑 Anon Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')
}

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

// Test connection immediately
supabase.from('usuarios').select('count', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) {
      console.error('❌ Supabase connection test failed:', error)
    } else {
      console.log('✅ Supabase connection test successful. Users count:', count)
    }
  })
  .catch(err => {
    console.error('❌ Supabase connection test error:', err)
  })

// Función para establecer contexto de usuario autenticado
export const setSupabaseUserContext = async (userId: string) => {
  try {
    // Establecer el contexto del usuario en Supabase usando RPC
    await supabase.rpc('set_user_context', { user_id: userId })
  } catch (error) {
    console.warn('No se pudo establecer el contexto de usuario:', error)
  }
}