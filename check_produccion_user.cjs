const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkProduccionUser() {
  console.log('🔍 Verificando usuario produccion...')
  
  try {
    // Buscar usuario produccion
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', 'produccion@obra.com')
    
    if (error) {
      console.error('❌ Error al buscar usuario:', error)
      return
    }
    
    if (!usuarios || usuarios.length === 0) {
      console.log('❌ Usuario produccion@obra.com NO EXISTE')
      console.log('📝 Creando usuario produccion...')
      await createProduccionUser()
    } else {
      const user = usuarios[0]
      console.log('✅ Usuario produccion encontrado:')
      console.log('   - ID:', user.id)
      console.log('   - Email:', user.email)
      console.log('   - Nombre:', user.nombre)
      console.log('   - Apellido:', user.apellido)
      console.log('   - Rol:', user.rol)
      console.log('   - Activo:', user.activo)
      console.log('   - Obra ID:', user.obra_id)
      console.log('   - Password:', user.password ? 'Configurada' : 'NO CONFIGURADA')
      
      if (!user.activo) {
        console.log('⚠️  Usuario está INACTIVO')
      }
      
      if (!user.password) {
        console.log('⚠️  Usuario NO TIENE CONTRASEÑA configurada')
        console.log('📝 Actualizando contraseña...')
        await updateUserPassword(user.id)
      }
    }
    
    // Verificar todos los usuarios para debug
    console.log('\n📋 Todos los usuarios en la base de datos:')
    const { data: allUsers, error: allError } = await supabase
      .from('usuarios')
      .select('email, nombre, apellido, rol, activo, password')
    
    if (allError) {
      console.error('❌ Error al obtener todos los usuarios:', allError)
    } else {
      allUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.rol}) - Activo: ${user.activo} - Password: ${user.password ? 'Sí' : 'No'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

async function createProduccionUser() {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .insert([
        {
          email: 'produccion@obra.com',
          nombre: 'Usuario',
          apellido: 'Produccion',
          rol: 'PRODUCCION',
          activo: true,
          password: '123456'
        }
      ])
      .select()
    
    if (error) {
      console.error('❌ Error al crear usuario:', error)
    } else {
      console.log('✅ Usuario produccion creado exitosamente:', data)
    }
  } catch (error) {
    console.error('❌ Error al crear usuario:', error)
  }
}

async function updateUserPassword(userId) {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .update({ password: '123456' })
      .eq('id', userId)
      .select()
    
    if (error) {
      console.error('❌ Error al actualizar contraseña:', error)
    } else {
      console.log('✅ Contraseña actualizada exitosamente')
    }
  } catch (error) {
    console.error('❌ Error al actualizar contraseña:', error)
  }
}

checkProduccionUser()