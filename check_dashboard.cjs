const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');

// Configuración de Supabase
const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🚀 Iniciando diagnóstico de la aplicación...');
  
  // Verificar datos básicos
  const { data: usuarios, error: usuariosError } = await supabase
    .from('usuarios')
    .select('*');

  if (usuariosError) {
    console.error('❌ Error al consultar usuarios:', usuariosError);
  } else {
    console.log(`✅ Usuarios encontrados: ${usuarios?.length || 0}`);
    if (usuarios?.length > 0) {
      console.log('   Usuarios disponibles:', usuarios.map(u => `${u.nombre} ${u.apellido} (${u.rol})`));
    }
  }

  const { data: obras, error: obrasError } = await supabase
    .from('obras')
    .select('*');

  if (obrasError) {
    console.error('❌ Error al consultar obras:', obrasError);
  } else {
    console.log(`✅ Obras encontradas: ${obras?.length || 0}`);
    if (obras?.length > 0) {
      console.log('   Obras disponibles:', obras.map(o => `${o.codigo} - ${o.nombre} (${o.estado})`));
    }
  }

  const { data: materiales, error: materialesError } = await supabase
    .from('materiales')
    .select('*');

  if (materialesError) {
    console.error('❌ Error al consultar materiales:', materialesError);
  } else {
    console.log(`✅ Materiales encontrados: ${materiales?.length || 0}`);
    if (materiales?.length > 0) {
      console.log('   Primeros 3 materiales:', materiales.slice(0, 3).map(m => `${m.codigo} - ${m.nombre}`));
    }
  }

  // Verificar datos del dashboard
  console.log('\n📊 Verificando datos del dashboard...');

  // Simular las consultas que hace el dashboard
  const { data: solicitudesCompra, error: scError } = await supabase
    .from('solicitudes_compra')
    .select('*');

  if (scError) {
    console.error('❌ Error al consultar solicitudes de compra:', scError);
  } else {
    console.log(`✅ Solicitudes de compra: ${solicitudesCompra?.length || 0}`);
    if (solicitudesCompra?.length > 0) {
      const estados = solicitudesCompra.reduce((acc, sc) => {
        acc[sc.estado] = (acc[sc.estado] || 0) + 1;
        return acc;
      }, {});
      console.log('   Estados:', estados);
    }
  }

  const { data: entradas, error: entradasError } = await supabase
    .from('entradas')
    .select('*');

  if (entradasError) {
    console.error('❌ Error al consultar entradas:', entradasError);
  } else {
    console.log(`✅ Entradas: ${entradas?.length || 0}`);
    if (entradas?.length > 0) {
      const estados = entradas.reduce((acc, e) => {
        acc[e.estado] = (acc[e.estado] || 0) + 1;
        return acc;
      }, {});
      console.log('   Estados:', estados);
    }
  }

  const { data: salidas, error: salidasError } = await supabase
    .from('salidas')
    .select('*');

  if (salidasError) {
    console.error('❌ Error al consultar salidas:', salidasError);
  } else {
    console.log(`✅ Salidas: ${salidas?.length || 0}`);
    if (salidas?.length > 0) {
      const estados = salidas.reduce((acc, s) => {
        acc[s.estado] = (acc[s.estado] || 0) + 1;
        return acc;
      }, {});
      console.log('   Estados:', estados);
    }
  }

  const { data: stock, error: stockError } = await supabase
    .from('stock_obra_material')
    .select('*');

  if (stockError) {
    console.error('❌ Error al consultar stock:', stockError);
  } else {
    console.log(`✅ Stock: ${stock?.length || 0}`);
    if (stock?.length > 0) {
      const totalStock = stock.reduce((sum, s) => sum + (parseFloat(s.stock_actual) || 0), 0);
      console.log(`   Stock total: ${totalStock}`);
      console.log('   Primeros 3 registros de stock:', stock.slice(0, 3).map(s => 
        `Stock actual: ${s.stock_actual}, Disponible: ${s.stock_disponible}`
      ));
    }
  }

  // Verificar métricas específicas del dashboard
  console.log('\n📈 Verificando métricas del dashboard...');

  // Total de solicitudes pendientes
  const { count: solicitudesPendientes } = await supabase
    .from('solicitudes_compra')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'PENDIENTE');

  console.log(`📋 Solicitudes pendientes: ${solicitudesPendientes || 0}`);

  // Total de materiales
  const { count: totalMateriales } = await supabase
    .from('materiales')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true);

  console.log(`📦 Total materiales activos: ${totalMateriales || 0}`);

  // Valor total del inventario
  const { data: inventario } = await supabase
    .from('stock_obra_material')
    .select('stock_actual, costo_promedio, valor_total');

  const valorInventario = inventario?.reduce((total, item) => {
    return total + (parseFloat(item.valor_total) || 0);
  }, 0) || 0;

  console.log(`💰 Valor inventario: S/ ${valorInventario.toFixed(2)}`);

  // Alertas de stock bajo
  const { data: stockBajo } = await supabase
    .from('stock_obra_material')
    .select('stock_actual, stock_minimo')
    .gt('stock_minimo', 0);

  const alertasStock = stockBajo?.filter(item => 
    parseFloat(item.stock_actual) <= parseFloat(item.stock_minimo)
  ).length || 0;

  console.log(`⚠️ Alertas stock bajo: ${alertasStock}`);

  // Verificar requerimientos de materiales
  const { count: requerimientosPendientes } = await supabase
    .from('requerimiento_materiales')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'PENDIENTE');

  console.log(`📝 Requerimientos pendientes: ${requerimientosPendientes || 0}`);

  // Verificar datos recientes
  console.log('\n📅 Verificando actividad reciente...');

  const fechaHoy = new Date().toISOString().split('T')[0];
  const fechaSemana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Entradas de esta semana
  const { count: entradasSemana } = await supabase
    .from('entradas')
    .select('*', { count: 'exact', head: true })
    .gte('fecha_entrada', fechaSemana);

  console.log(`📥 Entradas esta semana: ${entradasSemana || 0}`);

  // Salidas de esta semana
  const { count: salidasSemana } = await supabase
    .from('salidas')
    .select('*', { count: 'exact', head: true })
    .gte('fecha_salida', fechaSemana);

  console.log(`📤 Salidas esta semana: ${salidasSemana || 0}`);

  // Solicitudes de compra de hoy
  const { count: solicitudesHoy } = await supabase
    .from('solicitudes_compra')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', fechaHoy);

  console.log(`🆕 Solicitudes creadas hoy: ${solicitudesHoy || 0}`);

  console.log('\n🔍 Diagnóstico completado. Revisa los logs del navegador para más detalles.');
  console.log('\n💡 Sugerencias:');
  console.log('   - Si todos los valores son 0, verifica que haya datos de prueba en las tablas');
  console.log('   - Si hay errores de permisos, revisa las políticas RLS en Supabase');
  console.log('   - Si el usuario no está autenticado, verifica el login en la aplicación');

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Navegar a la aplicación
  await page.goto('http://localhost:5173');
  
  // Esperar un momento para que cargue
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Obtener el título de la página
  const title = await page.title();
  console.log('Título de la página:', title);
  
  // Obtener el contenido del body
  const bodyText = await page.evaluate(() => {
    return document.body.innerText;
  });
  console.log('Contenido de la página:');
  console.log(bodyText.substring(0, 500)); // Primeros 500 caracteres
  
  // Verificar si hay elementos de login
  const loginElements = await page.$$('input[type="email"], input[type="password"]');
  console.log('Elementos de login encontrados:', loginElements.length);
  
  // Verificar si hay elementos del dashboard
  const dashboardElements = await page.$$('h1');
  const h1Texts = await Promise.all(dashboardElements.map(el => 
    page.evaluate(element => element.textContent, el)
  ));
  console.log('Títulos H1 encontrados:', h1Texts);
  
  // Mantener el navegador abierto por 10 segundos
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  await browser.close();
})();