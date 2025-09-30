const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateSupabasePasswords() {
  console.log('🔄 Actualizando contraseñas en Supabase...\n');

  try {
    // 1. Verificar usuarios actuales
    console.log('1. Verificando usuarios actuales en Supabase...');
    const { data: currentUsers, error: fetchError } = await supabase
      .from('usuarios')
      .select('id, email, password');

    if (fetchError) {
      console.error('❌ Error obteniendo usuarios:', fetchError);
      return;
    }

    console.log(`✅ Encontrados ${currentUsers.length} usuarios:`);
    currentUsers.forEach(user => {
      console.log(`   - ${user.email}: password="${user.password}"`);
    });

    // 2. Actualizar contraseñas a 'password123'
    console.log('\n2. Actualizando contraseñas a "password123"...');
    
    const { data: updatedUsers, error: updateError } = await supabase
      .from('usuarios')
      .update({ password: 'password123' })
      .neq('password', 'password123') // Solo actualizar los que no tengan ya password123
      .select();

    if (updateError) {
      console.error('❌ Error actualizando contraseñas:', updateError);
      return;
    }

    console.log(`✅ ${updatedUsers?.length || 0} usuarios actualizados`);

    // 3. Verificar actualización
    console.log('\n3. Verificando actualización...');
    const { data: verifyUsers, error: verifyError } = await supabase
      .from('usuarios')
      .select('id, email, password');

    if (verifyError) {
      console.error('❌ Error verificando usuarios:', verifyError);
      return;
    }

    console.log('✅ Estado final de usuarios:');
    verifyUsers.forEach(user => {
      const status = user.password === 'password123' ? '✅' : '❌';
      console.log(`   ${status} ${user.email}: password="${user.password}"`);
    });

    // 4. Verificar coordinador específicamente
    const coordinador = verifyUsers.find(u => u.email === 'coordinador@obra.com');
    if (coordinador) {
      console.log('\n🎯 COORDINADOR VERIFICADO:');
      console.log(`   Email: ${coordinador.email}`);
      console.log(`   Password: ${coordinador.password}`);
      console.log(`   Status: ${coordinador.password === 'password123' ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
    } else {
      console.log('\n❌ Coordinador no encontrado en Supabase');
    }

    console.log('\n🎉 ¡Actualización de contraseñas completada!');
    console.log('👉 Ahora puedes hacer login con: coordinador@obra.com / password123');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

updateSupabasePasswords();