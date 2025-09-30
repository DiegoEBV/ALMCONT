import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncProductionUser() {
  try {
    console.log('Sincronizando usuario de producción...');
    
    // Obtener el usuario de producción desde Supabase
    const { data: prodUser, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', 'produccion@obra.com')
      .single();
    
    if (error) {
      console.error('Error al obtener usuario de producción:', error);
      return;
    }
    
    if (!prodUser) {
      console.log('Usuario de producción no encontrado en Supabase');
      return;
    }
    
    console.log('Usuario de producción encontrado:', prodUser);
    
    // Leer el archivo database.json
    const dbPath = path.join(process.cwd(), 'src', 'data', 'database.json');
    const dbContent = fs.readFileSync(dbPath, 'utf8');
    const database = JSON.parse(dbContent);
    
    // Verificar si el usuario ya existe en la base de datos local
    const existingUser = database.usuarios.find(u => u.email === 'produccion@obra.com');
    
    if (existingUser) {
      console.log('Usuario de producción ya existe en database.json');
      return;
    }
    
    // Agregar el usuario de producción con password
    const newUser = {
      id: prodUser.id,
      email: prodUser.email,
      password: '123456', // Password por defecto
      nombre: prodUser.nombre,
      apellido: prodUser.apellido,
      rol: prodUser.rol,
      obra_id: prodUser.obra_id,
      activo: prodUser.activo,
      created_at: prodUser.created_at,
      updated_at: prodUser.updated_at
    };
    
    database.usuarios.push(newUser);
    
    // Escribir el archivo actualizado
    fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
    
    console.log('✅ Usuario de producción agregado exitosamente a database.json');
    console.log('Credenciales: produccion@obra.com / 123456');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

syncProductionUser();