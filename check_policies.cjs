const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gqhyrntdedrazmcjndhs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0'
);

async function fixUserAndTest() {
  try {
    console.log('=== Listando usuarios en Supabase Auth ===');
    
    // Listar usuarios existentes
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log('Error listando usuarios:', listError.message);
      return;
    }
    
    console.log('Usuarios encontrados:');
    users.users.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}`);
    });
    
    // Buscar el usuario logistica@obra.com
    const logisticaUser = users.users.find(user => user.email === 'logistica@obra.com');
    
    if (logisticaUser) {
      console.log('\n=== Actualizando contraseña del usuario ===');
      
      // Actualizar contraseña
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        logisticaUser.id,
        { password: 'password123' }
      );
      
      if (updateError) {
        console.log('Error actualizando contraseña:', updateError.message);
      } else {
        console.log('Contraseña actualizada exitosamente');
      }
    }
    
    // Crear cliente con anon key para probar autenticación
    const anonSupabase = createClient(
      'https://gqhyrntdedrazmcjndhs.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q'
    );
    
    console.log('\n=== Probando autenticación ===');
    
    // Intentar autenticación
    const { data: authData, error: authError } = await anonSupabase.auth.signInWithPassword({
      email: 'logistica@obra.com',
      password: 'password123'
    });
    
    if (authError) {
      console.log('Error de autenticación:', authError.message);
    } else {
      console.log('Usuario autenticado exitosamente!');
      console.log('Auth User ID:', authData.user?.id);
      
      // Probar acceso a datos después de autenticación
      const authResult = await anonSupabase
        .from('solicitudes_compra')
        .select('id, numero_sc, estado')
        .limit(5);
      
      console.log('\n=== Resultado de consulta autenticada ===');
      console.log('Datos:', JSON.stringify(authResult, null, 2));
      
      if (authResult.data && authResult.data.length > 0) {
        console.log('\n¡ÉXITO! La tabla muestra datos correctamente.');
      } else {
        console.log('\nLa tabla sigue vacía. Verificando mapeo de usuario...');
        
        // Verificar si el usuario Auth está mapeado en la tabla usuarios
        const userMapping = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', authData.user?.id);
        
        console.log('Mapeo de usuario:', JSON.stringify(userMapping, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserAndTest();