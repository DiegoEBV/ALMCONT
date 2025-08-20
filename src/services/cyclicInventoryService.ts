import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type CyclicCount = Database['public']['Tables']['conteos_ciclicos']['Row'];
type CountDetail = Database['public']['Tables']['detalle_conteos']['Row'];
type Material = Database['public']['Tables']['materiales']['Row'];

export interface CountSchedule {
  material_id: string;
  material_nombre: string;
  categoria: string;
  frecuencia_dias: number;
  ultima_fecha_conteo?: string;
  proxima_fecha_conteo: string;
  prioridad: 'alta' | 'media' | 'baja';
  ubicaciones: string[];
}

export interface CountTask {
  id: string;
  material_id: string;
  material_nombre: string;
  ubicaciones_asignadas: Array<{
    ubicacion_id: string;
    ubicacion_codigo: string;
    stock_teorico: number;
  }>;
  fecha_programada: string;
  estado: 'programado' | 'en_proceso' | 'completado' | 'cancelado';
  asignado_a?: string;
  prioridad: 'alta' | 'media' | 'baja';
}

export interface CountResult {
  material_id: string;
  ubicacion_id: string;
  stock_teorico: number;
  stock_fisico: number;
  diferencia: number;
  tipo_diferencia: 'faltante' | 'sobrante' | 'correcto';
  observaciones?: string;
}

export interface CountSummary {
  total_materiales: number;
  materiales_correctos: number;
  materiales_con_diferencias: number;
  valor_diferencias: number;
  diferencias_por_tipo: {
    faltantes: number;
    sobrantes: number;
  };
  ubicaciones_afectadas: number;
}

export class CyclicInventoryService {
  /**
   * Programa conteos cíclicos automáticamente basado en la clasificación ABC
   */
  static async scheduleAutomaticCounts(
    fechaInicio: string,
    fechaFin: string,
    opciones?: {
      incluir_categorias?: string[];
      excluir_materiales?: string[];
      solo_materiales_activos?: boolean;
    }
  ): Promise<{
    success: boolean;
    conteos_programados: number;
    cronograma: CountSchedule[];
    message: string;
  }> {
    try {
      // Obtener materiales para programar conteos
      let query = supabase
        .from('materiales')
        .select(`
          id,
          nombre,
          categoria,
          clasificacion_abc,
          stock_actual,
          precio_unitario,
          activo
        `);

      if (opciones?.solo_materiales_activos !== false) {
        query = query.eq('activo', true);
      }

      if (opciones?.incluir_categorias) {
        query = query.in('categoria', opciones.incluir_categorias);
      }

      if (opciones?.excluir_materiales) {
        query = query.not('id', 'in', `(${opciones.excluir_materiales.join(',')})`);;
      }

      const { data: materiales, error } = await query;

      if (error) {
        throw new Error(`Error al obtener materiales: ${error.message}`);
      }

      if (!materiales || materiales.length === 0) {
        return {
          success: true,
          conteos_programados: 0,
          cronograma: [],
          message: 'No se encontraron materiales para programar conteos'
        };
      }

      const cronograma: CountSchedule[] = [];
      const fechaInicioDate = new Date(fechaInicio);
      const fechaFinDate = new Date(fechaFin);
      const diasDisponibles = Math.ceil(
        (fechaFinDate.getTime() - fechaInicioDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Programar conteos basado en clasificación ABC
      for (const material of materiales) {
        const frecuencia = this.getFrecuenciaConteo(material.clasificacion_abc);
        const prioridad = this.getPrioridadConteo(material.clasificacion_abc, material.stock_actual * (material.precio_unitario || 0));
        
        // Calcular próxima fecha de conteo
        const proximaFecha = await this.calcularProximaFechaConteo(
          material.id,
          frecuencia,
          fechaInicioDate,
          fechaFinDate
        );

        if (proximaFecha) {
          // Obtener ubicaciones del material
          const ubicaciones = await this.getUbicacionesMaterial(material.id);

          cronograma.push({
            material_id: material.id,
            material_nombre: material.nombre,
            categoria: material.categoria,
            frecuencia_dias: frecuencia,
            proxima_fecha_conteo: proximaFecha.toISOString(),
            prioridad,
            ubicaciones
          });
        }
      }

      // Crear registros de conteos programados
      let conteosCreados = 0;
      for (const item of cronograma) {
        const conteoCreado = await this.createScheduledCount(item);
        if (conteoCreado) {
          conteosCreados++;
        }
      }

      return {
        success: true,
        conteos_programados: conteosCreados,
        cronograma,
        message: `Se programaron ${conteosCreados} conteos cíclicos exitosamente`
      };
    } catch (error) {
      console.error('Error scheduling automatic counts:', error);
      return {
        success: false,
        conteos_programados: 0,
        cronograma: [],
        message: `Error al programar conteos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Obtiene la frecuencia de conteo basada en clasificación ABC
   */
  private static getFrecuenciaConteo(clasificacionABC?: string): number {
    switch (clasificacionABC) {
      case 'A': return 30; // Cada 30 días
      case 'B': return 60; // Cada 60 días
      case 'C': return 90; // Cada 90 días
      default: return 60; // Por defecto cada 60 días
    }
  }

  /**
   * Determina la prioridad del conteo
   */
  private static getPrioridadConteo(
    clasificacionABC?: string,
    valorInventario?: number
  ): 'alta' | 'media' | 'baja' {
    if (clasificacionABC === 'A' || (valorInventario && valorInventario > 10000)) {
      return 'alta';
    } else if (clasificacionABC === 'B' || (valorInventario && valorInventario > 1000)) {
      return 'media';
    } else {
      return 'baja';
    }
  }

  /**
   * Calcula la próxima fecha de conteo para un material
   */
  private static async calcularProximaFechaConteo(
    materialId: string,
    frecuenciaDias: number,
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<Date | null> {
    try {
      // Obtener último conteo del material
      const { data: ultimoConteo } = await supabase
        .from('conteos_ciclicos')
        .select('fecha_programada, fecha_completado')
        .eq('material_id', materialId)
        .order('fecha_programada', { ascending: false })
        .limit(1)
        .single();

      let proximaFecha: Date;

      if (ultimoConteo) {
        // Calcular basado en último conteo
        const fechaUltimoConteo = new Date(
          ultimoConteo.fecha_completado || ultimoConteo.fecha_programada
        );
        proximaFecha = new Date(fechaUltimoConteo);
        proximaFecha.setDate(proximaFecha.getDate() + frecuenciaDias);
      } else {
        // Primer conteo, usar fecha de inicio
        proximaFecha = new Date(fechaInicio);
      }

      // Verificar que esté dentro del rango permitido
      if (proximaFecha < fechaInicio) {
        proximaFecha = fechaInicio;
      }

      if (proximaFecha > fechaFin) {
        return null; // No se puede programar en el período especificado
      }

      return proximaFecha;
    } catch (error) {
      console.error('Error calculating next count date:', error);
      return fechaInicio; // Fallback a fecha de inicio
    }
  }

  /**
   * Obtiene las ubicaciones donde se encuentra un material
   */
  private static async getUbicacionesMaterial(materialId: string): Promise<string[]> {
    try {
      const { data: stockUbicaciones } = await supabase
        .from('stock_ubicaciones')
        .select('ubicacion_id')
        .eq('material_id', materialId)
        .gt('cantidad', 0);

      return (stockUbicaciones || []).map(stock => stock.ubicacion_id);
    } catch (error) {
      console.error('Error getting material locations:', error);
      return [];
    }
  }

  /**
   * Crea un conteo programado
   */
  private static async createScheduledCount(schedule: CountSchedule): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conteos_ciclicos')
        .insert({
          material_id: schedule.material_id,
          fecha_programada: schedule.proxima_fecha_conteo,
          estado: 'programado',
          tipo_conteo: 'ciclico',
          prioridad: schedule.prioridad,
          ubicaciones_asignadas: schedule.ubicaciones,
          creado_por: 'sistema', // Se puede parametrizar
          observaciones: `Conteo automático programado - Frecuencia: ${schedule.frecuencia_dias} días`
        });

      return !error;
    } catch (error) {
      console.error('Error creating scheduled count:', error);
      return false;
    }
  }

  /**
   * Obtiene las tareas de conteo pendientes
   */
  static async getPendingCountTasks(
    filtros?: {
      asignado_a?: string;
      fecha_desde?: string;
      fecha_hasta?: string;
      prioridad?: string;
    }
  ): Promise<CountTask[]> {
    try {
      let query = supabase
        .from('conteos_ciclicos')
        .select(`
          id,
          material_id,
          fecha_programada,
          estado,
          asignado_a,
          prioridad,
          ubicaciones_asignadas,
          materiales(nombre)
        `)
        .in('estado', ['programado', 'en_proceso']);

      if (filtros?.asignado_a) {
        query = query.eq('asignado_a', filtros.asignado_a);
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_programada', filtros.fecha_desde);
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_programada', filtros.fecha_hasta);
      }

      if (filtros?.prioridad) {
        query = query.eq('prioridad', filtros.prioridad);
      }

      const { data: conteos, error } = await query
        .order('prioridad', { ascending: false })
        .order('fecha_programada', { ascending: true });

      if (error) {
        throw new Error(`Error al obtener tareas pendientes: ${error.message}`);
      }

      const tareas: CountTask[] = [];

      for (const conteo of conteos || []) {
        // Obtener información de ubicaciones y stock teórico
        const ubicacionesInfo = await this.getUbicacionesInfo(
          conteo.material_id,
          conteo.ubicaciones_asignadas || []
        );

        tareas.push({
          id: conteo.id,
          material_id: conteo.material_id,
          material_nombre: (conteo.materiales as any)?.nombre || 'Material desconocido',
          ubicaciones_asignadas: ubicacionesInfo,
          fecha_programada: conteo.fecha_programada,
          estado: conteo.estado as any,
          asignado_a: conteo.asignado_a,
          prioridad: conteo.prioridad as any
        });
      }

      return tareas;
    } catch (error) {
      console.error('Error getting pending count tasks:', error);
      throw error;
    }
  }

  /**
   * Obtiene información detallada de ubicaciones para un conteo
   */
  private static async getUbicacionesInfo(
    materialId: string,
    ubicacionIds: string[]
  ): Promise<Array<{
    ubicacion_id: string;
    ubicacion_codigo: string;
    stock_teorico: number;
  }>> {
    try {
      const { data: stockInfo, error } = await supabase
        .from('stock_ubicaciones')
        .select(`
          ubicacion_id,
          cantidad,
          ubicaciones(codigo)
        `)
        .eq('material_id', materialId)
        .in('ubicacion_id', ubicacionIds);

      if (error) {
        throw error;
      }

      return (stockInfo || []).map((stock: any) => ({
        ubicacion_id: stock.ubicacion_id,
        ubicacion_codigo: stock.ubicaciones?.codigo || 'Desconocida',
        stock_teorico: stock.cantidad
      }));
    } catch (error) {
      console.error('Error getting location info:', error);
      return [];
    }
  }

  /**
   * Inicia un conteo cíclico
   */
  static async startCount(
    conteoId: string,
    usuarioId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('conteos_ciclicos')
        .update({
          estado: 'en_proceso',
          asignado_a: usuarioId,
          fecha_inicio: new Date().toISOString()
        })
        .eq('id', conteoId)
        .eq('estado', 'programado');

      if (error) {
        throw new Error(`Error al iniciar conteo: ${error.message}`);
      }

      return {
        success: true,
        message: 'Conteo iniciado exitosamente'
      };
    } catch (error) {
      console.error('Error starting count:', error);
      return {
        success: false,
        message: `Error al iniciar conteo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Registra los resultados de un conteo
   */
  static async recordCountResults(
    conteoId: string,
    resultados: CountResult[],
    usuarioId: string,
    observacionesGenerales?: string
  ): Promise<{ success: boolean; message: string; resumen?: CountSummary }> {
    try {
      // Verificar que el conteo esté en proceso
      const { data: conteo, error: conteoError } = await supabase
        .from('conteos_ciclicos')
        .select('*')
        .eq('id', conteoId)
        .eq('estado', 'en_proceso')
        .single();

      if (conteoError || !conteo) {
        return {
          success: false,
          message: 'Conteo no encontrado o no está en proceso'
        };
      }

      // Registrar detalles del conteo
      const detallesConteo = resultados.map(resultado => ({
        conteo_id: conteoId,
        material_id: resultado.material_id,
        ubicacion_id: resultado.ubicacion_id,
        stock_teorico: resultado.stock_teorico,
        stock_fisico: resultado.stock_fisico,
        diferencia: resultado.diferencia,
        tipo_diferencia: resultado.tipo_diferencia,
        observaciones: resultado.observaciones,
        contado_por: usuarioId,
        fecha_conteo: new Date().toISOString()
      }));

      const { error: detallesError } = await supabase
        .from('detalle_conteos')
        .insert(detallesConteo);

      if (detallesError) {
        throw new Error(`Error al registrar detalles: ${detallesError.message}`);
      }

      // Calcular resumen
      const resumen = this.calcularResumenConteo(resultados);

      // Actualizar conteo como completado
      const { error: updateError } = await supabase
        .from('conteos_ciclicos')
        .update({
          estado: 'completado',
          fecha_completado: new Date().toISOString(),
          observaciones_finales: observacionesGenerales,
          resumen_diferencias: resumen
        })
        .eq('id', conteoId);

      if (updateError) {
        throw new Error(`Error al completar conteo: ${updateError.message}`);
      }

      // Procesar ajustes de inventario si hay diferencias
      await this.processInventoryAdjustments(resultados, usuarioId, conteoId);

      return {
        success: true,
        message: 'Conteo registrado exitosamente',
        resumen
      };
    } catch (error) {
      console.error('Error recording count results:', error);
      return {
        success: false,
        message: `Error al registrar conteo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Calcula el resumen de un conteo
   */
  private static calcularResumenConteo(resultados: CountResult[]): CountSummary {
    const totalMateriales = resultados.length;
    const materialesCorrectos = resultados.filter(r => r.tipo_diferencia === 'correcto').length;
    const materialesConDiferencias = totalMateriales - materialesCorrectos;
    
    const faltantes = resultados.filter(r => r.tipo_diferencia === 'faltante').length;
    const sobrantes = resultados.filter(r => r.tipo_diferencia === 'sobrante').length;
    
    const valorDiferencias = resultados.reduce((total, r) => {
      return total + Math.abs(r.diferencia);
    }, 0);

    const ubicacionesAfectadas = new Set(
      resultados.map(r => r.ubicacion_id)
    ).size;

    return {
      total_materiales: totalMateriales,
      materiales_correctos: materialesCorrectos,
      materiales_con_diferencias: materialesConDiferencias,
      valor_diferencias: valorDiferencias,
      diferencias_por_tipo: {
        faltantes,
        sobrantes
      },
      ubicaciones_afectadas: ubicacionesAfectadas
    };
  }

  /**
   * Procesa los ajustes de inventario basados en las diferencias encontradas
   */
  private static async processInventoryAdjustments(
    resultados: CountResult[],
    usuarioId: string,
    conteoId: string
  ): Promise<void> {
    try {
      const ajustesNecesarios = resultados.filter(
        r => r.tipo_diferencia !== 'correcto'
      );

      for (const ajuste of ajustesNecesarios) {
        // Actualizar stock en ubicación
        await supabase
          .from('stock_ubicaciones')
          .update({
            cantidad: ajuste.stock_fisico,
            fecha_actualizacion: new Date().toISOString(),
            actualizado_por: usuarioId
          })
          .eq('material_id', ajuste.material_id)
          .eq('ubicacion_id', ajuste.ubicacion_id);

        // Registrar movimiento de ajuste
        await supabase
          .from('movimientos_inventario')
          .insert({
            material_id: ajuste.material_id,
            ubicacion_id: ajuste.ubicacion_id,
            tipo_movimiento: 'ajuste_inventario',
            cantidad: ajuste.diferencia,
            usuario_id: usuarioId,
            referencia_documento: conteoId,
            observaciones: `Ajuste por conteo cíclico: ${ajuste.observaciones || 'Sin observaciones'}`,
            fecha: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error processing inventory adjustments:', error);
      // No lanzar error para no afectar el registro del conteo
    }
  }

  /**
   * Obtiene el historial de conteos cíclicos
   */
  static async getCountHistory(
    filtros?: {
      material_id?: string;
      fecha_desde?: string;
      fecha_hasta?: string;
      estado?: string;
    }
  ): Promise<Array<CyclicCount & { resumen?: CountSummary }>> {
    try {
      let query = supabase
        .from('conteos_ciclicos')
        .select(`
          *,
          materiales(nombre, categoria),
          usuarios(nombre)
        `);

      if (filtros?.material_id) {
        query = query.eq('material_id', filtros.material_id);
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_programada', filtros.fecha_desde);
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_programada', filtros.fecha_hasta);
      }

      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      const { data: conteos, error } = await query
        .order('fecha_programada', { ascending: false });

      if (error) {
        throw new Error(`Error al obtener historial: ${error.message}`);
      }

      return conteos || [];
    } catch (error) {
      console.error('Error getting count history:', error);
      throw error;
    }
  }
}