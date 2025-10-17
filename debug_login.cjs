const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  console.log('🔍 Probando login con usuario produccion...')
  
  try {
    // Intentar login con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'produccion@obra.com',
      password: '123456'
    })
    
    if (error) {
      console.error('❌ Error en Supabase Auth:', error.message)
      console.error('   Código:', error.status)
      console.error('   Detalles:', error)
      
      // Verificar si el usuario existe en auth.users
      console.log('\n🔍 Verificando si el usuario existe en auth.users...')
      
      // Como no podemos acceder directamente a auth.users con anon key,
      // intentemos crear el usuario
      console.log('📝 Intentando crear usuario en Supabase Auth...')
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'produccion@obra.com',
        password: '123456'
      })
      
      if (signUpError) {
        console.error('❌ Error al crear usuario:', signUpError.message)
        if (signUpError.message.includes('already registered')) {
          console.log('✅ El usuario ya existe en Supabase Auth')
          console.log('⚠️  Problema: El usuario existe pero las credenciales no coinciden')
        }
      } else {
        console.log('✅ Usuario creado en Supabase Auth:', signUpData)
      }
      
    } else {
      console.log('✅ Login exitoso en Supabase Auth:')
      console.log('   User ID:', data.user?.id)
      console.log('   Email:', data.user?.email)
      console.log('   Token:', data.session?.access_token ? 'Presente' : 'Ausente')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

async function checkAuthUsers() {
  console.log('\n🔍 Verificando configuración de autenticación...')
  
  try {
    // Intentar obtener la sesión actual
    const { data: session, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Error obteniendo sesión:', error)
    } else {
      console.log('📋 Sesión actual:', session.session ? 'Activa' : 'No hay sesión')
    }
    
    // Verificar configuración del cliente
    console.log('\n📋 Configuración de Supabase:')
    console.log('   URL:', supabaseUrl)
    console.log('   Anon Key:', supabaseAnonKey.substring(0, 20) + '...')
    
  } catch (error) {
    console.error('❌ Error verificando configuración:', error)
  }
}

async function main() {
  await testLogin()
  await checkAuthUsers()
}

main()