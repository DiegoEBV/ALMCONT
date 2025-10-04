const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 Testing stock service methods...');

async function testStockService() {
  try {
    // Test getStockWithFilters
    console.log('\n📊 Testing getStockWithFilters...');
    const { data: stockData, error: stockError } = await supabase
      .from('stock_obra_material')
      .select(`
        *,
        obras!inner(id, nombre),
        materiales!inner(id, codigo, nombre, categoria, unidad_medida)
      `)
      .limit(10);
    
    if (stockError) {
      console.error('❌ Error getting stock:', stockError);
    } else {
      console.log('✅ Stock data retrieved:', stockData?.length || 0, 'items');
      if (stockData && stockData.length > 0) {
        console.log('📋 Sample stock item:', JSON.stringify(stockData[0], null, 2));
      }
    }

    // Test kardex movements query
    console.log('\n📊 Testing kardex movements query...');
    
    // Test entrada_items
    const { data: entradaData, error: entradaError } = await supabase
      .from('entrada_items')
      .select(`
        *,
        entradas!inner(
          obras!inner(id, nombre),
          obra_id,
          fecha_entrada,
          numero_entrada
        ),
        materiales!inner(id, codigo, nombre, unidad_medida)
      `)
      .limit(10);
    
    if (entradaError) {
      console.error('❌ Error getting entrada items:', entradaError);
    } else {
      console.log('✅ Entrada items retrieved:', entradaData?.length || 0, 'items');
    }

    // Test salida_items
    const { data: salidaData, error: salidaError } = await supabase
      .from('salida_items')
      .select(`
        *,
        salidas!inner(
          obras!inner(id, nombre),
          obra_id,
          fecha_salida,
          numero_salida
        ),
        materiales!inner(id, codigo, nombre, unidad_medida)
      `)
      .limit(10);
    
    if (salidaError) {
      console.error('❌ Error getting salida items:', salidaError);
    } else {
      console.log('✅ Salida items retrieved:', salidaData?.length || 0, 'items');
      if (salidaData && salidaData.length > 0) {
        console.log('📋 Sample salida item:', JSON.stringify(salidaData[0], null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testStockService();