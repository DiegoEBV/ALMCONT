import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

// Crear clientes de Supabase
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function testObraAssignment() {
  console.log('🔍 Probando asignación de obras a usuarios...');
  
  try {
    // 1. Verificar que existen obras en Supabase
    console.log('\n1. Verificando obras disponibles:');
    const { data: obras, error: obrasError } = await supabaseAnon
      .from('obras')
      .select('id, codigo, nombre')
      .limit(5);
    
    if (obrasError) {
      console.error('❌ Error consultando obras:', obrasError);
      return;
    }
    
    console.log(`✅ Encontradas ${obras?.length || 0} obras:`);
    obras?.forEach(obra => {
      console.log(`   - ${obra.codigo}: ${obra.nombre} (ID: ${obra.id})`);
    });
    
    if (!obras || obras.length === 0) {
      console.error('❌ No hay obras disponibles para asignar');
      return;
    }
    
    // 2. Verificar usuarios disponibles
    console.log('\n2. Verificando usuarios disponibles:');
    const { data: usuarios, error: usuariosError } = await supabaseAnon
      .from('usuarios')
      .select('id, email, nombre, apellido, obra_id')
      .limit(5);
    
    if (usuariosError) {
      console.error('❌ Error consultando usuarios:', usuariosError);
      return;
    }
    
    console.log(`✅ Encontrados ${usuarios?.length || 0} usuarios:`);
    usuarios?.forEach(usuario => {
      console.log(`   - ${usuario.email}: ${usuario.nombre} ${usuario.apellido} (Obra actual: ${usuario.obra_id || 'Sin asignar'})`);
    });
    
    if (!usuarios || usuarios.length === 0) {
      console.error('❌ No hay usuarios disponibles');
      return;
    }
    
    // 3. Intentar asignar obra con cliente anónimo
    const usuarioTest = usuarios[0];
    const obraTest = obras[0];
    
    console.log(`\n3. Intentando asignar obra "${obraTest.codigo}" al usuario "${usuarioTest.email}" con cliente anónimo:`);
    
    const { data: updateResult1, error: updateError1 } = await supabaseAnon
      .from('usuarios')
      .update({ 
        obra_id: obraTest.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', usuarioTest.id)
      .select();
    
    if (updateError1) {
      console.error('❌ Error con cliente anónimo:', updateError1);
    } else {
      console.log('✅ Asignación exitosa con cliente anónimo:', updateResult1);
    }
    
    // 4. Intentar asignar obra con service role
    console.log(`\n4. Intentando asignar obra "${obraTest.codigo}" al usuario "${usuarioTest.email}" con service role:`);
    
    const { data: updateResult2, error: updateError2 } = await supabaseService
      .from('usuarios')
      .update({ 
        obra_id: obraTest.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', usuarioTest.id)
      .select();
    
    if (updateError2) {
      console.error('❌ Error con service role:', updateError2);
    } else {
      console.log('✅ Asignación exitosa con service role:', updateResult2);
    }
    
    // 5. Verificar el resultado final
    console.log('\n5. Verificando resultado final:');
    const { data: usuarioFinal, error: finalError } = await supabaseAnon
      .from('usuarios')
      .select('id, email, obra_id')
      .eq('id', usuarioTest.id)
      .single();
    
    if (finalError) {
      console.error('❌ Error verificando resultado:', finalError);
    } else {
      console.log('✅ Estado final del usuario:', usuarioFinal);
      
      if (usuarioFinal.obra_id === obraTest.id) {
        console.log('🎉 ¡Asignación de obra exitosa!');
      } else {
        console.log('⚠️ La obra no se asignó correctamente');
      }
    }
    
    // 6. Verificar permisos de roles
    console.log('\n6. Verificando permisos de roles:');
    const { data: permissions, error: permError } = await supabaseService
      .rpc('exec_sql', {
        sql: `
          SELECT grantee, table_name, privilege_type 
          FROM information_schema.role_table_grants 
          WHERE table_schema = 'public' 
            AND table_name IN ('usuarios', 'obras')
            AND grantee IN ('anon', 'authenticated') 
          ORDER BY table_name, grantee;
        `
      });
    
    if (permError) {
      console.error('❌ Error verificando permisos:', permError);
    } else {
      console.log('✅ Permisos de roles:', permissions);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar prueba
testObraAssignment().then(() => {
  console.log('\n🏁 Prueba completada');
}).catch(error => {
  console.error('💥 Error ejecutando prueba:', error);
});