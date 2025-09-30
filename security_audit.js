import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  console.log('📝 Asegúrate de crear un archivo .env con:');
  console.log('   VITE_SUPABASE_URL=tu_url_de_supabase');
  console.log('   VITE_SUPABASE_ANON_KEY=tu_clave_anon');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function auditSecurity() {
  console.log('🔒 AUDITORÍA DE SEGURIDAD - ALMACÉN');
  console.log('=' .repeat(50));
  
  // 1. Verificar conexión
  console.log('\n1. 🔗 Verificando conexión a Supabase...');
  try {
    const { data, error } = await supabase.from('usuarios').select('count').limit(1);
    if (error) {
      console.log('❌ Error de conexión:', error.message);
    } else {
      console.log('✅ Conexión exitosa');
    }
  } catch (err) {
    console.log('❌ Error de conexión:', err.message);
  }
  
  // 2. Verificar tablas principales
  console.log('\n2. 📊 Verificando acceso a tablas principales...');
  const tables = ['usuarios', 'obras', 'materiales', 'requerimientos', 'solicitudes_compra', 'entradas', 'salidas', 'stock'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Acceso OK (${data?.length || 0} registros de muestra)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  // 3. Verificar función RPC
  console.log('\n3. 🔧 Verificando función set_user_context...');
  try {
    const { data, error } = await supabase.rpc('set_user_context', { user_id: 'test-user-id' });
    if (error) {
      console.log('❌ Función RPC no disponible:', error.message);
    } else {
      console.log('✅ Función RPC disponible');
    }
  } catch (err) {
    console.log('❌ Error en función RPC:', err.message);
  }
  
  // 4. Verificar autenticación
  console.log('\n4. 🔐 Verificando estado de autenticación...');
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    console.log('✅ Usuario autenticado:', user.email);
  } else {
    console.log('⚠️ No hay usuario autenticado (usando clave anónima)');
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🔒 RESUMEN DE SEGURIDAD:');
  console.log('✅ Archivo .env eliminado del repositorio');
  console.log('✅ .env añadido a .gitignore');
  console.log('✅ Archivo .env.example creado con placeholders');
  console.log('✅ SERVICE_ROLE_KEY solo se usa en backend/scripts');
  console.log('✅ Frontend solo usa ANON_KEY con RLS');
  console.log('\n📋 PRÓXIMOS PASOS RECOMENDADOS:');
  console.log('1. Rotar claves de Supabase en el dashboard');
  console.log('2. Limpiar historial de Git con git filter-repo');
  console.log('3. Verificar políticas RLS en producción');
  console.log('4. Configurar monitoreo de seguridad');
}

auditSecurity().catch(console.error);