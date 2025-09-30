// Test simple de conexión a Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('🔍 Probando conexión a Supabase...')
  
  try {
    // Test 1: Verificar conexión básica
    console.log('📊 Test 1: Verificando conexión...')
    const { data, error } = await supabase.from('usuarios').select('count').limit(1)
    if (error) {
      console.error('❌ Error en conexión:', error)
    } else {
      console.log('✅ Conexión exitosa')
    }
    
    // Test 2: Consultar requerimientos
    console.log('📊 Test 2: Consultando requerimientos...')
    const { data: reqs, error: reqError } = await supabase
      .from('requerimiento_materiales')
      .select('id, estado')
      .eq('estado', 'PENDIENTE')
    
    if (reqError) {
      console.error('❌ Error en requerimientos:', reqError)
    } else {
      console.log('✅ Requerimientos:', reqs?.length || 0, reqs)
    }
    
    // Test 3: Consultar stock
    console.log('📊 Test 3: Consultando stock...')
    const { data: stock, error: stockError } = await supabase
      .from('stock_obra_material')
      .select('id, stock_actual')
      .lt('stock_actual', 10)
    
    if (stockError) {
      console.error('❌ Error en stock:', stockError)
    } else {
      console.log('✅ Stock bajo:', stock?.length || 0, stock)
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

testConnection()