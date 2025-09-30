import { supabase } from './src/lib/supabase.ts';

async function testObras() {
  console.log('🔍 Testing obras table...');
  
  try {
    // Test 1: Check if we can read from obras table
    console.log('\n📋 Test 1: Fetching all obras...');
    const { data: obras, error: obrasError } = await supabase
      .from('obras')
      .select('*');
    
    if (obrasError) {
      console.error('❌ Error fetching obras:', obrasError);
    } else {
      console.log('✅ Obras fetched successfully:', obras?.length || 0, 'records');
      if (obras && obras.length > 0) {
        console.log('📄 First obra:', obras[0]);
      }
    }
    
    // Test 2: Check permissions
    console.log('\n🔐 Test 2: Checking permissions...');
    const { data: permissions, error: permError } = await supabase
      .rpc('check_table_permissions', { table_name: 'obras' })
      .single();
    
    if (permError) {
      console.log('⚠️ Could not check permissions (function may not exist):', permError.message);
    } else {
      console.log('✅ Permissions:', permissions);
    }
    
    // Test 3: Try to insert a test obra
    console.log('\n➕ Test 3: Trying to insert test obra...');
    const testObra = {
      codigo: 'TEST-001',
      nombre: 'Obra de Prueba',
      descripcion: 'Obra creada para pruebas',
      estado: 'ACTIVA'
    };
    
    const { data: insertedObra, error: insertError } = await supabase
      .from('obras')
      .insert(testObra)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting test obra:', insertError);
    } else {
      console.log('✅ Test obra inserted successfully:', insertedObra);
      
      // Clean up - delete the test obra
      const { error: deleteError } = await supabase
        .from('obras')
        .delete()
        .eq('id', insertedObra.id);
      
      if (deleteError) {
        console.error('⚠️ Could not delete test obra:', deleteError);
      } else {
        console.log('🗑️ Test obra deleted successfully');
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testObras();