const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuarios en Supabase...');
    
    // Verificar usuarios en auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios de auth:', authError.message);
    } else {
      console.log('👥 Usuarios en auth.users:', authUsers.users.length);
      authUsers.users.forEach((user, index) => {
        console.log(`  ${index + 1}. Email: ${user.email}, ID: ${user.id}`);
      });
    }
    
    // Verificar tabla usuarios si existe
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*');
    
    if (usuariosError) {
      console.log('ℹ️ Tabla usuarios no existe o no es accesible:', usuariosError.message);
    } else {
      console.log('👤 Usuarios en tabla usuarios:', usuarios.length);
      usuarios.forEach((usuario, index) => {
        console.log(`  ${index + 1}. Email: ${usuario.email}, Rol: ${usuario.rol}, Obra: ${usuario.obra_id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

checkUsers();