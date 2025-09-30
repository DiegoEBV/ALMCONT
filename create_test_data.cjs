const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestData() {
  console.log('🚀 Creando datos de prueba para el dashboard...');
  
  try {
    // 1. Verificar o crear obra de prueba
    console.log('\n1. Verificando obra existente...');
    const { data: obras, error: obrasError } = await supabase
      .from('obras')
      .select('id')
      .limit(1);
    
    if (obrasError) {
      console.error('❌ Error al consultar obras:', obrasError);
      return;
    }
    
    let obraId;
    if (obras && obras.length > 0) {
      obraId = obras[0].id;
      console.log('✅ Usando obra existente:', obraId);
    } else {
      console.log('❌ No se encontraron obras existentes');
      return;
    }

    // 1.5. Obtener ID del usuario coordinador
    console.log('\n1.5. Obteniendo usuario coordinador...');
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', 'coordinador@obra.com')
      .limit(1);
    
    if (usuariosError) {
      console.error('❌ Error al consultar usuarios:', usuariosError);
      return;
    }
    
    let coordinadorId;
    if (usuarios && usuarios.length > 0) {
      coordinadorId = usuarios[0].id;
      console.log('✅ Usuario coordinador encontrado:', coordinadorId);
    } else {
      console.log('❌ No se encontró el usuario coordinador');
      return;
    }
    
    // 2. Crear materiales de prueba
    const materiales = [
      {
        codigo: 'MAT-001',
        nombre: 'Cemento Portland',
        descripcion: 'Cemento para construcción',
        unidad_medida: 'BOLSA',
        categoria: 'CONSTRUCCION',
        activo: true
      },
      {
        codigo: 'MAT-002', 
        nombre: 'Varilla de Acero 1/2"',
        descripcion: 'Varilla corrugada de acero',
        unidad_medida: 'UNIDAD',
        categoria: 'ACERO',
        activo: true
      },
      {
        codigo: 'MAT-003',
        nombre: 'Ladrillo King Kong',
        descripcion: 'Ladrillo para muros',
        unidad_medida: 'MILLAR',
        categoria: 'ALBAÑILERIA',
        activo: true
      }
    ];
    
    const { data: materialesCreados, error: materialesError } = await supabase
      .from('materiales')
      .upsert(materiales, { onConflict: 'codigo' })
      .select('id, codigo');
    
    if (materialesError) {
      console.error('❌ Error al crear materiales:', materialesError);
      return;
    }
    
    console.log('✅ Materiales creados:', materialesCreados.length);
    
    // 3. Crear stock de materiales
     const stockData = materialesCreados.map(material => ({
       obra_id: obraId,
       material_id: material.id,
       stock_actual: Math.floor(Math.random() * 100) + 10,
       stock_minimo: 5,
       stock_maximo: 200,
       costo_promedio: Math.floor(Math.random() * 50) + 10
       // valor_total se calcula automáticamente como columna generada
     }));
    
    const { error: stockError } = await supabase
      .from('stock_obra_material')
      .upsert(stockData, { onConflict: 'obra_id,material_id' });
    
    if (stockError) {
      console.error('❌ Error al crear stock:', stockError);
      return;
    }
    
    console.log('✅ Stock creado para', stockData.length, 'materiales');
    
    // 4. Crear solicitudes de compra
    const solicitudesData = [
      {
        obra_id: obraId,
        numero_sc: 'SC-2024-001',
        fecha_solicitud: '2024-01-15',
        fecha_necesidad: '2024-01-25',
        proveedor_sugerido: 'Proveedor ABC',
        justificacion: 'Materiales para construcción',
        estado: 'PENDIENTE',
        total_estimado: 15000.00,
        created_by: coordinadorId
      },
      {
        obra_id: obraId,
        numero_sc: 'SC-2024-002',
        fecha_solicitud: '2024-01-10',
        fecha_necesidad: '2024-01-20',
        proveedor_sugerido: 'Proveedor XYZ',
        justificacion: 'Materiales urgentes',
        estado: 'APROBADO',
        total_estimado: 8500.00,
        created_by: coordinadorId,
        aprobado_por: coordinadorId,
        fecha_aprobacion: new Date().toISOString()
      }
    ];
    
    const { error: solicitudesError } = await supabase
      .from('solicitudes_compra')
      .upsert(solicitudesData, { onConflict: 'numero_sc' });
    
    if (solicitudesError) {
      console.error('❌ Error al crear solicitudes:', solicitudesError);
      return;
    }
    
    console.log('✅ Solicitudes de compra creadas:', solicitudesData.length);
    
    // 5. Crear entradas
    const entradasData = [
      {
        obra_id: obraId,
        numero_entrada: 'ENT-2024-001',
        fecha_entrada: '2024-01-16',
        proveedor: 'Proveedor ABC',
        documento_referencia: 'FAC-001',
        estado: 'ALMACENADO',
        recibido_por: coordinadorId,
        verificado_por: coordinadorId,
        fecha_verificacion: new Date().toISOString()
      },
      {
        obra_id: obraId,
        numero_entrada: 'ENT-2024-002',
        fecha_entrada: '2024-01-18',
        proveedor: 'Proveedor XYZ',
        documento_referencia: 'FAC-002',
        estado: 'PENDIENTE',
        recibido_por: coordinadorId
      }
    ];
    
    const { error: entradasError } = await supabase
      .from('entradas')
      .upsert(entradasData, { onConflict: 'numero_entrada' });
    
    if (entradasError) {
      console.error('❌ Error al crear entradas:', entradasError);
      return;
    }
    
    console.log('✅ Entradas creadas:', entradasData.length);
    
    // 6. Crear salidas
    const salidasData = [
      {
        obra_id: obraId,
        numero_salida: 'SAL-2024-001',
        fecha_salida: '2024-01-17',
        tipo_salida: 'CONSUMO',
        area_destino: 'Área de construcción',
        responsable_recepcion: 'Juan Pérez',
        estado: 'ENTREGADO',
        solicitado_por: coordinadorId,
        autorizado_por: coordinadorId,
        entregado_por: coordinadorId,
        fecha_autorizacion: new Date().toISOString(),
        fecha_entrega: new Date().toISOString()
      }
    ];
    
    const { error: salidasError } = await supabase
      .from('salidas')
      .upsert(salidasData, { onConflict: 'numero_salida' });
    
    if (salidasError) {
      console.error('❌ Error al crear salidas:', salidasError);
      return;
    }
    
    console.log('✅ Salidas creadas:', salidasData.length);
    
    // 7. Crear requerimientos de materiales
    const requerimientosData = [
      {
        obra_id: obraId,
        codigo: 'REQ-001-2024',
        solicitante_id: coordinadorId,
        estado: 'PENDIENTE',
        fecha_requerida: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        prioridad: 'ALTA',
        comentarios: 'Requerimiento urgente de prueba'
      },
      {
        obra_id: obraId,
        codigo: 'REQ-002-2024',
        solicitante_id: coordinadorId,
        estado: 'APROBADO',
        fecha_requerida: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        prioridad: 'MEDIA',
        comentarios: 'Requerimiento aprobado de prueba',
        aprobado_por: coordinadorId,
        fecha_aprobacion: new Date().toISOString()
      }
    ];
    
    const { error: requerimientosError } = await supabase
      .from('requerimiento_materiales')
      .upsert(requerimientosData, { onConflict: 'codigo' });
    
    if (requerimientosError) {
      console.error('❌ Error al crear requerimientos:', requerimientosError);
      return;
    }
    
    console.log('✅ Requerimientos creados:', requerimientosData.length);
    
    console.log('\n🎉 ¡Datos de prueba creados exitosamente!');
    console.log('\n📊 Resumen de datos creados:');
    console.log(`   - Obra: ${obraId}`);
    console.log(`   - Materiales: ${materialesCreados.length}`);
    console.log(`   - Stock: ${stockData.length} registros`);
    console.log(`   - Solicitudes de compra: ${solicitudesData.length}`);
    console.log(`   - Entradas: ${entradasData.length}`);
    console.log(`   - Salidas: ${salidasData.length}`);
    console.log(`   - Requerimientos: ${requerimientosData.length}`);
    console.log('\n💡 Ahora puedes probar el dashboard con datos reales.');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createTestData();