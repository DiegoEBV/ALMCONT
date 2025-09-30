import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Datos de la obra local (del database.json)
const obraLocal = {
  codigo: 'CHAVIN-001',
  nombre: 'Proyecto CHAVIN',
  descripcion: 'Proyecto de construcción CHAVIN',
  ubicacion: 'Lima, Perú',
  fecha_inicio: '2024-01-01',
  fecha_fin_estimada: '2024-12-31',
  estado: 'ACTIVA',
  presupuesto: 1000000,
  responsable: 'Juan Carlos Pérez',
  activa: true
};

async function syncObraCodes() {
  console.log('🔄 Sincronizando códigos de obras entre local y Supabase...');
  
  try {
    // 1. Obtener obras actuales de Supabase
    console.log('\n1. Obteniendo obras de Supabase:');
    const { data: supabaseObras, error: obrasError } = await supabase
      .from('obras')
      .select('*')
      .order('created_at');
    
    if (obrasError) {
      console.error('❌ Error al obtener obras de Supabase:', obrasError);
      return;
    }
    
    console.log(`📊 Encontradas ${supabaseObras.length} obras en Supabase:`);
    supabaseObras.forEach(obra => {
      console.log(`   - ${obra.codigo}: ${obra.nombre} (UUID: ${obra.id})`);
    });
    
    // 2. Buscar la obra que necesita sincronización
    const obraToUpdate = supabaseObras.find(obra => 
      obra.nombre.toLowerCase().includes('chavin') || 
      obra.codigo.toLowerCase().includes('proyecto-chavin')
    );
    
    if (!obraToUpdate) {
      console.log('❌ No se encontró la obra CHAVIN en Supabase para actualizar');
      return;
    }
    
    console.log(`\n2. Obra encontrada para actualizar:`);
    console.log(`   UUID: ${obraToUpdate.id}`);
    console.log(`   Código actual: ${obraToUpdate.codigo}`);
    console.log(`   Nombre actual: ${obraToUpdate.nombre}`);
    console.log(`   Nuevo código: ${obraLocal.codigo}`);
    console.log(`   Nuevo nombre: ${obraLocal.nombre}`);
    
    // 3. Actualizar la obra en Supabase
    console.log('\n3. Actualizando obra en Supabase...');
    const { data: updatedObra, error: updateError } = await supabase
      .from('obras')
      .update({
        codigo: obraLocal.codigo,
        nombre: obraLocal.nombre,
        descripcion: obraLocal.descripcion,
        ubicacion: obraLocal.ubicacion,
        estado: 'ACTIVA'
      })
      .eq('id', obraToUpdate.id)
      .select();
    
    if (updateError) {
      console.error('❌ Error al actualizar obra:', updateError);
      return;
    }
    
    console.log('✅ Obra actualizada exitosamente:');
    console.log(`   UUID: ${updatedObra[0].id}`);
    console.log(`   Código: ${updatedObra[0].codigo}`);
    console.log(`   Nombre: ${updatedObra[0].nombre}`);
    
    // 4. Verificar que el mapeo ahora funciona
    console.log('\n4. Verificando mapeo después de la actualización...');
    const { data: finalObras, error: finalError } = await supabase
      .from('obras')
      .select('*')
      .eq('codigo', obraLocal.codigo);
    
    if (finalError) {
      console.error('❌ Error al verificar mapeo:', finalError);
      return;
    }
    
    if (finalObras.length > 0) {
      console.log('✅ Mapeo verificado correctamente:');
      console.log(`   Código local: ${obraLocal.codigo}`);
      console.log(`   UUID Supabase: ${finalObras[0].id}`);
      console.log(`   Nombre: ${finalObras[0].nombre}`);
    } else {
      console.log('❌ El mapeo aún no funciona correctamente');
    }
    
    // 5. Verificar usuarios asignados a esta obra
    console.log('\n5. Verificando usuarios asignados a esta obra...');
    const { data: usuariosAsignados, error: usuariosError } = await supabase
      .from('usuarios')
      .select('email, nombre, apellido, obra_id')
      .eq('obra_id', updatedObra[0].id);
    
    if (usuariosError) {
      console.error('❌ Error al obtener usuarios asignados:', usuariosError);
    } else {
      console.log(`📊 Usuarios asignados a la obra ${obraLocal.codigo}:`);
      if (usuariosAsignados.length > 0) {
        usuariosAsignados.forEach(usuario => {
          console.log(`   - ${usuario.email}: ${usuario.nombre} ${usuario.apellido}`);
        });
      } else {
        console.log('   - No hay usuarios asignados a esta obra');
      }
    }
    
    console.log('\n🎯 Sincronización completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
  }
}

// Ejecutar sincronización
syncObraCodes();