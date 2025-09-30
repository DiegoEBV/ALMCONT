const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

// Crear cliente con service role para operaciones administrativas
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const users = [
  {
    email: 'coordinador@obra.com',
    password: 'password123',
    user_metadata: {
      nombre: 'Coordinador',
      rol: 'COORDINACION'
    }
  },
  {
    email: 'logistica@obra.com',
    password: 'password123',
    user_metadata: {
      nombre: 'Logística',
      rol: 'LOGISTICA'
    }
  },
  {
    email: 'almacenero@obra.com',
    password: 'password123',
    user_metadata: {
      nombre: 'Almacenero',
      rol: 'ALMACENERO'
    }
  }
]

async function createAuthUsers() {
  console.log('Creando usuarios en Supabase Auth...')
  
  for (const userData of users) {
    try {
      console.log(`Creando usuario: ${userData.email}`)
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: userData.user_metadata,
        email_confirm: true // Confirmar email automáticamente
      })
      
      if (error) {
        console.error(`Error creando usuario ${userData.email}:`, error.message)
      } else {
        console.log(`✅ Usuario ${userData.email} creado exitosamente`)
        console.log(`   ID: ${data.user.id}`)
        
        // Actualizar la tabla usuarios con el ID de auth
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ id: data.user.id })
          .eq('email', userData.email)
        
        if (updateError) {
          console.error(`Error actualizando tabla usuarios para ${userData.email}:`, updateError.message)
        } else {
          console.log(`   ✅ Tabla usuarios actualizada para ${userData.email}`)
        }
      }
    } catch (error) {
      console.error(`Error inesperado con usuario ${userData.email}:`, error)
    }
  }
  
  console.log('\n🎉 Proceso completado!')
  console.log('Los usuarios pueden ahora hacer login con:')
  console.log('- coordinador@obra.com / password123')
  console.log('- logistica@obra.com / password123')
  console.log('- almacenero@obra.com / password123')
}

createAuthUsers().catch(console.error)