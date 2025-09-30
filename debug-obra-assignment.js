import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (usando las credenciales que ya funcionan)
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugObraAssignment() {
  console.log('=== DEBUG: Problema de Asignación de Obras ===\n');
  
  try {
    // 1. Verificar usuarios en Supabase
    console.log('1. Usuarios en Supabase:');
    const { data: usuariosSupabase, error: errorUsuarios } = await supabase
      .from('usuarios')
      .select('id, email, nombre, apellido, obra_id')
      .order('email');
    
    if (errorUsuarios) {
      console.error('❌ Error consultando usuarios Supabase:', errorUsuarios);
      return;
    }
    
    console.log(`Total usuarios Supabase: ${usuariosSupabase.length}`);
    usuariosSupabase.forEach(user => {
      console.log(`  - UUID: ${user.id.substring(0,8)}..., Email: ${user.email}, Obra: ${user.obra_id || 'SIN ASIGNAR'}`);
    });
    
    // 2. Verificar obras en Supabase
    console.log('\n2. Obras en Supabase:');
    const { data: obrasSupabase, error: errorObras } = await supabase
      .from('obras')
      .select('id, codigo, nombre, estado')
      .order('codigo');
    
    if (errorObras) {
      console.error('❌ Error consultando obras Supabase:', errorObras);
      return;
    }
    
    console.log(`Total obras Supabase: ${obrasSupabase.length}`);
    obrasSupabase.forEach(obra => {
      console.log(`  - UUID: ${obra.id.substring(0,8)}..., Código: ${obra.codigo}, Nombre: ${obra.nombre}, Estado: ${obra.estado}`);
    });
    
    // 3. Buscar usuarios sin obra asignada
    console.log('\n3. Usuarios sin obra asignada:');
    const usuariosSinObra = usuariosSupabase.filter(user => !user.obra_id);
    console.log(`Total usuarios sin obra: ${usuariosSinObra.length}`);
    usuariosSinObra.forEach(user => {
      console.log(`  - ${user.email} (${user.nombre} ${user.apellido})`);
    });
    
    // 4. Probar asignación de obra
    if (usuariosSinObra.length > 0 && obrasSupabase.length > 0) {
      const usuarioTest = usuariosSinObra[0];
      const obraTest = obrasSupabase.find(obra => obra.estado === 'ACTIVA');
      
      if (obraTest) {
        console.log(`\n4. Probando asignación de obra:`);
        console.log(`Asignando obra "${obraTest.codigo}" al usuario "${usuarioTest.email}"`);
        
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
          console.log('Detalles del error:', {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          });
        } else {
          console.log('✅ Asignación exitosa:', updateResult);
          
          // Verificar la asignación
          const { data: verificacion, error: errorVerif } = await supabase
            .from('usuarios')
            .select('id, email, obra_id')
            .eq('id', usuarioTest.id)
            .single();
          
          if (errorVerif) {
            console.error('❌ Error verificando asignación:', errorVerif);
          } else {
            console.log('✅ Verificación exitosa:', {
              usuario: verificacion.email,
              obra_asignada: verificacion.obra_id
            });
          }
        }
      } else {
        console.log('❌ No hay obras activas disponibles para asignar');
      }
    } else {
      console.log('❌ No hay usuarios sin obra o no hay obras disponibles para probar');
    }
    
    // 5. Verificar permisos de tabla
    console.log('\n5. Verificando permisos de tabla usuarios:');
    try {
      const { data: permisos, error: errorPermisos } = await supabase
        .rpc('check_table_permissions', { table_name: 'usuarios' })
        .single();
      
      if (errorPermisos) {
        console.log('No se pudo verificar permisos (función no disponible)');
      } else {
        console.log('Permisos de tabla:', permisos);
      }
    } catch (error) {
      console.log('Error verificando permisos:', error.message);
    }
    
    // 6. Verificar políticas RLS
    console.log('\n6. Verificando si RLS está habilitado:');
    const { data: rlsInfo, error: rlsError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'usuarios')
      .single();
    
    if (rlsError) {
      console.log('No se pudo verificar RLS (acceso restringido)');
    } else {
      console.log(`RLS habilitado en tabla usuarios: ${rlsInfo.relrowsecurity}`);
    }
    
  } catch (error) {
    console.error('❌ Error general en debug:', error);
  }
}

// Ejecutar debug
debugObraAssignment().then(() => {
  console.log('\n=== Debug completado ===');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error ejecutando debug:', error);
  process.exit(1);
});