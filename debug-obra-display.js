import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función para leer la base de datos local
function readLocalDatabase() {
  try {
    const dbPath = path.join(process.cwd(), 'src', 'data', 'database.json');
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error leyendo base de datos local:', error);
    return null;
  }
}

async function debugObraDisplay() {
  console.log('🔍 Depurando visualización de obras asignadas...');
  
  try {
    // 1. Verificar datos en Supabase
    console.log('\n1. Datos en Supabase:');
    
    const { data: supabaseUsuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, email, nombre, apellido, obra_id')
      .order('email');
    
    if (usuariosError) {
      console.error('❌ Error consultando usuarios en Supabase:', usuariosError);
      return;
    }
    
    const { data: supabaseObras, error: obrasError } = await supabase
      .from('obras')
      .select('id, codigo, nombre')
      .order('codigo');
    
    if (obrasError) {
      console.error('❌ Error consultando obras en Supabase:', obrasError);
      return;
    }
    
    console.log('📊 Usuarios en Supabase:');
    supabaseUsuarios?.forEach(usuario => {
      const obra = supabaseObras?.find(o => o.id === usuario.obra_id);
      console.log(`   - ${usuario.email}: ${usuario.nombre} ${usuario.apellido}`);
      console.log(`     Obra ID: ${usuario.obra_id || 'null'}`);
      console.log(`     Obra: ${obra ? `${obra.codigo} - ${obra.nombre}` : 'Sin asignar'}`);
      console.log('');
    });
    
    console.log('📊 Obras en Supabase:');
    supabaseObras?.forEach(obra => {
      console.log(`   - ${obra.codigo}: ${obra.nombre} (ID: ${obra.id})`);
    });
    
    // 2. Verificar datos en base de datos local
    console.log('\n2. Datos en base de datos local:');
    
    const localDB = readLocalDatabase();
    if (!localDB) {
      console.log('❌ No se pudo leer la base de datos local');
      return;
    }
    
    console.log('📊 Usuarios en BD Local:');
    if (localDB.usuarios) {
      localDB.usuarios.forEach(usuario => {
        const obra = localDB.obras?.find(o => o.id === usuario.obra_id);
        console.log(`   - ${usuario.email}: ${usuario.nombre} ${usuario.apellido}`);
        console.log(`     Obra ID Local: ${usuario.obra_id || 'null'}`);
        console.log(`     Obra Local: ${obra ? `${obra.codigo} - ${obra.nombre}` : 'Sin asignar'}`);
        console.log('');
      });
    }
    
    console.log('📊 Obras en BD Local:');
    if (localDB.obras) {
      localDB.obras.forEach(obra => {
        console.log(`   - ${obra.codigo}: ${obra.nombre} (ID Local: ${obra.id})`);
      });
    }
    
    // 3. Comparar mapeos entre local y Supabase
    console.log('\n3. Análisis de mapeos:');
    
    if (localDB.obras && supabaseObras) {
      console.log('🔗 Mapeo de obras (Local -> Supabase):');
      for (const obraLocal of localDB.obras) {
        const obraSupabase = supabaseObras.find(o => o.codigo === obraLocal.codigo);
        if (obraSupabase) {
          console.log(`   ✅ ${obraLocal.codigo}: Local ID "${obraLocal.id}" -> Supabase UUID "${obraSupabase.id}"`);
        } else {
          console.log(`   ❌ ${obraLocal.codigo}: Local ID "${obraLocal.id}" -> NO ENCONTRADA EN SUPABASE`);
        }
      }
    }
    
    // 4. Verificar usuarios con obras asignadas
    console.log('\n4. Usuarios con obras asignadas:');
    
    const usuariosConObra = supabaseUsuarios?.filter(u => u.obra_id) || [];
    console.log(`📈 ${usuariosConObra.length} usuarios tienen obras asignadas en Supabase`);
    
    usuariosConObra.forEach(usuario => {
      const obra = supabaseObras?.find(o => o.id === usuario.obra_id);
      const usuarioLocal = localDB.usuarios?.find(u => u.email === usuario.email);
      
      console.log(`\n👤 ${usuario.email}:`);
      console.log(`   Supabase - Obra ID: ${usuario.obra_id}`);
      console.log(`   Supabase - Obra: ${obra ? `${obra.codigo} - ${obra.nombre}` : 'OBRA NO ENCONTRADA'}`);
      
      if (usuarioLocal) {
        const obraLocal = localDB.obras?.find(o => o.id === usuarioLocal.obra_id);
        console.log(`   Local - Obra ID: ${usuarioLocal.obra_id || 'null'}`);
        console.log(`   Local - Obra: ${obraLocal ? `${obraLocal.codigo} - ${obraLocal.nombre}` : 'Sin asignar'}`);
        
        // Verificar si hay desincronización
        if (obra && obraLocal) {
          if (obra.codigo === obraLocal.codigo) {
            console.log(`   ✅ SINCRONIZADO: Misma obra en ambas bases`);
          } else {
            console.log(`   ⚠️ DESINCRONIZADO: Diferentes obras`);
          }
        } else if (obra && !obraLocal) {
          console.log(`   ⚠️ DESINCRONIZADO: Obra en Supabase pero no en local`);
        } else if (!obra && obraLocal) {
          console.log(`   ⚠️ DESINCRONIZADO: Obra en local pero no en Supabase`);
        }
      } else {
        console.log(`   ❌ Usuario no encontrado en base de datos local`);
      }
    });
    
    // 5. Recomendaciones
    console.log('\n5. 🎯 Recomendaciones:');
    
    const usuariosSinObraLocal = localDB.usuarios?.filter(u => !u.obra_id) || [];
    const usuariosSinObraSupabase = supabaseUsuarios?.filter(u => !u.obra_id) || [];
    
    if (usuariosSinObraLocal.length > 0) {
      console.log(`   📝 ${usuariosSinObraLocal.length} usuarios sin obra asignada en BD local`);
    }
    
    if (usuariosSinObraSupabase.length > 0) {
      console.log(`   📝 ${usuariosSinObraSupabase.length} usuarios sin obra asignada en Supabase`);
    }
    
    if (usuariosConObra.length === 0) {
      console.log('   ⚠️ NINGÚN usuario tiene obra asignada en Supabase');
      console.log('   💡 Esto explica por qué no se muestran obras en el frontend');
    }
    
    console.log('\n   💡 Para solucionar el problema:');
    console.log('   1. Verificar que las asignaciones se guarden correctamente en Supabase');
    console.log('   2. Sincronizar las obras asignadas entre local y Supabase');
    console.log('   3. Verificar que el frontend lea de la fuente correcta');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar depuración
debugObraDisplay().then(() => {
  console.log('\n🏁 Depuración completada');
}).catch(error => {
  console.error('💥 Error ejecutando depuración:', error);
});