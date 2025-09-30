import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase
const supabaseUrl = 'https://scbehttod-a09b-41d4-a966-646665440004.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjYmVodHRvZGEwOWI0MWQ0YTk2NjY0NjY2NTQ0MDAwNCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MzQ5NzU2MDAsImV4cCI6MjA1MDU1MTYwMH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuración de la base de datos local
const dbPath = path.join(__dirname, 'almacen.db');
const db = new Database(dbPath);

async function syncObrasCodes() {
  console.log('🔄 Iniciando sincronización de códigos de obras...');
  
  try {
    // 1. Obtener obras de la base de datos local
    console.log('\n1. Obteniendo obras de la base de datos local:');
    const localObras = db.prepare(`
      SELECT id, codigo, nombre, descripcion 
      FROM obras 
      ORDER BY id
    `).all();
    
    console.log(`📊 Encontradas ${localObras.length} obras en BD local:`);
    localObras.forEach(obra => {
      console.log(`   - ${obra.codigo}: ${obra.nombre} (ID Local: ${obra.id})`);
    });
    
    // 2. Obtener obras de Supabase
    console.log('\n2. Obteniendo obras de Supabase:');
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
    
    // 3. Sincronizar códigos
    console.log('\n3. Sincronizando códigos de obras:');
    
    for (const localObra of localObras) {
      // Buscar obra correspondiente en Supabase por nombre similar
      const supabaseObra = supabaseObras.find(so => 
        so.nombre.toLowerCase().includes('chavin') && 
        localObra.nombre.toLowerCase().includes('chavin')
      );
      
      if (supabaseObra && supabaseObra.codigo !== localObra.codigo) {
        console.log(`🔄 Actualizando obra en Supabase:`);
        console.log(`   Obra: ${supabaseObra.nombre}`);
        console.log(`   Código actual: ${supabaseObra.codigo}`);
        console.log(`   Nuevo código: ${localObra.codigo}`);
        
        const { error: updateError } = await supabase
          .from('obras')
          .update({ 
            codigo: localObra.codigo,
            nombre: localObra.nombre,
            descripcion: localObra.descripcion || supabaseObra.descripcion
          })
          .eq('id', supabaseObra.id);
        
        if (updateError) {
          console.error(`❌ Error al actualizar obra ${supabaseObra.id}:`, updateError);
        } else {
          console.log(`✅ Obra actualizada exitosamente`);
        }
      }
    }
    
    // 4. Verificar sincronización
    console.log('\n4. Verificando sincronización:');
    const { data: updatedObras, error: verifyError } = await supabase
      .from('obras')
      .select('*')
      .order('created_at');
    
    if (verifyError) {
      console.error('❌ Error al verificar obras:', verifyError);
      return;
    }
    
    console.log('📊 Obras actualizadas en Supabase:');
    updatedObras.forEach(obra => {
      console.log(`   - ${obra.codigo}: ${obra.nombre}`);
    });
    
    // 5. Verificar mapeo después de la sincronización
    console.log('\n5. Verificando mapeo después de sincronización:');
    for (const localObra of localObras) {
      const supabaseObra = updatedObras.find(so => so.codigo === localObra.codigo);
      if (supabaseObra) {
        console.log(`✅ Mapeo correcto: ${localObra.codigo} (Local ID: ${localObra.id}) -> (Supabase UUID: ${supabaseObra.id})`);
      } else {
        console.log(`❌ Sin mapeo: ${localObra.codigo} no encontrado en Supabase`);
      }
    }
    
    console.log('\n🎯 Sincronización completada');
    
  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
  } finally {
    db.close();
  }
}

// Ejecutar sincronización
syncObrasCodes();