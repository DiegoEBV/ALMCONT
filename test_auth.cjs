// Usar require para CommonJS
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configurar Supabase manualmente
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q'
const supabase = createClient(supabaseUrl, supabaseKey)

// Simular localDB
const localDB = {
  async get(table) {
    // Datos de prueba para usuarios
    if (table === 'usuarios') {
      return [
        {
          id: '1',
          email: 'logistica@obra.com',
          nombre: 'Usuario',
          apellido: 'Logística',
          rol: 'LOGISTICA',
          obra_id: '1',
          activo: true
        }
      ]
    }
    return []
  }
}

async function testAuthentication() {
  console.log('=== Prueba de Autenticación ===\n')
  
  try {
    // 1. Probar autenticación con Supabase
    console.log('1. Autenticando con Supabase...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'logistica@obra.com',
      password: 'password123'
    })
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError.message)
      return
    }
    
    console.log('✅ Autenticación exitosa')
    console.log('Usuario Supabase ID:', authData.user.id)
    console.log('Email:', authData.user.email)
    
    // 2. Buscar usuario en base de datos local
    console.log('\n2. Buscando usuario en base de datos local...')
    const usuarios = await localDB.get('usuarios')
    const localUser = usuarios.find(u => u.email === 'logistica@obra.com')
    
    if (!localUser) {
      console.error('❌ Usuario no encontrado en base de datos local')
      return
    }
    
    console.log('✅ Usuario local encontrado')
    console.log('ID local:', localUser.id)
    console.log('Nombre:', localUser.nombre, localUser.apellido)
    console.log('Rol:', localUser.rol)
    console.log('Obra ID:', localUser.obra_id)
    
    // 3. Probar acceso a datos con token de Supabase
    console.log('\n3. Probando acceso a solicitudes de compra...')
    
    // Establecer el token de autenticación
    supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    })
    
    const { data: solicitudes, error: solicitudesError } = await supabase
      .from('solicitudes_compra')
      .select('*')
      .limit(5)
    
    if (solicitudesError) {
      console.error('❌ Error obteniendo solicitudes:', solicitudesError.message)
    } else {
      console.log('✅ Solicitudes obtenidas:', solicitudes.length)
      if (solicitudes.length > 0) {
        console.log('Primera solicitud:', {
          id: solicitudes[0].id,
          numero_sc: solicitudes[0].numero_sc,
          obra_id: solicitudes[0].obra_id,
          estado: solicitudes[0].estado
        })
      }
    }
    
    // 4. Cerrar sesión
    console.log('\n4. Cerrando sesión...')
    await supabase.auth.signOut()
    console.log('✅ Sesión cerrada')
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

testAuthentication()