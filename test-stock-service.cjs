const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testStockService() {
  console.log('🔍 Testing stock service methods...');
  
  try {
    // Test getStockWithFilters
    console.log('\n📊 Testing getStockWithFilters...');
    const { data: stockData, error: stockError } = await supabase
      .from('stock_obra_material')
      .select(`
        *,
        obras:obra_id(nombre),
        materiales:material_id(nombre, categoria, unidad_medida)
      `);
    
    if (stockError) {
      console.error('❌ Error in stock query:', stockError);
    } else {
      console.log('✅ Stock data retrieved:', stockData?.length || 0, 'items');
      if (stockData && stockData.length > 0) {
        console.log('📋 Sample stock item:', JSON.stringify(stockData[0], null, 2));
      }
    }
    
    // Test kardex movements query
    console.log('\n📊 Testing kardex movements query...');
    
    // Test entrada_items with entradas
    const { data: entradaItems, error: entradaError } = await supabase
      .from('entrada_items')
      .select(`
        *,
        entradas:entrada_id(fecha_entrada, numero_entrada, obra_id, obras:obra_id(nombre)),
        materiales:material_id(nombre, unidad_medida)
      `);
    
    if (entradaError) {
      console.error('❌ Error in entrada_items query:', entradaError);
    } else {
      console.log('✅ Entrada items retrieved:', entradaItems?.length || 0, 'items');
      if (entradaItems && entradaItems.length > 0) {
        console.log('📋 Sample entrada item:', JSON.stringify(entradaItems[0], null, 2));
      }
    }
    
    // Test salida_items with salidas
    const { data: salidaItems, error: salidaError } = await supabase
      .from('salida_items')
      .select(`
        *,
        salidas:salida_id(fecha_salida, numero_salida, obra_id, obras:obra_id(nombre)),
        materiales:material_id(nombre, unidad_medida)
      `);
    
    if (salidaError) {
      console.error('❌ Error in salida_items query:', salidaError);
    } else {
      console.log('✅ Salida items retrieved:', salidaItems?.length || 0, 'items');
      if (salidaItems && salidaItems.length > 0) {
        console.log('📋 Sample salida item:', JSON.stringify(salidaItems[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing stock service:', error);
  }
}

testStockService();