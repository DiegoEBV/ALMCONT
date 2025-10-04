const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gqhyrntdedrazmcjndhs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q'
);

async function debugStock() {
  console.log('=== DEBUGGING STOCK SERVICE ===\n');

  // 1. Check basic stock data
  console.log('1. Checking stock_obra_material data...');
  const { data: stockData, error: stockError } = await supabase
    .from('stock_obra_material')
    .select('*')
    .limit(5);
  
  if (stockError) {
    console.error('Stock error:', stockError);
  } else {
    console.log('Stock data count:', stockData?.length || 0);
    if (stockData && stockData.length > 0) {
      console.log('Sample stock data:', JSON.stringify(stockData[0], null, 2));
    }
  }

  // 2. Check stock with relations
  console.log('\n2. Checking stock with relations...');
  const { data: stockWithRelations, error: stockRelError } = await supabase
    .from('stock_obra_material')
    .select(`
      *,
      obras(*),
      materiales(*)
    `)
    .limit(2);
  
  if (stockRelError) {
    console.error('Stock relations error:', stockRelError);
  } else {
    console.log('Stock with relations count:', stockWithRelations?.length || 0);
    if (stockWithRelations && stockWithRelations.length > 0) {
      console.log('Sample stock with relations:');
      console.log('- Stock actual:', stockWithRelations[0].stock_actual);
      console.log('- Material:', stockWithRelations[0].materiales?.nombre);
      console.log('- Obra:', stockWithRelations[0].obras?.nombre);
    }
  }

  // 3. Check entradas and entrada_items
  console.log('\n3. Checking entradas table...');
  const { data: entradasData, error: entradasError } = await supabase
    .from('entradas')
    .select('*')
    .limit(5);
  
  if (entradasError) {
    console.error('Entradas error:', entradasError);
  } else {
    console.log('Entradas data count:', entradasData?.length || 0);
  }

  // 4. Check salidas and salida_items
  console.log('\n4. Checking salidas table...');
  const { data: salidasData, error: salidasError } = await supabase
    .from('salidas')
    .select('*')
    .limit(5);
  
  if (salidasError) {
    console.error('Salidas error:', salidasError);
  } else {
    console.log('Salidas data count:', salidasData?.length || 0);
  }

  console.log('\n=== DEBUG COMPLETE ===');
}

debugStock().catch(console.error);