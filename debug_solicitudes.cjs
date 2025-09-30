const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simular datos de usuario local
const localUser = {
  id: 1,
  email: 'logistica@obra.com',
  nombre: 'Usuario Logística',
  rol: 'LOGISTICA',
  obra_id: 1
};

const debugSolicitudes = async () => {
  try {
    console.log('=== Debug Solicitudes de Compra ===\n');

    // 1. Autenticar con Supabase
    console.log('1. Autenticando con Supabase...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'logistica@obra.com',
      password: 'password123'
    });

    if (authError) {
      console.error('❌ Error de autenticación:', authError.message);
      return;
    }

    console.log('✅ Autenticación exitosa');
    console.log('Usuario Supabase ID:', authData.user.id);

    // 2. Establecer contexto de usuario
    console.log('\n2. Estableciendo contexto de usuario...');
    const { error: contextError } = await supabase.rpc('set_user_context', {
      user_id: authData.user.id,
      user_role: 'LOGISTICA'
    });

    if (contextError) {
      console.warn('⚠️ Error al establecer contexto:', contextError.message);
    } else {
      console.log('✅ Contexto establecido');
    }

    // 3. Probar acceso directo a la tabla
    console.log('\n3. Probando acceso directo a solicitudes_compra...');
    const { data: solicitudes, error: solicitudesError } = await supabase
      .from('solicitudes_compra')
      .select('*')
      .limit(5);

    if (solicitudesError) {
      console.error('❌ Error al obtener solicitudes:', solicitudesError.message);
      console.error('Detalles:', solicitudesError);
    } else {
      console.log('✅ Solicitudes obtenidas:', solicitudes.length);
      if (solicitudes.length > 0) {
        console.log('Primera solicitud:', {
          id: solicitudes[0].id,
          numero_sc: solicitudes[0].numero_sc,
          estado: solicitudes[0].estado,
          obra_id: solicitudes[0].obra_id
        });
      }
    }

    // 4. Probar con JOIN a obras
    console.log('\n4. Probando con JOIN a obras...');
    const { data: solicitudesConObra, error: joinError } = await supabase
      .from('solicitudes_compra')
      .select(`
        *,
        obra:obras(*)
      `)
      .limit(3);

    if (joinError) {
      console.error('❌ Error con JOIN:', joinError.message);
      console.error('Detalles:', joinError);
    } else {
      console.log('✅ Solicitudes con obra obtenidas:', solicitudesConObra.length);
      if (solicitudesConObra.length > 0) {
        console.log('Primera solicitud con obra:', {
          numero_sc: solicitudesConObra[0].numero_sc,
          obra_nombre: solicitudesConObra[0].obra?.nombre || 'Sin obra'
        });
      }
    }

    // 5. Verificar permisos de la tabla
    console.log('\n5. Verificando permisos...');
    const { data: permisos, error: permisosError } = await supabase
      .from('information_schema.role_table_grants')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'solicitudes_compra')
      .in('grantee', ['anon', 'authenticated']);

    if (permisosError) {
      console.error('❌ Error al verificar permisos:', permisosError.message);
    } else {
      console.log('✅ Permisos encontrados:', permisos.length);
      permisos.forEach(permiso => {
        console.log(`- ${permiso.grantee}: ${permiso.privilege_type}`);
      });
    }

    // 6. Cerrar sesión
    console.log('\n6. Cerrando sesión...');
    await supabase.auth.signOut();
    console.log('✅ Sesión cerrada');

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error('Stack:', error.stack);
  }
};

debugSolicitudes();