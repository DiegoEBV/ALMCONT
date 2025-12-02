import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('Faltan variables .env VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(url, anon)

const email = process.argv[2] || 'coordinador@obra.com'

async function main() {
  console.log('🔍 Probando SELECT usuarios por email (RLS con anon key) ...')
  console.log('URL:', url)
  console.log('Email:', email)
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (error) {
    console.error('❌ Error SELECT usuarios:', error)
  } else {
    console.log('✅ Resultado:', data)
  }
}

main().catch(err => {
  console.error('Error general:', err)
  process.exit(1)
})

