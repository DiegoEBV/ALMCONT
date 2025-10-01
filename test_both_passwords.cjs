const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const passwords = ['password123']
const email = 'coordinador@obra.com'

async function testPasswords() {
  console.log(`🔐 Probando ambas contraseñas para ${email}...`)
  console.log('')
  
  for (const password of passwords) {
    try {
      console.log(`🔍 Probando contraseña: ${password}`)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.log(`❌ Error: ${error.message}`)
      } else if (data.user) {
        console.log(`✅ ¡Login exitoso con contraseña: ${password}!`)
        console.log(`👤 Usuario: ${data.user.email}`)
        console.log(`🆔 ID: ${data.user.id}`)
        
        // Cerrar sesión para la siguiente prueba
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.log(`❌ Error inesperado: ${error.message}`)
    }
    
    console.log('')
  }
}

testPasswords().catch(console.error)