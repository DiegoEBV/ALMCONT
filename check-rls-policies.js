import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSPolicies() {
  console.log('🔍 Verificando políticas RLS y permisos...');
  
  try {
    // Verificar políticas RLS para la tabla usuarios
    console.log('\n1. Políticas RLS para tabla usuarios:');
    const { data: userPolicies, error: userPoliciesError } = await supabase
      .rpc('get_policies', { table_name: 'usuarios' })
      .select();
    
    if (userPoliciesError) {
      console.log('❌ Error obteniendo políticas de usuarios:', userPoliciesError.message);
    } else {
      console.log('📋 Políticas encontradas:', userPolicies?.length || 0);
      userPolicies?.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd} (${policy.roles})`);
      });
    }

    // Verificar políticas RLS para la tabla obras
    console.log('\n2. Políticas RLS para tabla obras:');
    const { data: obrasPolicies, error: obrasPoliciesError } = await supabase
      .rpc('get_policies', { table_name: 'obras' })
      .select();
    
    if (obrasPoliciesError) {
      console.log('❌ Error obteniendo políticas de obras:', obrasPoliciesError.message);
    } else {
      console.log('📋 Políticas encontradas:', obrasPolicies?.length || 0);
      obrasPolicies?.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd} (${policy.roles})`);
      });
    }

    // Verificar permisos de roles
    console.log('\n3. Verificando permisos de roles:');
    const { data: permissions, error: permissionsError } = await supabase
      .from('information_schema.role_table_grants')
      .select('grantee, table_name, privilege_type')
      .in('table_name', ['usuarios', 'obras'])
      .in('grantee', ['anon', 'authenticated'])
      .order('table_name');
    
    if (permissionsError) {
      console.log('❌ Error obteniendo permisos:', permissionsError.message);
    } else {
      console.log('📋 Permisos encontrados:');
      permissions?.forEach(perm => {
        console.log(`   - ${perm.grantee} en ${perm.table_name}: ${perm.privilege_type}`);
      });
    }

    // Probar asignación de obra a usuario
    console.log('\n4. Probando asignación de obra a usuario:');
    
    // Obtener el ID de la obra CHAVIN-001
    const { data: obra, error: obraError } = await supabase
      .from('obras')
      .select('id, codigo, nombre')
      .eq('codigo', 'CHAVIN-001')
      .single();
    
    if (obraError) {
      console.log('❌ Error obteniendo obra:', obraError.message);
      return;
    }
    
    console.log(`✅ Obra encontrada: ${obra.codigo} - ${obra.nombre} (ID: ${obra.id})`);
    
    // Obtener un usuario de coordinación para probar
    const { data: coordinador, error: coordinadorError } = await supabase
      .from('usuarios')
      .select('id, email, nombre, apellido, rol')
      .eq('rol', 'COORDINACION')
      .limit(1)
      .single();
    
    if (coordinadorError) {
      console.log('❌ Error obteniendo coordinador:', coordinadorError.message);
      return;
    }
    
    console.log(`✅ Coordinador encontrado: ${coordinador.email} - ${coordinador.nombre} ${coordinador.apellido}`);
    
    // Obtener un usuario de logística para asignar
    const { data: usuarioLogistica, error: logisticaError } = await supabase
      .from('usuarios')
      .select('id, email, nombre, apellido, rol, obra_id')
      .eq('rol', 'LOGISTICA')
      .limit(1)
      .single();
    
    if (logisticaError) {
      console.log('❌ Error obteniendo usuario de logística:', logisticaError.message);
      return;
    }
    
    console.log(`✅ Usuario de logística encontrado: ${usuarioLogistica.email} - ${usuarioLogistica.nombre} ${usuarioLogistica.apellido}`);
    console.log(`   Obra actual asignada: ${usuarioLogistica.obra_id || 'Ninguna'}`);
    
    // Intentar asignar la obra al usuario
    console.log('\n5. Intentando asignar obra al usuario...');
    const { data: updateResult, error: updateError } = await supabase
      .from('usuarios')
      .update({ obra_id: obra.id })
      .eq('id', usuarioLogistica.id)
      .select();
    
    if (updateError) {
      console.log('❌ Error asignando obra:', updateError.message);
      console.log('   Detalles:', updateError);
    } else {
      console.log('✅ Obra asignada exitosamente:');
      console.log(`   Usuario: ${usuarioLogistica.email}`);
      console.log(`   Obra: ${obra.codigo} (${obra.id})`);
      
      // Verificar la asignación
      const { data: verification, error: verifyError } = await supabase
        .from('usuarios')
        .select(`
          id, email, nombre, apellido, rol, obra_id,
          obras:obra_id (
            id, codigo, nombre
          )
        `)
        .eq('id', usuarioLogistica.id)
        .single();
      
      if (verifyError) {
        console.log('❌ Error verificando asignación:', verifyError.message);
      } else {
        console.log('\n6. Verificación de asignación:');
        console.log(`   Usuario: ${verification.email}`);
        console.log(`   Obra asignada: ${verification.obras?.codigo || 'No encontrada'} - ${verification.obras?.nombre || 'N/A'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

checkRLSPolicies();