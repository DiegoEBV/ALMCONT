// Script para probar permisos de coordinación
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (usar las variables de entorno reales)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCoordinationPermissions() {
  console.log('🧪 Iniciando pruebas de permisos de coordinación...');
  
  const userId = 'f7b32d35-848c-44db-a4cc-4df45ee48a69'; // ID del usuario coordinador en Supabase
  
  try {
    // 1. Probar función set_user_context
    console.log('\n1️⃣ Probando función set_user_context...');
    const { data: contextResult, error: contextError } = await supabase
      .rpc('set_user_context', { user_id: userId });
    
    if (contextError) {
      console.error('❌ Error al establecer contexto:', contextError);
      return;
    }
    console.log('✅ Contexto de usuario establecido correctamente');
    
    // 2. Probar función get_current_user_id
    console.log('\n2️⃣ Probando función get_current_user_id...');
    const { data: currentUserId, error: getUserError } = await supabase
      .rpc('get_current_user_id');
    
    if (getUserError) {
      console.error('❌ Error al obtener usuario actual:', getUserError);
      return;
    }
    console.log('✅ Usuario actual obtenido:', currentUserId);
    
    // 3. Probar función user_has_coordination_access (establecer contexto nuevamente)
    console.log('\n3️⃣ Probando función user_has_coordination_access...');
    await supabase.rpc('set_user_context', { user_id: userId });
    const { data: hasAccess, error: accessError } = await supabase
      .rpc('user_has_coordination_access');
    
    if (accessError) {
      console.error('❌ Error al verificar acceso de coordinación:', accessError);
      return;
    }
    console.log('✅ Acceso de coordinación:', hasAccess);
    
    // 4. Probar consulta a solicitudes_compra (establecer contexto nuevamente)
    console.log('\n4️⃣ Probando consulta a solicitudes_compra...');
    await supabase.rpc('set_user_context', { user_id: userId });
    const { data: solicitudes, error: solicitudesError } = await supabase
      .from('solicitudes_compra')
      .select('*')
      .limit(5);
    
    if (solicitudesError) {
      console.error('❌ Error al consultar solicitudes_compra:', solicitudesError);
      return;
    }
    console.log('✅ Solicitudes obtenidas:', solicitudes?.length || 0);
    
    // 5. Probar inserción de solicitud de compra (establecer contexto nuevamente)
    console.log('\n5️⃣ Probando inserción de solicitud de compra...');
    await supabase.rpc('set_user_context', { user_id: userId });
    // Primero obtener una obra válida
    const { data: obras, error: obrasError } = await supabase
      .from('obras')
      .select('id')
      .limit(1);
    
    if (obrasError || !obras || obras.length === 0) {
      console.error('❌ No se encontraron obras válidas:', obrasError);
      return;
    }
    
    const testSolicitud = {
      numero_sc: 'TEST-' + Date.now(),
      obra_id: obras[0].id,
      fecha_solicitud: new Date().toISOString(),
      fecha_necesidad: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días después
      estado: 'PENDIENTE',
      observaciones: 'Prueba de permisos',
      created_by: userId
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('solicitudes_compra')
      .insert([testSolicitud])
      .select();
    
    if (insertError) {
      console.error('❌ Error al insertar solicitud:', insertError);
      return;
    }
    console.log('✅ Solicitud insertada correctamente:', insertResult?.[0]?.id);
    
    // 6. Limpiar - eliminar la solicitud de prueba
    if (insertResult?.[0]?.id) {
      console.log('\n6️⃣ Limpiando solicitud de prueba...');
      const { error: deleteError } = await supabase
        .from('solicitudes_compra')
        .delete()
        .eq('id', insertResult[0].id);
      
      if (deleteError) {
        console.error('⚠️ Error al eliminar solicitud de prueba:', deleteError);
      } else {
        console.log('✅ Solicitud de prueba eliminada');
      }
    }
    
    console.log('\n🎉 ¡Todas las pruebas de permisos completadas exitosamente!');
    
  } catch (error) {
    console.error('💥 Error general en las pruebas:', error);
  }
}

// Ejecutar las pruebas
testCoordinationPermissions().catch(console.error);