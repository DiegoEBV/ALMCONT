const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q';

const testWebLogin = async () => {
  console.log('=== Test Login Web Application ===\n');
  
  try {
    // 1. Verificar que Supabase funciona
    console.log('1. Verificando conexión con Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'logistica@obra.com',
      password: 'password123'
    });
    
    if (authError) {
      console.error('❌ Error de autenticación Supabase:', authError.message);
      return;
    }
    
    console.log('✅ Autenticación Supabase exitosa');
    console.log('Usuario ID:', authData.user.id);
    
    // 2. Establecer contexto y obtener datos
    console.log('\n2. Estableciendo contexto y obteniendo solicitudes...');
    
    await supabase.rpc('set_user_context', {
      user_id: authData.user.id,
      user_role: 'LOGISTICA'
    });
    
    const { data: solicitudes, error: solicitudesError } = await supabase
      .from('solicitudes_compra')
      .select(`
        *,
        obra:obras(*)
      `)
      .limit(5);
    
    if (solicitudesError) {
      console.error('❌ Error obteniendo solicitudes:', solicitudesError.message);
    } else {
      console.log('✅ Solicitudes obtenidas:', solicitudes.length);
      if (solicitudes.length > 0) {
        console.log('Primera solicitud:', {
          numero_sc: solicitudes[0].numero_sc,
          estado: solicitudes[0].estado,
          obra: solicitudes[0].obra?.nombre || 'Sin obra'
        });
      }
    }
    
    // 3. Cerrar sesión
    await supabase.auth.signOut();
    console.log('\n✅ Test completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
  }
};

testWebLogin();