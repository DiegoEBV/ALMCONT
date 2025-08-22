const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPermissions() {
  console.log('🔍 Verificando permisos RLS para la tabla requerimientos...');
  
  try {
    // Verificar políticas RLS
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'requerimientos');
    
    if (policiesError) {
      console.error('❌ Error al obtener políticas RLS:', policiesError);
    } else {
      console.log('📋 Políticas RLS encontradas:', policies?.length || 0);
      policies?.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd} para roles ${policy.roles}`);
      });
    }
    
    // Verificar permisos de tabla
    const { data: grants, error: grantsError } = await supabase
      .rpc('check_table_grants', { table_name: 'requerimientos' });
    
    if (grantsError) {
      console.log('⚠️ No se pudo ejecutar check_table_grants, intentando consulta directa...');
      
      // Consulta directa a information_schema
      const { data: directGrants, error: directError } = await supabase
        .from('information_schema.role_table_grants')
        .select('grantee, table_name, privilege_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'requerimientos')
        .in('grantee', ['anon', 'authenticated']);
      
      if (directError) {
        console.error('❌ Error al obtener permisos directos:', directError);
      } else {
        console.log('🔐 Permisos de tabla encontrados:', directGrants?.length || 0);
        directGrants?.forEach(grant => {
          console.log(`  - ${grant.grantee}: ${grant.privilege_type}`);
        });
      }
    } else {
      console.log('🔐 Permisos de tabla:', grants);
    }
    
    // Probar consulta simple como anon
    console.log('\n🧪 Probando consulta como usuario anónimo...');
    const anonClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q');
    
    const { data: testData, error: testError, count } = await anonClient
      .from('requerimientos')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (testError) {
      console.error('❌ Error en consulta de prueba:', testError);
    } else {
      console.log(`✅ Consulta exitosa: ${count} registros totales, mostrando ${testData?.length || 0}`);
      if (testData && testData.length > 0) {
        console.log('📄 Primer registro:', {
          id: testData[0].id,
          numero_requerimiento: testData[0].numero_requerimiento,
          empresa: testData[0].empresa,
          material: testData[0].material
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkPermissions();