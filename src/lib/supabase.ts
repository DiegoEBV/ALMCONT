import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 🚨 DEBUGGING CRÍTICO PARA GITHUB PAGES
console.log('🔍 === SUPABASE DEBUG PARA GITHUB PAGES ===')
console.log('🌍 Environment Mode:', import.meta.env.MODE)
console.log('🔗 Current URL:', window.location.href)
console.log('📦 Available VITE_ vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')))

// Verificación detallada de variables
console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Defined' : '❌ MISSING')
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Defined' : '❌ MISSING')

if (supabaseUrl) {
  console.log('🔗 Supabase URL:', supabaseUrl)
  console.log('🔗 URL Length:', supabaseUrl.length)
} else {
  console.error('❌ VITE_SUPABASE_URL is undefined or empty')
}

if (supabaseAnonKey) {
  console.log('🔑 Anon Key (first 50 chars):', supabaseAnonKey.substring(0, 50) + '...')
  console.log('🔑 Key Length:', supabaseAnonKey.length)
} else {
  console.error('❌ VITE_SUPABASE_ANON_KEY is undefined or empty')
}

// 🚨 ERROR CRÍTICO SI FALTAN VARIABLES
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = []
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY')
  
  console.error('🚨 CRITICAL ERROR: Missing Supabase environment variables:', missingVars.join(', '))
  console.error('🔧 SOLUTION FOR GITHUB PAGES:')
  console.error('1. Go to GitHub repository: Settings > Secrets and variables > Actions')
  console.error('2. Add these EXACT secrets:')
  console.error('   - Name: VITE_SUPABASE_URL')
  console.error('   - Value: https://gqhyrntdedrazmcjndhs.supabase.co')
  console.error('   - Name: VITE_SUPABASE_ANON_KEY')
  console.error('   - Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q')
  console.error('3. Make a commit to trigger new deployment')
  
  // Mostrar error visible en la UI también
  const errorDiv = document.createElement('div')
  errorDiv.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; 
    background: #ff4444; color: white; padding: 20px; 
    z-index: 9999; font-family: monospace; font-size: 14px;
  `
  errorDiv.innerHTML = `
    <strong>🚨 GITHUB PAGES ERROR:</strong><br>
    Missing Supabase environment variables: ${missingVars.join(', ')}<br>
    <strong>Solution:</strong> Configure GitHub Secrets in repository settings
  `
  document.body.appendChild(errorDiv)
  
  throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}`)
}

console.log('✅ Supabase client initialized successfully')

// Cliente principal para operaciones normales
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// 🔍 Test de conexión inmediato con logging detallado
console.log('🔄 Testing Supabase connection...')
supabase.from('usuarios').select('count', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) {
      console.error('❌ Supabase connection test FAILED:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ Supabase connection test SUCCESSFUL!')
      console.log('✅ Users count in database:', count)
      console.log('✅ Ready for authentication')
    }
  })
  .catch(err => {
    console.error('❌ Supabase connection test EXCEPTION:', err)
    console.error('❌ Exception details:', JSON.stringify(err, null, 2))
  })

// Función para establecer contexto de usuario autenticado
export const setSupabaseUserContext = async (userId: string) => {
  try {
    console.log('🔄 Setting user context for:', userId)
    await supabase.rpc('set_user_context', { user_id: userId })
    console.log('✅ User context set successfully')
  } catch (error) {
    console.warn('⚠️ Could not set user context:', error)
  }
}