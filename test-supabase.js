import { supabase } from './src/lib/supabase.js'

async function testSupabase() {
  console.log('🔍 Probando conexión a Supabase...')
  
  try {
    // Probar conexión básica
    const { data: testData, error: testError } = await supabase
      .from('obras')
      .select('*')
      .limit(5)
    
    if (testError) {
      console.error('❌ Error conectando a Supabase:', testError)
      return
    }
    
    console.log('✅ Conexión a Supabase exitosa')
    console.log('📊 Obras encontradas:', testData?.length || 0)
    
    if (testData && testData.length > 0) {
      console.log('🏗️ Primera obra:', testData[0])
    }
    
    // Probar materiales
    const { data: materialesData, error: materialesError } = await supabase
      .from('materiales')
      .select('*')
      .limit(5)
    
    if (materialesError) {
      console.error('❌ Error obteniendo materiales:', materialesError)
    } else {
      console.log('📦 Materiales encontrados:', materialesData?.length || 0)
      if (materialesData && materialesData.length > 0) {
        console.log('🔧 Primer material:', materialesData[0])
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

testSupabase()