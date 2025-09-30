const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPasswords() {
  const email = 'coordinador@obra.com';
  const passwords = [
    '123456',
    'password123',
    'coordinador123',
    'obra123',
    'admin123',
    'test123',
    'password',
    '12345678'
  ];
  
  console.log(`🔐 Probando contraseñas para ${email}...`);
  
  for (const password of passwords) {
    try {
      console.log(`\n🔍 Probando contraseña: ${password}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        console.log(`✅ ¡Login exitoso con contraseña: ${password}!`);
        console.log(`👤 Usuario: ${data.user.email}`);
        console.log(`🆔 ID: ${data.user.id}`);
        
        // Cerrar sesión para la siguiente prueba
        await supabase.auth.signOut();
        return password;
      }
    } catch (err) {
      console.log(`❌ Error de conexión: ${err.message}`);
    }
    
    // Esperar un poco entre intentos
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n❌ Ninguna contraseña funcionó');
  return null;
}

testPasswords();