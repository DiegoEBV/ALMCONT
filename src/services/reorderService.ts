import { supabase, setSupabaseUserContext } from '../lib/supabase';
import { localAuth } from './localAuth';
import { mapLocalIdToUUID } from '../utils/idMapper';
import { Material } from '../types';

export interface ReorderAlert {
  material_id: string;
  material_nombre: string;
  stock_actual: number;
  punto_reorden: number;
  cantidad_sugerida: number;
  proveedor_sugerido?: string;
  urgencia: 'baja' | 'media' | 'alta' | 'critica';
}

export interface AutoReorderResult {
  success: boolean;
  solicitudes_creadas: number;
  alertas_generadas: number;
  errores: string[];
  detalles: {
    solicitudes: string[];
    alertas: ReorderAlert[];
  };
}

export class ReorderService {
  private static async ensureContext(): Promise<void> {
    const current = localAuth.getCurrentUser()
    if (current) {
      const uuid = await mapLocalIdToUUID(current.id, 'usuario')
      if (uuid) await setSupabaseUserContext(uuid)
    }
  }
  /**
   * Verifica todos los materiales que requieren reorden
   */
  static async checkReorderPoints(): Promise<ReorderAlert[]> {
    try {
      await this.ensureContext()
      // Usar la vista creada en la migración para obtener materiales que requieren reorden
      const { data: materialsToReorder, error } = await supabase
        .from('materiales_requieren_reorden')
        .select('*');

      if (error) {
        throw new Error(`Error al verificar puntos de reorden: ${error.message}`);
      }

      if (!materialsToReorder || materialsToReorder.length === 0) {
        return [];
      }

      const alerts: ReorderAlert[] = [];

      for (const material of materialsToReorder) {
        // Calcular cantidad sugerida y urgencia
        const alert = await this.calculateReorderSuggestion(material);
        alerts.push(alert);
      }

      return alerts.sort((a, b) => {
        const urgencyOrder = { 'critica': 4, 'alta': 3, 'media': 2, 'baja': 1 };
        return urgencyOrder[b.urgencia] - urgencyOrder[a.urgencia];
      });
    } catch (error) {
      console.error('Error checking reorder points:', error);
      throw error;
    }
  }

  /**
   * Calcula la sugerencia de reorden para un material específico
   */
  private static async calculateReorderSuggestion(material: unknown): Promise<ReorderAlert> {
    try {
      await this.ensureContext()
      const isRow = (x: unknown): x is {
        id: string
        nombre: string
        stock_actual: number
        punto_reorden: number
        stock_minimo?: number
        proveedor_preferido?: string
        cantidad_maxima?: number
      } => typeof x === 'object' && x !== null && 'id' in x && 'punto_reorden' in x && 'stock_actual' in x && 'nombre' in x

      if (!isRow(material)) {
        throw new Error('Registro de material inválido')
      }

      // Obtener configuración de reorden para el material
      const { data: config } = await supabase
        .from('configuracion_reorden')
        .select('*')
        .eq('material_id', material.id)
        .eq('activa', true)
        .single();

      // Calcular cantidad sugerida basada en diferentes factores
      let cantidadSugerida = material.cantidad_maxima || (material.punto_reorden * 2);

      if (config) {
        // Usar configuración específica si existe
        cantidadSugerida = config.cantidad_reorden || cantidadSugerida;

        // Ajustar por consumo histórico si está configurado
        if ((config as Record<string, unknown>)?.considerar_consumo_historico) {
          const consumoPromedio = await this.calculateAverageConsumption(
            material.id,
            Number((config as Record<string, unknown>)?.dias_consumo_historico) || 30
          );
          
          if (consumoPromedio > 0) {
            const diasCobertura = Number((config as Record<string, unknown>)?.dias_cobertura_deseada) || 30;
            cantidadSugerida = Math.max(cantidadSugerida, consumoPromedio * diasCobertura);
          }
        }

        // Ajustar por estacionalidad si está configurado
        if ((config as Record<string, unknown>)?.ajuste_estacional) {
          const factorEstacional = await this.getSeasonalFactor(material.id);
          cantidadSugerida = Math.round(cantidadSugerida * factorEstacional);
        }
      }

      // Determinar urgencia basada en el nivel de stock
      const urgencia = this.determineUrgency(
        material.stock_actual,
        material.punto_reorden,
        material.stock_minimo || 0
      );

      return {
        material_id: material.id,
        material_nombre: material.nombre,
        stock_actual: material.stock_actual,
        punto_reorden: material.punto_reorden,
        cantidad_sugerida: cantidadSugerida,
        proveedor_sugerido: material.proveedor_preferido,
        urgencia
      };
    } catch (error) {
      console.error('Error calculating reorder suggestion:', error);
      // Retornar sugerencia básica en caso de error
      const fallback = material as Record<string, unknown>;
      return {
        material_id: String(fallback.id || ''),
        material_nombre: String(fallback.nombre || 'Material'),
        stock_actual: Number(fallback.stock_actual || 0),
        punto_reorden: Number(fallback.punto_reorden || 0),
        cantidad_sugerida: Number(fallback.punto_reorden || 0) * 2,
        urgencia: 'media'
      };
    }
  }

  /**
   * Calcula el consumo promedio de un material en un período específico
   */
  private static async calculateAverageConsumption(
    materialId: string,
    days: number
  ): Promise<number> {
    try {
      await this.ensureContext()
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - days);

      const { data: salidas, error } = await supabase
        .from('salidas')
        .select('cantidad')
        .eq('material_id', materialId)
        .gte('fecha', fechaInicio.toISOString())
        .eq('estado', 'completada');

      if (error || !salidas) {
        return 0;
      }

      const totalConsumo = salidas.reduce((sum, salida) => sum + salida.cantidad, 0);
      return totalConsumo / days;
    } catch (error) {
      console.error('Error calculating average consumption:', error);
      return 0;
    }
  }

  /**
   * Obtiene el factor estacional para un material
   */
  private static async getSeasonalFactor(materialId: string): Promise<number> {
    try {
      await this.ensureContext()
      const mesActual = new Date().getMonth() + 1;
      
      // Obtener configuración estacional
      const { data: config } = await supabase
        .from('configuracion_reorden')
        .select('ajuste_estacional')
        .eq('material_id', materialId)
        .single();

      if (config && typeof (config as Record<string, unknown>).ajuste_estacional === 'object') {
        const ajustes = (config as Record<string, any>).ajuste_estacional as Record<string, number>;
        const key = `mes_${mesActual}`;
        return typeof ajustes[key] === 'number' ? ajustes[key] : 1.0;
      }

      return 1.0;
    } catch (error) {
      console.error('Error getting seasonal factor:', error);
      return 1.0;
    }
  }

  /**
   * Determina la urgencia basada en los niveles de stock
   */
  private static determineUrgency(
    stockActual: number,
    puntoReorden: number,
    stockMinimo: number
  ): 'baja' | 'media' | 'alta' | 'critica' {
    if (stockActual <= stockMinimo) {
      return 'critica';
    } else if (stockActual <= stockMinimo * 1.5) {
      return 'alta';
    } else if (stockActual <= puntoReorden * 0.8) {
      return 'media';
    } else {
      return 'baja';
    }
  }

  /**
   * Ejecuta el proceso de reorden automático
   */
  static async executeAutoReorder(
    userId: string,
    options?: {
      solo_alertas?: boolean;
      materiales_especificos?: string[];
      proveedor_preferido?: string;
    }
  ): Promise<AutoReorderResult> {
    try {
      const result: AutoReorderResult = {
        success: true,
        solicitudes_creadas: 0,
        alertas_generadas: 0,
        errores: [],
        detalles: {
          solicitudes: [],
          alertas: []
        }
      };

      // Obtener alertas de reorden
      let alerts: ReorderAlert[] = [];

      // Si se especifican materiales, construir alertas SOLO para esos materiales
      if (options?.materiales_especificos && options.materiales_especificos.length > 0) {
        const { data: mats, error: matsError } = await supabase
          .from('materiales_requieren_reorden')
          .select('*')
          .in('id', options.materiales_especificos);
        if (matsError) throw matsError;
        const computed = await Promise.all((mats || []).map(m => this.calculateReorderSuggestion(m)));
        alerts = computed;
      } else {
        alerts = await this.checkReorderPoints();
      }

      result.alertas_generadas = alerts.length;
      result.detalles.alertas = alerts;

      // Si solo se requieren alertas, retornar aquí
      if (options?.solo_alertas) {
        return result;
      }

      // Procesar cada alerta para crear solicitudes automáticas
      for (const alert of alerts) {
        try {
          // Verificar si ya existe una solicitud pendiente para este material
          const existingSolicitud = await this.checkExistingPurchaseRequest(alert.material_id);
          
          if (existingSolicitud) {
            result.errores.push(
              `Material ${alert.material_nombre}: Ya existe solicitud pendiente`
            );
            continue;
          }

          // Crear solicitud de compra automática
          const solicitudId = await this.createAutoPurchaseRequest(alert, userId, options);
          
          if (solicitudId) {
            result.solicitudes_creadas++;
            result.detalles.solicitudes.push(
              `Solicitud ${solicitudId} creada para ${alert.material_nombre}`
            );
          }
        } catch (error) {
          result.errores.push(
            `Error procesando ${alert.material_nombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`
          );
        }
      }

      return result;
    } catch (error) {
      console.error('Error executing auto reorder:', error);
      return {
        success: false,
        solicitudes_creadas: 0,
        alertas_generadas: 0,
        errores: [`Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`],
        detalles: {
          solicitudes: [],
          alertas: []
        }
      };
    }
  }

  /**
   * Verifica si ya existe una solicitud de compra pendiente para un material
   */
  private static async checkExistingPurchaseRequest(materialId: string): Promise<boolean> {
    try {
      const { data: solicitudes, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          id,
          solicitud_compra_items!inner(material_id)
        `)
        .eq('solicitud_compra_items.material_id', materialId)
        .in('estado', ['PENDIENTE', 'APROBADO', 'ENVIADO'])
        .limit(1);

      if (error) {
        throw error;
      }

      return (solicitudes && solicitudes.length > 0);
    } catch (error) {
      console.error('Error checking existing purchase request:', error);
      return false;
    }
  }

  /**
   * Crea una solicitud de compra automática
   */
  private static async createAutoPurchaseRequest(
    alert: ReorderAlert,
    userId: string,
    options?: any
  ): Promise<string | null> {
    try {
      // Obtener información del material
      const { data: material, error: materialError } = await supabase
        .from('materiales')
        .select('precio_unitario, unidad_medida, categoria')
        .eq('id', alert.material_id)
        .single();

      if (materialError || !material) {
        throw new Error('No se pudo obtener información del material');
      }

      // Calcular costo total estimado
      const costoTotal = (material.precio_unitario || 0) * alert.cantidad_sugerida;

      // Generar número de solicitud de compra
      const numeroSC = `SC-${Date.now()}`;
      
      // Obtener obra_id del usuario
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('obra_id')
        .eq('id', userId)
        .single();

      if (userError || !userData?.obra_id) {
        throw new Error('No se pudo obtener la obra asignada del usuario');
      }
      
      // Crear solicitud de compra
      const { data: solicitud, error } = await supabase
        .from('solicitudes_compra')
        .insert({
          numero_sc: numeroSC,
          obra_id: userData.obra_id,
          fecha_solicitud: new Date().toISOString().split('T')[0],
          fecha_necesidad: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 días después
          proveedor_sugerido: options?.proveedor_preferido || alert.proveedor_sugerido,
          justificacion: `Solicitud automática generada por punto de reorden. Stock actual: ${alert.stock_actual}, Punto de reorden: ${alert.punto_reorden}`,
          estado: 'PENDIENTE',
          total_estimado: costoTotal,
          created_by: userId,
          generada_automaticamente: true
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Error al crear solicitud: ${error.message}`);
      }

      // Crear el item de la solicitud de compra
      const { error: itemError } = await supabase
        .from('solicitud_compra_items')
        .insert({
          solicitud_compra_id: solicitud.id,
          material_id: alert.material_id,
          cantidad: alert.cantidad_sugerida,
          precio_unitario: material.precio_unitario,
          precio_total: costoTotal,
          especificaciones: `Reorden automático - Urgencia: ${alert.urgencia}`
        });

      if (itemError) {
        throw new Error(`Error al crear item de solicitud: ${itemError.message}`);
      }

      return solicitud.id;
    } catch (error) {
      console.error('Error creating auto purchase request:', error);
      throw error;
    }
  }

  /**
   * Configura los parámetros de reorden para un material
   */
  static async configureReorderParameters(
    materialId: string,
    config: {
      cantidad_reorden?: number;
      dias_cobertura_deseada?: number;
      considerar_consumo_historico?: boolean;
      dias_consumo_historico?: number;
      ajuste_estacional?: Record<string, number>;
      proveedor_preferido?: string;
      activa?: boolean;
    },
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar si ya existe configuración
      const { data: existingConfig } = await supabase
        .from('configuracion_reorden')
        .select('id')
        .eq('material_id', materialId)
        .single();

      const configData = {
        material_id: materialId,
        ...config,
        actualizado_por: userId,
        fecha_actualizacion: new Date().toISOString()
      };

      let result;
      if (existingConfig) {
        // Actualizar configuración existente
        result = await supabase
          .from('configuracion_reorden')
          .update(configData)
          .eq('id', existingConfig.id);
      } else {
        // Crear nueva configuración
        result = await supabase
          .from('configuracion_reorden')
          .insert({
            ...configData,
            creado_por: userId,
            fecha_creacion: new Date().toISOString()
          });
      }

      if (result.error) {
        throw new Error(`Error al configurar parámetros: ${result.error.message}`);
      }

      return {
        success: true,
        message: 'Configuración de reorden actualizada exitosamente'
      };
    } catch (error) {
      console.error('Error configuring reorder parameters:', error);
      return {
        success: false,
        message: `Error al configurar parámetros: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Obtiene el reporte de reorden para análisis
   */
  static async getReorderReport(
    filters?: {
      fecha_desde?: string;
      fecha_hasta?: string;
      categoria?: string;
      urgencia?: string;
    }
  ): Promise<{
    alertas_activas: ReorderAlert[];
    solicitudes_automaticas: any[];
    estadisticas: {
      total_materiales_monitoreados: number;
      materiales_requieren_reorden: number;
      solicitudes_pendientes: number;
      ahorro_estimado: number;
    };
  }> {
    try {
      // Obtener alertas activas
      const alertas = await this.checkReorderPoints();

      // Obtener solicitudes automáticas
      let solicitudesQuery = supabase
        .from('solicitudes_compra')
        .select(`
          *,
          materiales(nombre, categoria)
        `)
        .eq('tipo', 'automatica');

      if (filters?.fecha_desde) {
        solicitudesQuery = solicitudesQuery.gte('fecha_solicitud', filters.fecha_desde);
      }

      if (filters?.fecha_hasta) {
        solicitudesQuery = solicitudesQuery.lte('fecha_solicitud', filters.fecha_hasta);
      }

      const { data: solicitudes } = await solicitudesQuery;

      // Calcular estadísticas
      const { data: totalMateriales } = await supabase
        .from('materiales')
        .select('id', { count: 'exact' })
        .not('punto_reorden', 'is', null);

      const { data: solicitudesPendientes } = await supabase
        .from('solicitudes_compra')
        .select('id', { count: 'exact' })
        .eq('tipo', 'automatica')
        .in('estado', ['pendiente', 'en_proceso']);

      return {
        alertas_activas: alertas,
        solicitudes_automaticas: solicitudes || [],
        estadisticas: {
          total_materiales_monitoreados: totalMateriales?.length || 0,
          materiales_requieren_reorden: alertas.length,
          solicitudes_pendientes: solicitudesPendientes?.length || 0,
          ahorro_estimado: 0 // Calcular basado en eficiencias
        }
      };
    } catch (error) {
      console.error('Error getting reorder report:', error);
      throw error;
    }
  }
}
