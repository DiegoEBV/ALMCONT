const { createClient } = require('@supabase/supabase-js');

// Usar las mismas variables que usa el frontend
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFrontendConnection() {
  console.log('🧪 Probando conexión desde frontend (anon key)...');
  
  try {
    // Test 1: Verificar conexión básica
    console.log('\n1. Probando conexión básica...');
    const { data: testConnection, error: connectionError } = await supabase
      .from('usuarios')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Error de conexión:', connectionError);
    } else {
      console.log('✅ Conexión exitosa');
    }
    
    // Test 2: Probar consulta de requerimientos (como en el dashboard)
    console.log('\n2. Probando consulta de requerimientos pendientes...');
    const { data: requerimientos, error: reqError } = await supabase
      .from('requerimiento_materiales')
      .select('id, estado')
      .eq('estado', 'PENDIENTE');
    
    if (reqError) {
      console.error('❌ Error consultando requerimientos:', reqError);
      console.error('❌ Código de error:', reqError.code);
      console.error('❌ Mensaje:', reqError.message);
    } else {
      console.log('✅ Requerimientos pendientes:', requerimientos?.length || 0);
      console.log('✅ Datos:', requerimientos?.slice(0, 3));
    }
    
    // Test 3: Probar consulta de stock
    console.log('\n3. Probando consulta de stock bajo...');
    const { data: stockBajo, error: stockError } = await supabase
      .from('stock_obra_material')
      .select('id, stock_actual')
      .lt('stock_actual', 10);
    
    if (stockError) {
      console.error('❌ Error consultando stock:', stockError);
      console.error('❌ Código de error:', stockError.code);
      console.error('❌ Mensaje:', stockError.message);
    } else {
      console.log('✅ Items con stock bajo:', stockBajo?.length || 0);
      console.log('✅ Datos:', stockBajo?.slice(0, 3));
    }
    
    // Test 4: Probar consulta de entradas
    console.log('\n4. Probando consulta de entradas...');
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    
    const { data: entradas, error: entradasError } = await supabase
      .from('entradas')
      .select('id, created_at')
      .gte('created_at', inicioMes.toISOString());
    
    if (entradasError) {
      console.error('❌ Error consultando entradas:', entradasError);
      console.error('❌ Código de error:', entradasError.code);
      console.error('❌ Mensaje:', entradasError.message);
    } else {
      console.log('✅ Entradas del mes:', entradas?.length || 0);
      console.log('✅ Datos:', entradas?.slice(0, 3));
    }
    
    // Test 5: Probar consulta de salidas
    console.log('\n5. Probando consulta de salidas...');
    const { data: salidas, error: salidasError } = await supabase
      .from('salidas')
      .select('id, created_at')
      .gte('created_at', inicioMes.toISOString());
    
    if (salidasError) {
      console.error('❌ Error consultando salidas:', salidasError);
      console.error('❌ Código de error:', salidasError.code);
      console.error('❌ Mensaje:', salidasError.message);
    } else {
      console.log('✅ Salidas del mes:', salidas?.length || 0);
      console.log('✅ Datos:', salidas?.slice(0, 3));
    }
    
    console.log('\n📊 Resumen de pruebas de conexión frontend:');
    console.log('- Requerimientos pendientes:', requerimientos?.length || 0);
    console.log('- Stock bajo:', stockBajo?.length || 0);
    console.log('- Entradas del mes:', entradas?.length || 0);
    console.log('- Salidas del mes:', salidas?.length || 0);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testFrontendConnection();