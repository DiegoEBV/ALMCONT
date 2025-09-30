const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  console.log('🔄 Probando conexión con Supabase...\n');

  try {
    // 1. Probar conexión básica
    console.log('1. Probando conexión básica...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('usuarios')
      .select('count')
      .limit(1);

    if (healthError) {
      console.error('❌ Error de conexión:', healthError);
      return;
    }
    console.log('✅ Conexión establecida correctamente');

    // 2. Probar autenticación con credenciales correctas
    console.log('\n2. Probando autenticación con coordinador@obra.com...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'coordinador@obra.com',
      password: 'password123'
    });

    if (authError) {
      console.error('❌ Error de autenticación:', authError);
      console.log('   Mensaje:', authError.message);
      console.log('   Código:', authError.status);
      
      // Verificar si el usuario existe en auth.users
      console.log('\n3. Verificando si el usuario existe en auth.users...');
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) {
        console.error('❌ Error obteniendo usuarios de auth:', usersError);
      } else {
        const authUser = users.users.find(u => u.email === 'coordinador@obra.com');
        if (authUser) {
          console.log('✅ Usuario encontrado en auth.users:', authUser.email);
          console.log('   ID:', authUser.id);
          console.log('   Confirmado:', authUser.email_confirmed_at ? 'Sí' : 'No');
        } else {
          console.log('❌ Usuario NO encontrado en auth.users');
        }
      }
    } else {
      console.log('✅ Autenticación exitosa!');
      console.log('   Usuario ID:', authData.user?.id);
      console.log('   Email:', authData.user?.email);
      console.log('   Token válido:', authData.session?.access_token ? 'Sí' : 'No');
      
      // 4. Probar acceso a tabla usuarios
      console.log('\n4. Probando acceso a tabla usuarios...');
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', 'coordinador@obra.com');

      if (usuariosError) {
        console.error('❌ Error accediendo a tabla usuarios:', usuariosError);
      } else {
        console.log('✅ Acceso a tabla usuarios exitoso');
        console.log('   Usuarios encontrados:', usuarios.length);
        if (usuarios.length > 0) {
          console.log('   Datos del usuario:', {
            id: usuarios[0].id,
            email: usuarios[0].email,
            nombre: usuarios[0].nombre,
            rol: usuarios[0].rol,
            password: usuarios[0].password
          });
        }
      }

      // Cerrar sesión
      await supabase.auth.signOut();
    }

    // 5. Verificar tabla usuarios sin autenticación
    console.log('\n5. Verificando tabla usuarios (sin autenticación)...');
    const { data: publicUsers, error: publicError } = await supabase
      .from('usuarios')
      .select('email, rol')
      .limit(5);

    if (publicError) {
      console.error('❌ Error accediendo a tabla usuarios (público):', publicError);
      console.log('   Esto puede ser normal si RLS está habilitado');
    } else {
      console.log('✅ Acceso público a tabla usuarios:');
      publicUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.rol})`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testSupabaseConnection();