const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gqhyrntdedrazmcjndhs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q'
);

async function createTestMovements() {
  console.log('=== CREATING TEST MOVEMENT DATA ===\n');

  // First, get existing stock data to use for test movements
  const { data: stockData } = await supabase
    .from('stock_obra_material')
    .select('*')
    .limit(3);

  if (!stockData || stockData.length === 0) {
    console.log('No stock data found to create movements');
    return;
  }

  // Get existing entradas
  const { data: entradasData } = await supabase
    .from('entradas')
    .select('*')
    .limit(3);

  console.log('Found', entradasData?.length || 0, 'entradas');

  // Create entrada_items for existing entradas
  if (entradasData && entradasData.length > 0) {
    for (let i = 0; i < Math.min(entradasData.length, stockData.length); i++) {
      const entrada = entradasData[i];
      const stock = stockData[i];
      
      const entradaItem = {
        entrada_id: entrada.id,
        material_id: stock.material_id,
        cantidad_esperada: 50,
        cantidad_recibida: 45,
        cantidad_aceptada: 45,
        cantidad_rechazada: 0,
        precio_unitario: stock.costo_promedio || 50,
        estado: 'VERIFICADO'
      };

      console.log('Creating entrada_item for entrada:', entrada.id);
      const { error: entradaError } = await supabase
        .from('entrada_items')
        .insert(entradaItem);

      if (entradaError) {
        console.error('Error creating entrada_item:', entradaError);
      } else {
        console.log('✓ Created entrada_item successfully');
      }
    }
  }

  // Get existing salidas
  const { data: salidasData } = await supabase
    .from('salidas')
    .select('*')
    .limit(3);

  console.log('Found', salidasData?.length || 0, 'salidas');

  // Create salida_items for existing salidas
  if (salidasData && salidasData.length > 0) {
    for (let i = 0; i < Math.min(salidasData.length, stockData.length); i++) {
      const salida = salidasData[i];
      const stock = stockData[i];
      
      const salidaItem = {
        salida_id: salida.id,
        material_id: stock.material_id,
        cantidad_solicitada: 10,
        cantidad_autorizada: 8,
        cantidad_entregada: 8,
        precio_unitario: stock.costo_promedio || 50
      };

      console.log('Creating salida_item for salida:', salida.id);
      const { error: salidaError } = await supabase
        .from('salida_items')
        .insert(salidaItem);

      if (salidaError) {
        console.error('Error creating salida_item:', salidaError);
      } else {
        console.log('✓ Created salida_item successfully');
      }
    }
  }

  // Verify the created data
  console.log('\n=== VERIFICATION ===');
  
  const { data: newEntradaItems } = await supabase
    .from('entrada_items')
    .select('*');
  
  const { data: newSalidaItems } = await supabase
    .from('salida_items')
    .select('*');

  console.log('Total entrada_items created:', newEntradaItems?.length || 0);
  console.log('Total salida_items created:', newSalidaItems?.length || 0);

  console.log('\n=== TEST DATA CREATION COMPLETE ===');
}

createTestMovements().catch(console.error);