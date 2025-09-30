import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función de logging
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  // Escribir al archivo de log
  const logFile = path.join(__dirname, 'relations_completion_log.txt');
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Función para crear las relaciones faltantes
async function completarRelaciones() {
  try {
    log('🚀 Iniciando completado de relaciones rq_sc...');
    log('============================================================');
    
    // Leer el reporte de migración para obtener las solicitudes creadas
    const reportPath = path.join(__dirname, 'migration_report.json');
    if (!fs.existsSync(reportPath)) {
      log('❌ No se encontró el archivo migration_report.json');
      return;
    }
    
    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const solicitudesCreadas = reportData.detalles.solicitudes_creadas;
    
    log(`📋 Procesando ${solicitudesCreadas.length} solicitudes de compra...`);
    
    let relacionesCreadas = 0;
    let errores = 0;
    
    for (const solicitud of solicitudesCreadas) {
      try {
        log(`🔗 Procesando solicitud ${solicitud.numero_original} (${solicitud.numero_sc})...`);
        
        // Obtener los requerimientos que corresponden a esta solicitud
        const { data: requerimientos, error: reqError } = await supabase
          .from('requerimientos')
          .select('id')
          .eq('numero_solicitud_compra', solicitud.numero_original);
        
        if (reqError) {
          log(`❌ Error obteniendo requerimientos para ${solicitud.numero_original}: ${reqError.message}`);
          errores++;
          continue;
        }
        
        if (!requerimientos || requerimientos.length === 0) {
          log(`⚠️  No se encontraron requerimientos para ${solicitud.numero_original}`);
          continue;
        }
        
        log(`📊 Encontrados ${requerimientos.length} requerimientos para ${solicitud.numero_original}`);
        
        // Crear las relaciones
        for (const req of requerimientos) {
          try {
            const { error: insertError } = await supabase
              .from('rq_sc')
              .insert({
                requerimiento_id: req.id,
                solicitud_compra_id: solicitud.id
              });
            
            if (insertError) {
              // Si es error de duplicado, lo ignoramos
              if (insertError.code === '23505') {
                log(`ℹ️  Relación ya existe para requerimiento ${req.id}`);
              } else {
                log(`❌ Error creando relación: ${insertError.message}`);
                errores++;
              }
            } else {
              relacionesCreadas++;
            }
          } catch (error) {
            log(`❌ Error inesperado creando relación: ${error.message}`);
            errores++;
          }
        }
        
        log(`✅ Completadas relaciones para ${solicitud.numero_original}`);
        
      } catch (error) {
        log(`❌ Error procesando solicitud ${solicitud.numero_original}: ${error.message}`);
        errores++;
      }
    }
    
    // Generar reporte final
    const reporteFinal = {
      fecha_completado: new Date().toISOString(),
      solicitudes_procesadas: solicitudesCreadas.length,
      relaciones_creadas: relacionesCreadas,
      errores: errores
    };
    
    // Guardar reporte
    const reporteFile = path.join(__dirname, 'relations_completion_report.json');
    fs.writeFileSync(reporteFile, JSON.stringify(reporteFinal, null, 2));
    
    log('============================================================');
    log('📊 REPORTE DE COMPLETADO DE RELACIONES');
    log('============================================================');
    log(`📋 Solicitudes procesadas: ${reporteFinal.solicitudes_procesadas}`);
    log(`🔗 Relaciones creadas: ${reporteFinal.relaciones_creadas}`);
    log(`❌ Errores: ${reporteFinal.errores}`);
    log('============================================================');
    log(`📄 Reporte detallado guardado en: ${reporteFile}`);
    log(`📝 Log completo guardado en: ${path.join(__dirname, 'relations_completion_log.txt')}`);
    log('============================================================');
    
    if (errores === 0) {
      log('🎉 Completado de relaciones exitoso!');
    } else {
      log('⚠️  Se encontraron algunos errores durante el completado. Revisa el reporte detallado.');
    }
    
    log('🏁 Proceso de completado de relaciones finalizado.');
    
  } catch (error) {
    log(`❌ Error fatal durante el completado de relaciones: ${error.message}`);
    console.error(error);
  }
}

// Ejecutar el completado
completarRelaciones();

export { completarRelaciones };