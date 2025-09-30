import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  try {
    console.log('Consultando usuarios...');
    
    // Obtener todos los usuarios
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('*');
    
    if (error) {
      console.error('Error al consultar usuarios:', error);
      return;
    }
    
    console.log('Usuarios encontrados:', users.length);
    
    // Buscar específicamente el usuario de producción
    const prodUser = users.find(user => user.email === 'produccion@obra.com');
    
    if (prodUser) {
      console.log('Usuario de producción encontrado:');
      console.log(JSON.stringify(prodUser, null, 2));
    } else {
      console.log('Usuario de producción NO encontrado');
    }
    
    // Mostrar todos los usuarios para debug
    console.log('\nTodos los usuarios:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.rol}) - Activo: ${user.activo}`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  }
}

checkUsers();