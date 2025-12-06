import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('YOUR_') || supabaseServiceKey.includes('YOUR_')) {
  console.error('❌ Error: Debes configurar las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  console.log('Ejemplo:');
  console.log('set SUPABASE_URL=https://tu-proyecto.supabase.co');
  console.log('set SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuración del log
const logFile = path.join(__dirname, 'migration_log.txt');
const reportFile = path.join(__dirname, 'migration_report.json');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

function generateNumeroSC() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const time = now.getTime().toString().slice(-6);
  return `SC${year}${month}${day}${time}`;
}

async function crearTablaRqSc() {
  try {
    log('🔧 Creando tabla rq_sc para relaciones...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS public.rq_sc (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rq_id UUID NOT NULL REFERENCES requerimientos(id) ON DELETE CASCADE,
        sc_id UUID NOT NULL REFERENCES solicitudes_compra(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(rq_id, sc_id)
      );
      
      -- Habilitar RLS
      ALTER TABLE public.rq_sc ENABLE ROW LEVEL SECURITY;
      
      -- Otorgar permisos
      GRANT SELECT ON rq_sc TO anon;
      GRANT ALL PRIVILEGES ON rq_sc TO authenticated;
      
      -- Crear políticas básicas
      CREATE POLICY IF NOT EXISTS "Usuarios pueden ver relaciones rq_sc" ON public.rq_sc
        FOR SELECT USING (true);
      
      CREATE POLICY IF NOT EXISTS "Usuarios autenticados pueden gestionar relaciones rq_sc" ON public.rq_sc
        FOR ALL WITH CHECK (auth.role() = 'authenticated');
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: createTableQuery });

    if (error) {
      // Si falla el RPC, intentamos crear directamente
      log('⚠️  Advertencia: No se pudo usar RPC, intentando crear tabla directamente...');

      const { error: createError } = await supabase
        .from('rq_sc')
        .select('id')
        .limit(1);

      if (createError && createError.code === '42P01') {
        log('❌ Error: La tabla rq_sc no existe y no se puede crear automáticamente.');
        log('💡 Solución: Ejecuta manualmente el siguiente SQL en tu base de datos:');
        console.log('\n' + createTableQuery + '\n');
        return false;
      }
    }

    log('✅ Tabla rq_sc verificada/creada correctamente');
    return true;
  } catch (error) {
    log(`❌ Error creando tabla rq_sc: ${error.message}`);
    return false;
  }
}

async function obtenerRequerimientosConSC() {
  try {
    log('🔍 Buscando requerimientos con solicitudes de compra...');

    const { data: requerimientos, error } = await supabase
      .from('requerimientos')
      .select('*')
      .not('numero_solicitud_compra', 'is', null)
      .neq('numero_solicitud_compra', '')
      .order('numero_solicitud_compra');

    if (error) {
      throw new Error(`Error consultando requerimientos: ${error.message}`);
    }

    log(`📊 Encontrados ${requerimientos.length} requerimientos con solicitudes de compra`);
    return requerimientos;
  } catch (error) {
    log(`❌ Error obteniendo requerimientos: ${error.message}`);
    throw error;
  }
}

function agruparPorSolicitudCompra(requerimientos) {
  log('📋 Agrupando requerimientos por número de solicitud de compra...');

  const grupos = {};

  requerimientos.forEach(req => {
    const numeroSC = req.numero_solicitud_compra.trim();

    if (!grupos[numeroSC]) {
      grupos[numeroSC] = {
        numero_solicitud_compra: numeroSC,
        requerimientos: [],
        proveedor: req.proveedor || null,
        fecha_solicitud: req.fecha_solicitud || new Date().toISOString().split('T')[0],
        total_estimado: 0,
        obra_id: null // Se determinará más adelante
      };
    }

    grupos[numeroSC].requerimientos.push(req);

    // Sumar subtotales
    if (req.subtotal && !isNaN(req.subtotal)) {
      grupos[numeroSC].total_estimado += parseFloat(req.subtotal);
    }

    // Usar el proveedor si no está definido
    if (!grupos[numeroSC].proveedor && req.proveedor) {
      grupos[numeroSC].proveedor = req.proveedor;
    }
  });

  const solicitudesUnicas = Object.values(grupos);
  log(`📈 Identificadas ${solicitudesUnicas.length} solicitudes de compra únicas`);

  return solicitudesUnicas;
}

async function obtenerObraDefault() {
  try {
    const { data: obras, error } = await supabase
      .from('obras')
      .select('id, nombre, codigo, estado')
      .eq('estado', 'ACTIVA')
      .limit(1);

    if (error || !obras || obras.length === 0) {
      log('⚠️  No se encontró obra activa, se requerirá crear una obra por defecto');
      return null;
    }

    log(`🏗️  Usando obra por defecto: ${obras[0].nombre} (${obras[0].codigo})`);
    return obras[0].id;
  } catch (error) {
    log(`❌ Error obteniendo obra por defecto: ${error.message}`);
    return null;
  }
}

async function obtenerUsuarioDefault() {
  try {
    const { data: usuarios, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido')
      .eq('activo', true)
      .limit(1);

    if (usuarioError) {
      console.error('❌ Error obteniendo usuario por defecto:', usuarioError);
      return null;
    }

    if (!usuarios || usuarios.length === 0) {
      log('⚠️  No se encontró usuario activo para asignar como creador');
      return null;
    }

    log(`👤 Usando usuario por defecto: ${usuarios[0].nombre} (${usuarios[0].email})`);
    return usuarios[0].id;
  } catch (error) {
    log(`❌ Error obteniendo usuario por defecto: ${error.message}`);
    return null;
  }
}

async function verificarSolicitudExiste(numeroSC) {
  try {
    const { data, error } = await supabase
      .from('solicitudes_compra')
      .select('id, numero_sc')
      .eq('numero_sc', numeroSC)
      .limit(1);

    if (error) {
      throw new Error(`Error verificando solicitud existente: ${error.message}`);
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    log(`Error verificando solicitud existente: ${error.message}`);
    return null;
  }
}

async function insertarSolicitudesCompra(solicitudesUnicas, obraDefaultId, usuarioDefaultId) {
  log('Insertando solicitudes de compra...');

  const solicitudesCreadas = [];
  const solicitudesExistentes = [];
  const errores = [];

  for (const solicitud of solicitudesUnicas) {
    try {
      // Verificar si ya existe
      const existente = await verificarSolicitudExiste(solicitud.numero_solicitud_compra);

      if (existente) {
        log(`⚠️  Solicitud ${solicitud.numero_solicitud_compra} ya existe, omitiendo...`);
        solicitudesExistentes.push({
          numero_original: solicitud.numero_solicitud_compra,
          id_existente: existente.id,
          requerimientos_count: solicitud.requerimientos.length
        });
        continue;
      }

      // Generar nuevo número SC si es necesario
      const numeroSC = generateNumeroSC();

      const nuevaSolicitud = {
        numero_sc: numeroSC,
        obra_id: obraDefaultId,
        fecha_solicitud: solicitud.fecha_solicitud,
        fecha_necesidad: solicitud.fecha_solicitud,
        proveedor_sugerido: solicitud.proveedor,
        justificacion: `Migrado desde requerimientos con número: ${solicitud.numero_solicitud_compra}`,
        estado: 'PENDIENTE',
        total_estimado: solicitud.total_estimado,
        observaciones: `Migración automática - ${solicitud.requerimientos.length} requerimientos asociados`,
        created_by: usuarioDefaultId
      };

      const { data: scCreada, error } = await supabase
        .from('solicitudes_compra')
        .insert([nuevaSolicitud])
        .select()
        .single();

      if (error) {
        throw new Error(`Error insertando solicitud: ${error.message}`);
      }

      log(`✅ Solicitud creada: ${numeroSC} (Original: ${solicitud.numero_solicitud_compra})`);

      solicitudesCreadas.push({
        ...scCreada,
        numero_original: solicitud.numero_solicitud_compra,
        requerimientos: solicitud.requerimientos
      });

    } catch (error) {
      log(`Error procesando solicitud ${solicitud.numero_solicitud_compra}: ${error.message}`);
      errores.push({
        numero_solicitud_compra: solicitud.numero_solicitud_compra,
        error: error.message,
        requerimientos_count: solicitud.requerimientos.length
      });
    }
  }

  return { solicitudesCreadas, solicitudesExistentes, errores };
}

async function crearRelacionesRqSc(solicitudesCreadas) {
  log('Creando relaciones entre requerimientos y solicitudes de compra...');

  const relacionesCreadas = [];
  const erroresRelaciones = [];

  for (const solicitud of solicitudesCreadas) {
    try {
      const relaciones = solicitud.requerimientos.map(req => ({
        rq_id: req.id,
        sc_id: solicitud.id
      }));

      const { data, error } = await supabase
        .from('rq_sc')
        .insert(relaciones)
        .select();

      if (error) {
        throw new Error(`Error creando relaciones: ${error.message}`);
      }

      log(`✅ Creadas ${relaciones.length} relaciones para SC: ${solicitud.numero_sc}`);
      relacionesCreadas.push(...(data || []));

    } catch (error) {
      log(`Error creando relaciones para SC ${solicitud.numero_sc}: ${error.message}`);
      erroresRelaciones.push({
        solicitud_id: solicitud.id,
        numero_sc: solicitud.numero_sc,
        error: error.message,
        requerimientos_count: solicitud.requerimientos.length
      });
    }
  }

  return { relacionesCreadas, erroresRelaciones };
}

function generarReporte(stats) {
  const reporte = {
    fecha_migracion: new Date().toISOString(),
    resumen: {
      requerimientos_procesados: stats.requerimientosTotal,
      solicitudes_unicas_identificadas: stats.solicitudesUnicas,
      solicitudes_creadas: stats.solicitudesCreadas.length,
      solicitudes_existentes: stats.solicitudesExistentes.length,
      relaciones_creadas: stats.relacionesCreadas.length,
      errores_solicitudes: stats.erroresSolicitudes.length,
      errores_relaciones: stats.erroresRelaciones.length
    },
    detalles: {
      solicitudes_creadas: stats.solicitudesCreadas.map(sc => ({
        id: sc.id,
        numero_sc: sc.numero_sc,
        numero_original: sc.numero_original,
        total_estimado: sc.total_estimado,
        requerimientos_asociados: sc.requerimientos.length
      })),
      solicitudes_existentes: stats.solicitudesExistentes,
      errores_solicitudes: stats.erroresSolicitudes,
      errores_relaciones: stats.erroresRelaciones
    }
  };

  // Guardar reporte en archivo JSON
  fs.writeFileSync(reportFile, JSON.stringify(reporte, null, 2));

  // Mostrar resumen en consola
  console.log('\n' + '='.repeat(60));
  console.log('REPORTE DE MIGRACIÓN');
  console.log('='.repeat(60));
  console.log(`Requerimientos procesados: ${reporte.resumen.requerimientos_procesados}`);
  console.log(`Solicitudes únicas identificadas: ${reporte.resumen.solicitudes_unicas_identificadas}`);
  console.log(`Solicitudes creadas: ${reporte.resumen.solicitudes_creadas}`);
  console.log(`Solicitudes ya existentes: ${reporte.resumen.solicitudes_existentes}`);
  console.log(`Relaciones creadas: ${reporte.resumen.relaciones_creadas}`);
  console.log(`Errores en solicitudes: ${reporte.resumen.errores_solicitudes}`);
  console.log(`Errores en relaciones: ${reporte.resumen.errores_relaciones}`);
  console.log('='.repeat(60));
  console.log(`Reporte detallado guardado en: ${reportFile}`);
  console.log(`Log completo guardado en: ${logFile}`);
  console.log('='.repeat(60) + '\n');

  return reporte;
}

async function ejecutarMigracion() {
  try {
    // Limpiar archivos de log anteriores
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }

    log('Iniciando migración de requerimientos a solicitudes de compra...');
    log('='.repeat(60));

    // Paso 1: Crear tabla rq_sc si no existe
    const tablaCreada = await crearTablaRqSc();
    if (!tablaCreada) {
      log('No se pudo crear/verificar la tabla rq_sc. Abortando migración.');
      return;
    }

    // Paso 2: Obtener requerimientos con solicitudes de compra
    const requerimientos = await obtenerRequerimientosConSC();

    if (requerimientos.length === 0) {
      log('No se encontraron requerimientos con solicitudes de compra para migrar.');
      return;
    }

    // Paso 3: Agrupar por solicitud de compra
    const solicitudesUnicas = agruparPorSolicitudCompra(requerimientos);

    // Paso 4: Obtener obra y usuario por defecto
    const obraDefaultId = await obtenerObraDefault();
    const usuarioDefaultId = await obtenerUsuarioDefault();

    if (!obraDefaultId || !usuarioDefaultId) {
      log('No se pudieron obtener obra y usuario por defecto. Abortando migración.');
      log('Asegúrate de tener al menos una obra y un usuario activos en la base de datos.');
      return;
    }

    // Paso 5: Insertar solicitudes de compra
    const { solicitudesCreadas, solicitudesExistentes, errores: erroresSolicitudes } =
      await insertarSolicitudesCompra(solicitudesUnicas, obraDefaultId, usuarioDefaultId);

    // Paso 6: Crear relaciones rq_sc
    const { relacionesCreadas, erroresRelaciones } = await crearRelacionesRqSc(solicitudesCreadas);

    // Paso 7: Generar reporte
    const stats = {
      requerimientosTotal: requerimientos.length,
      solicitudesUnicas: solicitudesUnicas.length,
      solicitudesCreadas,
      solicitudesExistentes,
      erroresSolicitudes,
      relacionesCreadas,
      erroresRelaciones
    };

    const reporte = generarReporte(stats);

    log('Migración completada exitosamente!');

    if (erroresSolicitudes.length > 0 || erroresRelaciones.length > 0) {
      log('Se encontraron algunos errores durante la migración. Revisa el reporte detallado.');
    }

  } catch (error) {
    log(`Error fatal durante la migración: ${error.message}`);
    console.error('Stack trace:', error.stack);
  }
}

// Ejecutar migración automáticamente
ejecutarMigracion()
  .then(() => {
    log('Proceso de migración finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    log(`Error ejecutando migración: ${error.message}`);
    process.exit(1);
  });

export {
  ejecutarMigracion,
  obtenerRequerimientosConSC,
  agruparPorSolicitudCompra,
  insertarSolicitudesCompra,
  crearRelacionesRqSc,
  generarReporte
};