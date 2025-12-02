import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('Faltan variables .env: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(url, anon)

async function checkView(name: string) {
  const { data, error } = await supabase.from(name).select('*').limit(1)
  if (error) {
    return { name, exists: false, error: error.message }
  }
  return { name, exists: true, sampleCount: (data?.length || 0) }
}

async function checkRLSWriteBlocked() {
  const { error } = await supabase
    .from('requerimientos')
    .update({ observaciones: 'test-rls' })
    .eq('id', '00000000-0000-0000-0000-000000000000')
  return { table: 'requerimientos', writeBlocked: !!error, error: error?.message }
}

async function main() {
  console.log('🔍 Comprobando vistas y RLS contra el proyecto Supabase actual...')

  const views = [
    'materiales_requieren_reorden',
    'resumen_ubicaciones',
    'conteos_pendientes',
  ]

  const viewResults = await Promise.all(views.map(checkView))
  viewResults.forEach(v => {
    if (v.exists) {
      console.log(`✅ Vista ${v.name} existe (muestra ${v.sampleCount} filas)`) 
    } else {
      console.log(`❌ Vista ${v.name} no accesible: ${v.error}`)
    }
  })

  const rls = await checkRLSWriteBlocked()
  if (rls.writeBlocked) {
    console.log(`✅ RLS activo: escritura bloqueada en ${rls.table} (${rls.error})`)
  } else {
    console.log(`⚠️ RLS no bloqueó escritura en ${rls.table}`)
  }
}

main().catch(err => {
  console.error('Error en comprobación:', err)
  process.exit(1)
})

