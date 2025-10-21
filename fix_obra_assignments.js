// Script para actualizar las asignaciones de obra en Supabase
// Convierte los obra_id locales (números) a UUIDs reales de Supabase

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gqhyrntdedrazmcjndhs.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function fixObraAssignments() {
  try {
    console.log('🔄 Iniciando corrección de asignaciones de obra...')
    
    // 1. Obtener todas las obras de Supabase
    const { data: obras, error: obrasError } = await supabase
      .from('obras')
      .select('id, codigo, nombre')
    
    if (obrasError) {
      console.error('❌ Error obteniendo obras:', obrasError)
      return
    }
    
    console.log('📋 Obras encontradas:', obras.length)
    obras.forEach(obra => {
      console.log(`   - ${obra.nombre} (${obra.codigo}) -> ${obra.id}`)
    })
    
    // 2. Obtener todos los usuarios con obra_id no UUID
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, email, obra_id')
      .not('obra_id', 'is', null)
    
    if (usuariosError) {
      console.error('❌ Error obteniendo usuarios:', usuariosError)
      return
    }
    
    console.log('👥 Usuarios con obra asignada:', usuarios.length)
    
    // 3. Actualizar usuarios que tienen obra_id local (número)
    for (const usuario of usuarios) {
      const { obra_id } = usuario
      
      // Verificar si es un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      
      if (!uuidRegex.test(obra_id)) {
        console.log(`🔄 Usuario ${usuario.email} tiene obra_id local: ${obra_id}`)
        
        // Buscar la obra correspondiente (asumiendo que obra_id "1" corresponde a la primera obra)
        let obraUUID = null
        
        if (obra_id === "1" && obras.length > 0) {
          // Asignar la primera obra disponible
          obraUUID = obras[0].id
          console.log(`   -> Asignando primera obra: ${obras[0].nombre} (${obraUUID})`)
        }
        
        if (obraUUID) {
          // Actualizar el usuario en Supabase
          const { error: updateError } = await supabase
            .from('usuarios')
            .update({ 
              obra_id: obraUUID,
              updated_at: new Date().toISOString()
            })
            .eq('id', usuario.id)
          
          if (updateError) {
            console.error(`❌ Error actualizando usuario ${usuario.email}:`, updateError)
          } else {
            console.log(`✅ Usuario ${usuario.email} actualizado con obra UUID: ${obraUUID}`)
          }
        }
      } else {
        console.log(`✅ Usuario ${usuario.email} ya tiene UUID válido: ${obra_id}`)
      }
    }
    
    console.log('🎉 Corrección de asignaciones completada')
    
  } catch (error) {
    console.error('❌ Error en el script:', error)
  }
}

// Ejecutar el script
fixObraAssignments()