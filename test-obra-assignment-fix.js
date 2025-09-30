// Script para probar la corrección de asignación de obras
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://qjxvwlqyqjxvwlqyqjxv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqeHZ3bHF5cWp4dndscXlxanh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDEyNzUwNywiZXhwIjoyMDQ5NzAzNTA3fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testObraAssignmentFix() {
  console.log('=== PRUEBA: Corrección de Asignación de Obras ===\n');
  
  try {
    // 1. Verificar estado actual de usuarios
    console.log('1. Estado actual de usuarios en Supabase:');
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, email, nombre, apellido, obra_id')
      .order('email');
    
    if (usuariosError) {
      console.error('Error obteniendo usuarios:', usuariosError);
      return;
    }
    
    usuarios.forEach(user => {
      console.log(`  - ${user.email}: ${user.obra_id ? 'CON OBRA' : 'SIN OBRA'}`);
    });
    
    // 2. Verificar obras disponibles
    console.log('\n2. Obras disponibles en Supabase:');
    const { data: obras, error: obrasError } = await supabase
      .from('obras')
      .select('id, codigo, nombre, estado')
      .eq('estado', 'ACTIVA');
    
    if (obrasError) {
      console.error('Error obteniendo obras:', obrasError);
      return;
    }
    
    obras.forEach(obra => {
      console.log(`  - ${obra.codigo}: ${obra.nombre}`);
    });
    
    // 3. Probar asignación manual (simulando la corrección)
    if (usuarios.length > 0 && obras.length > 0) {
      const usuarioTest = usuarios.find(u => !u.obra_id) || usuarios[0];
      const obraTest = obras[0];
      
      console.log(`\n3. Probando asignación: ${usuarioTest.email} -> ${obraTest.codigo}`);
      
      const { data: updateResult, error: updateError } = await supabase
        .from('usuarios')
        .update({ 
          obra_id: obraTest.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', usuarioTest.id)
        .select();
      
      if (updateError) {
        console.error('❌ Error en asignación:', updateError);
      } else {
        console.log('✅ Asignación exitosa:', updateResult[0]);
        
        // 4. Verificar la asignación
        console.log('\n4. Verificando asignación:');
        const { data: verification, error: verifyError } = await supabase
          .from('usuarios')
          .select(`
            id, email, nombre, obra_id,
            obras:obra_id(codigo, nombre)
          `)
          .eq('id', usuarioTest.id)
          .single();
        
        if (verifyError) {
          console.error('❌ Error verificando:', verifyError);
        } else {
          console.log('✅ Verificación exitosa:');
          console.log(`   Usuario: ${verification.email}`);
          console.log(`   Obra: ${verification.obras?.codigo} - ${verification.obras?.nombre}`);
        }
      }
    }
    
    console.log('\n=== Prueba completada ===');
    
  } catch (error) {
    console.error('Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testObraAssignmentFix();