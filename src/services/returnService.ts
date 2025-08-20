import { supabase } from '../lib/supabase';
import { Return } from '../types';

export interface ReturnRequest {
  tipo_devolucion: 'cliente' | 'proveedor' | 'interna';
  documento_origen_id?: string;
  documento_origen_tipo?: 'venta' | 'compra' | 'salida';
  motivo: string;
  observaciones?: string;
  detalles: Array<{
    material_id: string;
    cantidad: number;
    precio_unitario?: number;
    motivo_detalle?: string;
    ubicacion_origen?: string;
    ubicacion_destino?: string;
  }>;
  solicitado_por: string;
  fecha_solicitud?: string;
}

export interface ReturnValidation {
  material_id: string;
  cantidad_solicitada: number;
  cantidad_disponible: number;
  es_valida: boolean;
  motivo_rechazo?: string;
  restricciones?: string[];
}

export interface ReturnProcessResult {
  success: boolean;
  devolucion_id?: string;
  validaciones: ReturnValidation[];
  movimientos_creados: number;
  valor_total: number;
  message: string;
}

export interface ReturnSummary {
  total_devoluciones: number;
  valor_total: number;
  devoluciones_por_tipo: {
    cliente: number;
    proveedor: number;
    interna: number;
  };
  devoluciones_por_estado: {
    pendiente: number;
    aprobada: number;
    procesada: number;
    rechazada: number;
    cancelada: number;
  };
  materiales_mas_devueltos: Array<{
    material_id: string;
    material_nombre: string;
    cantidad_total: number;
    valor_total: number;
  }>;
}

export class ReturnService {
  /**
   * Crea una nueva solicitud de devolución
   */
  static async createReturnRequest(
    request: ReturnRequest
  ): Promise<ReturnProcessResult> {
    try {
      // Validar detalles de la devolución
      const validaciones = await this.validateReturnDetails(request.detalles);
      const validacionesFallidas = validaciones.filter(v => !v.es_valida);

      if (validacionesFallidas.length > 0) {
        return {
          success: false,
          validaciones,
          movimientos_creados: 0,
          valor_total: 0,
          message: `Validación fallida para ${validacionesFallidas.length} materiales`
        };
      }

      // Generar código de devolución
      const codigoDevolucion = await this.generateReturnCode(request.tipo_devolucion);

      // Calcular valor total
      const valorTotal = await this.calculateReturnValue(request.detalles);

      // Crear registro de devolución
      const { data: devolucion, error: devolucionError } = await supabase
        .from('devoluciones')
        .insert({
          codigo: codigoDevolucion,
          tipo_devolucion: request.tipo_devolucion,
          documento_origen_id: request.documento_origen_id,
          documento_origen_tipo: request.documento_origen_tipo,
          motivo: request.motivo,
          observaciones: request.observaciones,
          estado: 'pendiente',
          solicitado_por: request.solicitado_por,
          fecha_solicitud: request.fecha_solicitud || new Date().toISOString(),
          valor_total: valorTotal
        })
        .select()
        .single();

      if (devolucionError) {
        throw new Error(`Error al crear devolución: ${devolucionError.message}`);
      }

      // Crear detalles de devolución
      const detallesDevolucion = request.detalles.map(detalle => ({
        devolucion_id: devolucion.id,
        material_id: detalle.material_id,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario || 0,
        subtotal: detalle.cantidad * (detalle.precio_unitario || 0),
        motivo_detalle: detalle.motivo_detalle,
        ubicacion_origen: detalle.ubicacion_origen,
        ubicacion_destino: detalle.ubicacion_destino,
        estado_detalle: 'pendiente'
      }));

      const { error: detallesError } = await supabase
        .from('detalle_devoluciones')
        .insert(detallesDevolucion);

      if (detallesError) {
        throw new Error(`Error al crear detalles: ${detallesError.message}`);
      }

      // Si es devolución interna, aprobar automáticamente
      if (request.tipo_devolucion === 'interna') {
        await this.approveReturn(devolucion.id, request.solicitado_por, 'Aprobación automática para devolución interna');
      }

      return {
        success: true,
        devolucion_id: devolucion.id,
        validaciones,
        movimientos_creados: 0, // Se crearán al procesar
        valor_total: valorTotal,
        message: 'Devolución creada exitosamente'
      };
    } catch (error) {
      console.error('Error creating return request:', error);
      return {
        success: false,
        validaciones: [],
        movimientos_creados: 0,
        valor_total: 0,
        message: `Error al crear devolución: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Valida los detalles de una devolución
   */
  private static async validateReturnDetails(
    detalles: ReturnRequest['detalles']
  ): Promise<ReturnValidation[]> {
    const validaciones: ReturnValidation[] = [];

    for (const detalle of detalles) {
      try {
        // Obtener información del material
        const { data: material, error: materialError } = await supabase
          .from('materiales')
          .select('id, nombre, activo, permite_devoluciones')
          .eq('id', detalle.material_id)
          .single();

        if (materialError || !material) {
          validaciones.push({
            material_id: detalle.material_id,
            cantidad_solicitada: detalle.cantidad,
            cantidad_disponible: 0,
            es_valida: false,
            motivo_rechazo: 'Material no encontrado'
          });
          continue;
        }

        // Validar si el material está activo
        if (!material.activo) {
          validaciones.push({
            material_id: detalle.material_id,
            cantidad_solicitada: detalle.cantidad,
            cantidad_disponible: 0,
            es_valida: false,
            motivo_rechazo: 'Material inactivo'
          });
          continue;
        }

        // Validar si permite devoluciones (si existe el campo)
        if (material.permite_devoluciones === false) {
          validaciones.push({
            material_id: detalle.material_id,
            cantidad_solicitada: detalle.cantidad,
            cantidad_disponible: 0,
            es_valida: false,
            motivo_rechazo: 'Material no permite devoluciones'
          });
          continue;
        }

        // Obtener stock disponible
        let stockDisponible = 0;
        if (detalle.ubicacion_origen) {
          // Stock en ubicación específica
          const { data: stockUbicacion } = await supabase
            .from('stock_ubicaciones')
            .select('cantidad')
            .eq('material_id', detalle.material_id)
            .eq('ubicacion_id', detalle.ubicacion_origen)
            .single();

          stockDisponible = stockUbicacion?.cantidad || 0;
        } else {
          // Stock total del material
          const { data: materialStock } = await supabase
            .from('materiales')
            .select('stock_actual')
            .eq('id', detalle.material_id)
            .single();

          stockDisponible = materialStock?.stock_actual || 0;
        }

        // Validar cantidad
        const restricciones: string[] = [];
        let esValida = true;

        if (detalle.cantidad <= 0) {
          esValida = false;
          restricciones.push('La cantidad debe ser mayor a cero');
        }

        if (detalle.cantidad > stockDisponible) {
          esValida = false;
          restricciones.push(`Stock insuficiente. Disponible: ${stockDisponible}`);
        }

        validaciones.push({
          material_id: detalle.material_id,
          cantidad_solicitada: detalle.cantidad,
          cantidad_disponible: stockDisponible,
          es_valida: esValida,
          motivo_rechazo: esValida ? undefined : restricciones.join(', '),
          restricciones: restricciones.length > 0 ? restricciones : undefined
        });
      } catch (error) {
        console.error(`Error validating material ${detalle.material_id}:`, error);
        validaciones.push({
          material_id: detalle.material_id,
          cantidad_solicitada: detalle.cantidad,
          cantidad_disponible: 0,
          es_valida: false,
          motivo_rechazo: 'Error en validación'
        });
      }
    }

    return validaciones;
  }

  /**
   * Genera un código único para la devolución
   */
  private static async generateReturnCode(tipoDevolucion: string): Promise<string> {
    try {
      const prefijo = {
        'cliente': 'DEV-CLI',
        'proveedor': 'DEV-PRV',
        'interna': 'DEV-INT'
      }[tipoDevolucion] || 'DEV';

      const fecha = new Date();
      const año = fecha.getFullYear().toString().slice(-2);
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      
      // Obtener siguiente número secuencial
      const { data: ultimaDevolucion } = await supabase
        .from('devoluciones')
        .select('codigo')
        .like('codigo', `${prefijo}-${año}${mes}%`)
        .order('codigo', { ascending: false })
        .limit(1)
        .single();

      let siguienteNumero = 1;
      if (ultimaDevolucion?.codigo) {
        const ultimoNumero = parseInt(ultimaDevolucion.codigo.split('-').pop() || '0');
        siguienteNumero = ultimoNumero + 1;
      }

      return `${prefijo}-${año}${mes}-${siguienteNumero.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating return code:', error);
      return `DEV-${Date.now()}`; // Fallback
    }
  }

  /**
   * Calcula el valor total de una devolución
   */
  private static async calculateReturnValue(
    detalles: ReturnRequest['detalles']
  ): Promise<number> {
    let valorTotal = 0;

    for (const detalle of detalles) {
      if (detalle.precio_unitario) {
        valorTotal += detalle.cantidad * detalle.precio_unitario;
      } else {
        // Obtener precio del material
        const { data: material } = await supabase
          .from('materiales')
          .select('precio_unitario')
          .eq('id', detalle.material_id)
          .single();

        if (material?.precio_unitario) {
          valorTotal += detalle.cantidad * material.precio_unitario;
        }
      }
    }

    return valorTotal;
  }

  /**
   * Aprueba una devolución
   */
  static async approveReturn(
    devolucionId: string,
    aprobadoPor: string,
    observaciones?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('devoluciones')
        .update({
          estado: 'aprobada',
          aprobado_por: aprobadoPor,
          fecha_aprobacion: new Date().toISOString(),
          observaciones_aprobacion: observaciones
        })
        .eq('id', devolucionId)
        .eq('estado', 'pendiente');

      if (error) {
        throw new Error(`Error al aprobar devolución: ${error.message}`);
      }

      return {
        success: true,
        message: 'Devolución aprobada exitosamente'
      };
    } catch (error) {
      console.error('Error approving return:', error);
      return {
        success: false,
        message: `Error al aprobar devolución: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Rechaza una devolución
   */
  static async rejectReturn(
    devolucionId: string,
    rechazadoPor: string,
    motivoRechazo: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('devoluciones')
        .update({
          estado: 'rechazada',
          rechazado_por: rechazadoPor,
          fecha_rechazo: new Date().toISOString(),
          motivo_rechazo: motivoRechazo
        })
        .eq('id', devolucionId)
        .eq('estado', 'pendiente');

      if (error) {
        throw new Error(`Error al rechazar devolución: ${error.message}`);
      }

      return {
        success: true,
        message: 'Devolución rechazada exitosamente'
      };
    } catch (error) {
      console.error('Error rejecting return:', error);
      return {
        success: false,
        message: `Error al rechazar devolución: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Procesa una devolución aprobada
   */
  static async processReturn(
    devolucionId: string,
    procesadoPor: string,
    observacionesProceso?: string
  ): Promise<ReturnProcessResult> {
    try {
      // Obtener devolución y sus detalles
      const { data: devolucion, error: devolucionError } = await supabase
        .from('devoluciones')
        .select(`
          *,
          detalle_devoluciones(*)
        `)
        .eq('id', devolucionId)
        .eq('estado', 'aprobada')
        .single();

      if (devolucionError || !devolucion) {
        return {
          success: false,
          validaciones: [],
          movimientos_creados: 0,
          valor_total: 0,
          message: 'Devolución no encontrada o no está aprobada'
        };
      }

      let movimientosCreados = 0;
      const validaciones: ReturnValidation[] = [];

      // Procesar cada detalle
      for (const detalle of devolucion.detalle_devoluciones as any[]) {
        try {
          // Validar stock actual antes de procesar
          const validacion = await this.validateReturnDetails([{
            material_id: detalle.material_id,
            cantidad: detalle.cantidad,
            ubicacion_origen: detalle.ubicacion_origen
          }]);

          validaciones.push(...validacion);

          if (validacion[0]?.es_valida) {
            // Procesar movimiento de inventario
            await this.processReturnMovement(
              detalle,
              devolucion.tipo_devolucion,
              procesadoPor,
              devolucionId
            );

            // Actualizar estado del detalle
            await supabase
              .from('detalle_devoluciones')
              .update({
                estado_detalle: 'procesado',
                fecha_procesado: new Date().toISOString(),
                procesado_por: procesadoPor
              })
              .eq('id', detalle.id);

            movimientosCreados++;
          } else {
            // Marcar detalle como rechazado
            await supabase
              .from('detalle_devoluciones')
              .update({
                estado_detalle: 'rechazado',
                observaciones_rechazo: validacion[0]?.motivo_rechazo
              })
              .eq('id', detalle.id);
          }
        } catch (error) {
          console.error(`Error processing detail ${detalle.id}:`, error);
          validaciones.push({
            material_id: detalle.material_id,
            cantidad_solicitada: detalle.cantidad,
            cantidad_disponible: 0,
            es_valida: false,
            motivo_rechazo: 'Error en procesamiento'
          });
        }
      }

      // Actualizar estado de la devolución
      const estadoFinal = movimientosCreados > 0 ? 'procesada' : 'rechazada';
      await supabase
        .from('devoluciones')
        .update({
          estado: estadoFinal,
          procesado_por: procesadoPor,
          fecha_procesado: new Date().toISOString(),
          observaciones_proceso: observacionesProceso
        })
        .eq('id', devolucionId);

      return {
        success: movimientosCreados > 0,
        devolucion_id: devolucionId,
        validaciones,
        movimientos_creados: movimientosCreados,
        valor_total: devolucion.valor_total || 0,
        message: `Devolución procesada. ${movimientosCreados} movimientos creados.`
      };
    } catch (error) {
      console.error('Error processing return:', error);
      return {
        success: false,
        validaciones: [],
        movimientos_creados: 0,
        valor_total: 0,
        message: `Error al procesar devolución: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Procesa el movimiento de inventario para una devolución
   */
  private static async processReturnMovement(
    detalle: any,
    tipoDevolucion: string,
    procesadoPor: string,
    devolucionId: string
  ): Promise<void> {
    try {
      // Determinar tipo de movimiento según tipo de devolución
      let tipoMovimiento: string;
      let cantidad: number;

      switch (tipoDevolucion) {
        case 'cliente':
          // Cliente devuelve, aumenta inventario
          tipoMovimiento = 'entrada_devolucion';
          cantidad = detalle.cantidad;
          break;
        case 'proveedor':
          // Devolvemos a proveedor, disminuye inventario
          tipoMovimiento = 'salida_devolucion';
          cantidad = -detalle.cantidad;
          break;
        case 'interna':
          // Movimiento interno, puede ser entrada o salida
          tipoMovimiento = 'transferencia_devolucion';
          cantidad = detalle.cantidad;
          break;
        default:
          throw new Error(`Tipo de devolución no válido: ${tipoDevolucion}`);
      }

      // Crear movimiento de inventario
      await supabase
        .from('movimientos_inventario')
        .insert({
          material_id: detalle.material_id,
          ubicacion_id: detalle.ubicacion_destino || detalle.ubicacion_origen,
          tipo_movimiento: tipoMovimiento,
          cantidad: cantidad,
          precio_unitario: detalle.precio_unitario,
          valor_total: detalle.subtotal,
          usuario_id: procesadoPor,
          referencia_documento: devolucionId,
          observaciones: `Devolución ${tipoDevolucion} - ${detalle.motivo_detalle || 'Sin motivo específico'}`,
          fecha: new Date().toISOString()
        });

      // Actualizar stock según el tipo de devolución
      if (tipoDevolucion === 'cliente') {
        // Aumentar stock
        await this.updateStockLocation(
          detalle.material_id,
          detalle.ubicacion_destino || detalle.ubicacion_origen,
          detalle.cantidad,
          'increase'
        );
      } else if (tipoDevolucion === 'proveedor') {
        // Disminuir stock
        await this.updateStockLocation(
          detalle.material_id,
          detalle.ubicacion_origen,
          detalle.cantidad,
          'decrease'
        );
      } else if (tipoDevolucion === 'interna' && detalle.ubicacion_destino !== detalle.ubicacion_origen) {
        // Transferencia interna
        if (detalle.ubicacion_origen) {
          await this.updateStockLocation(
            detalle.material_id,
            detalle.ubicacion_origen,
            detalle.cantidad,
            'decrease'
          );
        }
        if (detalle.ubicacion_destino) {
          await this.updateStockLocation(
            detalle.material_id,
            detalle.ubicacion_destino,
            detalle.cantidad,
            'increase'
          );
        }
      }
    } catch (error) {
      console.error('Error processing return movement:', error);
      throw error;
    }
  }

  /**
   * Actualiza el stock en una ubicación específica
   */
  private static async updateStockLocation(
    materialId: string,
    ubicacionId: string,
    cantidad: number,
    operacion: 'increase' | 'decrease'
  ): Promise<void> {
    try {
      // Obtener stock actual
      const { data: stockActual } = await supabase
        .from('stock_ubicaciones')
        .select('cantidad')
        .eq('material_id', materialId)
        .eq('ubicacion_id', ubicacionId)
        .single();

      const cantidadActual = stockActual?.cantidad || 0;
      const nuevaCantidad = operacion === 'increase' 
        ? cantidadActual + cantidad 
        : cantidadActual - cantidad;

      // Actualizar o insertar stock
      const { error } = await supabase
        .from('stock_ubicaciones')
        .upsert({
          material_id: materialId,
          ubicacion_id: ubicacionId,
          cantidad: Math.max(0, nuevaCantidad), // No permitir stock negativo
          fecha_actualizacion: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      // Actualizar stock total del material
      await supabase.rpc('actualizar_stock_material', {
        p_material_id: materialId
      });
    } catch (error) {
      console.error('Error updating stock location:', error);
      throw error;
    }
  }

  /**
   * Obtiene las devoluciones pendientes de aprobación
   */
  static async getPendingReturns(
    filtros?: {
      tipo_devolucion?: string;
      solicitado_por?: string;
      fecha_desde?: string;
      fecha_hasta?: string;
    }
  ): Promise<Return[]> {
    try {
      let query = supabase
        .from('devoluciones')
        .select(`
          *,
          usuarios_solicitante:usuarios!solicitado_por(nombre),
          detalle_devoluciones(
            *,
            materiales(nombre, unidad_medida)
          )
        `)
        .eq('estado', 'pendiente');

      if (filtros?.tipo_devolucion) {
        query = query.eq('tipo_devolucion', filtros.tipo_devolucion);
      }

      if (filtros?.solicitado_por) {
        query = query.eq('solicitado_por', filtros.solicitado_por);
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_solicitud', filtros.fecha_desde);
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_solicitud', filtros.fecha_hasta);
      }

      const { data: devoluciones, error } = await query
        .order('fecha_solicitud', { ascending: false });

      if (error) {
        throw new Error(`Error al obtener devoluciones pendientes: ${error.message}`);
      }

      return devoluciones || [];
    } catch (error) {
      console.error('Error getting pending returns:', error);
      throw error;
    }
  }

  /**
   * Obtiene el resumen de devoluciones
   */
  static async getReturnsSummary(
    fechaDesde?: string,
    fechaHasta?: string
  ): Promise<ReturnSummary> {
    try {
      let query = supabase
        .from('devoluciones')
        .select(`
          tipo_devolucion,
          estado,
          valor_total,
          detalle_devoluciones(
            material_id,
            cantidad,
            materiales(nombre)
          )
        `);

      if (fechaDesde) {
        query = query.gte('fecha_solicitud', fechaDesde);
      }

      if (fechaHasta) {
        query = query.lte('fecha_solicitud', fechaHasta);
      }

      const { data: devoluciones, error } = await query;

      if (error) {
        throw new Error(`Error al obtener resumen: ${error.message}`);
      }

      // Calcular estadísticas
      const totalDevoluciones = devoluciones?.length || 0;
      const valorTotal = devoluciones?.reduce((sum, dev) => sum + (dev.valor_total || 0), 0) || 0;

      const devolucionesPorTipo = {
        cliente: devoluciones?.filter(d => d.tipo_devolucion === 'cliente').length || 0,
        proveedor: devoluciones?.filter(d => d.tipo_devolucion === 'proveedor').length || 0,
        interna: devoluciones?.filter(d => d.tipo_devolucion === 'interna').length || 0
      };

      const devolucionesPorEstado = {
        pendiente: devoluciones?.filter(d => d.estado === 'pendiente').length || 0,
        aprobada: devoluciones?.filter(d => d.estado === 'aprobada').length || 0,
        procesada: devoluciones?.filter(d => d.estado === 'procesada').length || 0,
        rechazada: devoluciones?.filter(d => d.estado === 'rechazada').length || 0,
        cancelada: devoluciones?.filter(d => d.estado === 'cancelada').length || 0
      };

      // Calcular materiales más devueltos
      const materialesMap = new Map<string, {
        material_id: string;
        material_nombre: string;
        cantidad_total: number;
        valor_total: number;
      }>();

      devoluciones?.forEach(devolucion => {
        (devolucion.detalle_devoluciones as any[])?.forEach(detalle => {
          const key = detalle.material_id;
          const existing = materialesMap.get(key);
          
          if (existing) {
            existing.cantidad_total += detalle.cantidad;
            existing.valor_total += detalle.cantidad * (detalle.precio_unitario || 0);
          } else {
            materialesMap.set(key, {
              material_id: detalle.material_id,
              material_nombre: (detalle.materiales as any)?.nombre || 'Material desconocido',
              cantidad_total: detalle.cantidad,
              valor_total: detalle.cantidad * (detalle.precio_unitario || 0)
            });
          }
        });
      });

      const materialesMasDevueltos = Array.from(materialesMap.values())
        .sort((a, b) => b.cantidad_total - a.cantidad_total)
        .slice(0, 10);

      return {
        total_devoluciones: totalDevoluciones,
        valor_total: valorTotal,
        devoluciones_por_tipo: devolucionesPorTipo,
        devoluciones_por_estado: devolucionesPorEstado,
        materiales_mas_devueltos: materialesMasDevueltos
      };
    } catch (error) {
      console.error('Error getting returns summary:', error);
      throw error;
    }
  }
}