const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProductionUser() {
  console.log('🔍 Verificando usuario produccion@obra.com...\n');

  try {
    // 1. Buscar el usuario en la tabla usuarios
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', 'produccion@obra.com');

    if (usuariosError) {
      console.error('❌ Error al buscar usuario en tabla usuarios:', usuariosError);
      return;
    }

    console.log('📊 Resultado de búsqueda en tabla usuarios:');
    console.log('Usuarios encontrados:', usuarios?.length || 0);
    
    if (usuarios && usuarios.length > 0) {
      const usuario = usuarios[0];
      console.log('\n✅ Usuario encontrado en tabla usuarios:');
      console.log('- ID:', usuario.id);
      console.log('- Email:', usuario.email);
      console.log('- Nombre:', usuario.nombre);
      console.log('- Apellido:', usuario.apellido);
      console.log('- Rol:', usuario.rol);
      console.log('- Activo:', usuario.activo);
      console.log('- Obra ID:', usuario.obra_id);
      console.log('- Password (hash):', usuario.password ? 'Configurado' : 'NO CONFIGURADO');
      console.log('- Created at:', usuario.created_at);
      console.log('- Updated at:', usuario.updated_at);

      // Verificar si la contraseña está hasheada correctamente
      if (usuario.password) {
        try {
          const isValidHash = await bcrypt.compare('123456', usuario.password);
          console.log('- Password válido para "123456":', isValidHash ? '✅ SÍ' : '❌ NO');
          
          if (!isValidHash) {
            console.log('\n🔧 La contraseña no coincide. Actualizando...');
            const hashedPassword = await bcrypt.hash('123456', 10);
            
            const { error: updateError } = await supabase
              .from('usuarios')
              .update({ 
                password: hashedPassword,
                updated_at: new Date().toISOString()
              })
              .eq('id', usuario.id);

            if (updateError) {
              console.error('❌ Error al actualizar contraseña:', updateError);
            } else {
              console.log('✅ Contraseña actualizada correctamente');
            }
          }
        } catch (hashError) {
          console.error('❌ Error al verificar hash de contraseña:', hashError);
        }
      } else {
        console.log('\n🔧 Usuario sin contraseña. Configurando...');
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ 
            password: hashedPassword,
            updated_at: new Date().toISOString()
          })
          .eq('id', usuario.id);

        if (updateError) {
          console.error('❌ Error al configurar contraseña:', updateError);
        } else {
          console.log('✅ Contraseña configurada correctamente');
        }
      }

      // Verificar si está activo
      if (!usuario.activo) {
        console.log('\n🔧 Usuario inactivo. Activando...');
        const { error: activateError } = await supabase
          .from('usuarios')
          .update({ 
            activo: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', usuario.id);

        if (activateError) {
          console.error('❌ Error al activar usuario:', activateError);
        } else {
          console.log('✅ Usuario activado correctamente');
        }
      }

    } else {
      console.log('\n❌ Usuario NO encontrado en tabla usuarios');
      console.log('🔧 Creando usuario produccion@obra.com...');
      
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const { data: newUser, error: createError } = await supabase
        .from('usuarios')
        .insert([{
          email: 'produccion@obra.com',
          nombre: 'Usuario',
          apellido: 'Producción',
          rol: 'PRODUCCION',
          activo: true,
          password: hashedPassword
        }])
        .select();

      if (createError) {
        console.error('❌ Error al crear usuario:', createError);
      } else {
        console.log('✅ Usuario creado correctamente:', newUser[0]);
      }
    }

    // 2. Verificar en Supabase Auth
    console.log('\n🔍 Verificando en Supabase Auth...');
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error al listar usuarios de Auth:', authError);
    } else {
      const authUser = authUsers.users.find(u => u.email === 'produccion@obra.com');
      
      if (authUser) {
        console.log('✅ Usuario encontrado en Supabase Auth:');
        console.log('- ID:', authUser.id);
        console.log('- Email:', authUser.email);
        console.log('- Confirmado:', authUser.email_confirmed_at ? 'SÍ' : 'NO');
        console.log('- Último login:', authUser.last_sign_in_at || 'Nunca');
      } else {
        console.log('❌ Usuario NO encontrado en Supabase Auth');
        console.log('🔧 Creando usuario en Supabase Auth...');
        
        const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
          email: 'produccion@obra.com',
          password: '123456',
          email_confirm: true
        });

        if (createAuthError) {
          console.error('❌ Error al crear usuario en Auth:', createAuthError);
        } else {
          console.log('✅ Usuario creado en Supabase Auth:', newAuthUser.user);
        }
      }
    }

    // 3. Listar todos los usuarios para debug
    console.log('\n📋 Todos los usuarios en la tabla usuarios:');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('usuarios')
      .select('email, nombre, apellido, rol, activo, password')
      .order('email');

    if (allUsersError) {
      console.error('❌ Error al listar usuarios:', allUsersError);
    } else {
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} - ${user.nombre} ${user.apellido} - Rol: ${user.rol} - Activo: ${user.activo} - Password: ${user.password ? 'Configurado' : 'NO'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkProductionUser();