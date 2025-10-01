const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función para probar autenticación
async function testAuth() {
  console.log('=== PRUEBA DE AUTENTICACIÓN ===');
  
  const testUsers = [
    { email: 'coordinador@obra.com', password: 'password123' },
    { email: 'logistica@obra.com', password: 'password123' }
  ];

  for (const user of testUsers) {
    console.log(`\n--- Probando usuario: ${user.email} ---`);
    
    try {
      // Intentar autenticación con Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });

      if (error) {
        console.log(`❌ Error en Supabase: ${error.message}`);
        console.log(`   Código de error: ${error.status}`);
      } else {
        console.log(`✅ Autenticación exitosa en Supabase`);
        console.log(`   Usuario ID: ${data.user?.id}`);
        console.log(`   Email: ${data.user?.email}`);
        
        // Cerrar sesión para la siguiente prueba
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.log(`❌ Error inesperado: ${err.message}`);
    }
  }

  // Probar carga de datos locales
  console.log('\n=== PRUEBA DE DATOS LOCALES ===');
  try {
    const dbPath = path.join(__dirname, 'src', 'data', 'database.json');
    if (fs.existsSync(dbPath)) {
      const localData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      console.log(`✅ Archivo database.json encontrado`);
      console.log(`   Usuarios locales: ${localData.usuarios?.length || 0}`);
      
      // Buscar usuarios específicos
      const coordinador = localData.usuarios?.find(u => u.email === 'coordinador@obra.com');
      const logistica = localData.usuarios?.find(u => u.email === 'logistica@obra.com');
      
      console.log(`   Coordinador encontrado: ${coordinador ? '✅' : '❌'}`);
      console.log(`   Logística encontrado: ${logistica ? '✅' : '❌'}`);
      
      if (coordinador) {
        console.log(`   Coordinador - ID: ${coordinador.id}, Rol: ${coordinador.rol}`);
      }
      if (logistica) {
        console.log(`   Logística - ID: ${logistica.id}, Rol: ${logistica.rol}`);
      }
    } else {
      console.log(`❌ Archivo database.json no encontrado en: ${dbPath}`);
    }
  } catch (err) {
    console.log(`❌ Error al leer datos locales: ${err.message}`);
  }
}

// Ejecutar pruebas
testAuth().catch(console.error);