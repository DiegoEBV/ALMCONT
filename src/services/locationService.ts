import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

export type Location = Database['public']['Tables']['ubicaciones']['Row'];
export type StockLocation = Database['public']['Tables']['stock_ubicaciones']['Row'];
type Material = Database['public']['Tables']['materiales']['Row'];

export interface LocationAssignment {
  ubicacion_id: string;
  ubicacion_codigo: string;
  zona: string;
  capacidad_disponible: number;
  distancia_estimada?: number;
  razon_asignacion: string;
}

export interface LocationSuggestion {
  ubicaciones_sugeridas: LocationAssignment[];
  ubicacion_recomendada: LocationAssignment;
  factores_considerados: string[];
}

export interface StockMovement {
  material_id: string;
  ubicacion_origen?: string;
  ubicacion_destino: string;
  cantidad: number;
  tipo_movimiento: 'entrada' | 'salida' | 'transferencia' | 'ajuste';
  usuario_id: string;
  observaciones?: string;
}

export interface WarehouseMap {
  id: string;
  nombre: string;
  zonas: Array<{
    id: string;
    nombre: string;
    ubicaciones: Location[];
  }>;
}

export class LocationService {
  /**
   * Obtiene todas las ubicaciones activas
   */
  static async getLocations(): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('*')
        .eq('activa', true)
        .order('zona')
        .order('codigo');

      if (error) {
        throw new Error(`Error al obtener ubicaciones: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting locations:', error);
      throw error;
    }
  }



  /**
   * Sugiere ubicaciones óptimas para almacenar un material
   */
  static async suggestOptimalLocation(
    materialId: string,
    cantidad: number,
    preferencias?: {
      zona_preferida?: string;
      tipo_ubicacion?: string;
      cerca_de_material?: string;
    }
  ): Promise<LocationSuggestion> {
    try {
      // Obtener información del material
      const { data: material, error: materialError } = await supabase
        .from('materiales')
        .select('*')
        .eq('id', materialId)
        .single();

      if (materialError || !material) {
        throw new Error('Material no encontrado');
      }

      // Obtener ubicaciones disponibles con capacidad suficiente
      const { data: ubicaciones, error: ubicacionesError } = await supabase
        .from('ubicaciones')
        .select(`
          *,
          stock_ubicaciones(
            material_id,
            cantidad
          )
        `)
        .eq('activa', true)
        .order('zona')
        .order('codigo');

      if (ubicacionesError) {
        throw new Error(`Error al obtener ubicaciones: ${ubicacionesError.message}`);
      }

      if (!ubicaciones || ubicaciones.length === 0) {
        throw new Error('No hay ubicaciones disponibles');
      }

      // Evaluar cada ubicación
      const evaluaciones: LocationAssignment[] = [];
      const factoresConsiderados: string[] = [];

      for (const ubicacion of ubicaciones) {
        const evaluacion = await this.evaluateLocation(
          ubicacion,
          material,
          cantidad,
          preferencias
        );

        if (evaluacion) {
          evaluaciones.push(evaluacion);
        }
      }

      // Ordenar por mejor puntuación (capacidad disponible y otros factores)
      evaluaciones.sort((a, b) => {
        // Priorizar por capacidad disponible
        if (b.capacidad_disponible !== a.capacidad_disponible) {
          return b.capacidad_disponible - a.capacidad_disponible;
        }
        // Luego por distancia (menor es mejor)
        return (a.distancia_estimada || 0) - (b.distancia_estimada || 0);
      });

      // Determinar factores considerados
      factoresConsiderados.push('Capacidad disponible');
      if (preferencias?.zona_preferida) {
        factoresConsiderados.push('Zona preferida');
      }
      if (preferencias?.tipo_ubicacion) {
        factoresConsiderados.push('Tipo de ubicación');
      }
      if (preferencias?.cerca_de_material) {
        factoresConsiderados.push('Proximidad a material relacionado');
      }
      factoresConsiderados.push('Optimización de distancias');

      return {
        ubicaciones_sugeridas: evaluaciones.slice(0, 5), // Top 5
        ubicacion_recomendada: evaluaciones[0],
        factores_considerados: factoresConsiderados
      };
    } catch (error) {
      console.error('Error suggesting optimal location:', error);
      throw error;
    }
  }

  /**
   * Evalúa una ubicación específica para un material
   */
  private static async evaluateLocation(
    ubicacion: any,
    material: Material,
    cantidad: number,
    preferencias?: any
  ): Promise<LocationAssignment | null> {
    try {
      // Calcular capacidad ocupada actual
      const stockActual = ubicacion.stock_ubicaciones?.reduce(
        (total: number, stock: any) => total + stock.cantidad,
        0
      ) || 0;

      const capacidadDisponible = ubicacion.capacidad_maxima - stockActual;

      // Verificar si hay capacidad suficiente
      if (capacidadDisponible < cantidad) {
        return null;
      }

      // Verificar restricciones de tipo de material
      if (ubicacion.restricciones_tipo) {
        const restricciones = ubicacion.restricciones_tipo as any;
        if (restricciones.tipos_permitidos && 
            !restricciones.tipos_permitidos.includes(material.categoria)) {
          return null;
        }
        if (restricciones.tipos_prohibidos && 
            restricciones.tipos_prohibidos.includes(material.categoria)) {
          return null;
        }
      }

      // Calcular distancia estimada (si hay preferencias de proximidad)
      let distanciaEstimada = 0;
      if (preferencias?.cerca_de_material) {
        distanciaEstimada = await this.calculateDistanceToMaterial(
          ubicacion.id,
          preferencias.cerca_de_material
        );
      }

      // Determinar razón de asignación
      let razonAsignacion = 'Ubicación disponible con capacidad suficiente';
      
      if (preferencias?.zona_preferida && ubicacion.zona === preferencias.zona_preferida) {
        razonAsignacion = `Ubicación en zona preferida: ${ubicacion.zona}`;
      } else if (ubicacion.tipo === preferencias?.tipo_ubicacion) {
        razonAsignacion = `Ubicación del tipo preferido: ${ubicacion.tipo}`;
      } else if (capacidadDisponible >= cantidad * 2) {
        razonAsignacion = 'Ubicación con amplia capacidad disponible';
      }

      return {
        ubicacion_id: ubicacion.id,
        ubicacion_codigo: ubicacion.codigo,
        zona: ubicacion.zona,
        capacidad_disponible: capacidadDisponible,
        distancia_estimada: distanciaEstimada,
        razon_asignacion: razonAsignacion
      };
    } catch (error) {
      console.error('Error evaluating location:', error);
      return null;
    }
  }

  /**
   * Calcula la distancia estimada entre ubicaciones
   */
  private static async calculateDistanceToMaterial(
    ubicacionId: string,
    materialId: string
  ): Promise<number> {
    try {
      // Obtener ubicaciones donde está el material relacionado
      const { data: stockRelacionado } = await supabase
        .from('stock_ubicaciones')
        .select(`
          ubicacion_id,
          ubicaciones(coordenada_x, coordenada_y)
        `)
        .eq('material_id', materialId)
        .gt('cantidad', 0);

      if (!stockRelacionado || stockRelacionado.length === 0) {
        return 0;
      }

      // Obtener coordenadas de la ubicación actual
      const { data: ubicacionActual } = await supabase
        .from('ubicaciones')
        .select('coordenada_x, coordenada_y')
        .eq('id', ubicacionId)
        .single();

      if (!ubicacionActual) {
        return 0;
      }

      // Calcular distancia mínima
      let distanciaMinima = Infinity;
      
      for (const stock of stockRelacionado) {
        if (stock.ubicaciones) {
          const ubicacionRelacionada = stock.ubicaciones as any;
          const distancia = Math.sqrt(
            Math.pow(ubicacionActual.coordenada_x - ubicacionRelacionada.coordenada_x, 2) +
            Math.pow(ubicacionActual.coordenada_y - ubicacionRelacionada.coordenada_y, 2)
          );
          
          if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
          }
        }
      }

      return distanciaMinima === Infinity ? 0 : distanciaMinima;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 0;
    }
  }

  /**
   * Asigna automáticamente una ubicación para un material
   */
  static async assignLocation(
    materialId: string,
    cantidad: number,
    usuarioId: string,
    preferencias?: {
      zona_preferida?: string;
      tipo_ubicacion?: string;
      cerca_de_material?: string;
    }
  ): Promise<{ success: boolean; ubicacion?: LocationAssignment; message: string }> {
    try {
      // Obtener sugerencia de ubicación óptima
      const sugerencia = await this.suggestOptimalLocation(
        materialId,
        cantidad,
        preferencias
      );

      if (!sugerencia.ubicacion_recomendada) {
        return {
          success: false,
          message: 'No se encontró ubicación disponible con capacidad suficiente'
        };
      }

      // Asignar el stock a la ubicación
      const movimiento: StockMovement = {
        material_id: materialId,
        ubicacion_destino: sugerencia.ubicacion_recomendada.ubicacion_id,
        cantidad: cantidad,
        tipo_movimiento: 'entrada',
        usuario_id: usuarioId,
        observaciones: `Asignación automática: ${sugerencia.ubicacion_recomendada.razon_asignacion}`
      };

      const resultado = await this.executeStockMovement(movimiento);

      if (resultado.success) {
        return {
          success: true,
          ubicacion: sugerencia.ubicacion_recomendada,
          message: `Material asignado exitosamente a ${sugerencia.ubicacion_recomendada.ubicacion_codigo}`
        };
      } else {
        return {
          success: false,
          message: resultado.message
        };
      }
    } catch (error) {
      console.error('Error assigning location:', error);
      return {
        success: false,
        message: `Error al asignar ubicación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Ejecuta un movimiento de stock entre ubicaciones
   */
  static async executeStockMovement(
    movimiento: StockMovement
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Iniciar transacción
      const { data, error } = await supabase.rpc('ejecutar_movimiento_stock', {
        p_material_id: movimiento.material_id,
        p_ubicacion_origen: movimiento.ubicacion_origen,
        p_ubicacion_destino: movimiento.ubicacion_destino,
        p_cantidad: movimiento.cantidad,
        p_tipo_movimiento: movimiento.tipo_movimiento,
        p_usuario_id: movimiento.usuario_id,
        p_observaciones: movimiento.observaciones
      });

      if (error) {
        throw new Error(`Error en movimiento de stock: ${error.message}`);
      }

      return {
        success: true,
        message: 'Movimiento de stock ejecutado exitosamente'
      };
    } catch (error) {
      console.error('Error executing stock movement:', error);
      
      // Fallback: ejecutar manualmente si la función RPC no existe
      return await this.executeStockMovementManual(movimiento);
    }
  }

  /**
   * Ejecuta movimiento de stock manualmente (fallback)
   */
  private static async executeStockMovementManual(
    movimiento: StockMovement
  ): Promise<{ success: boolean; message: string }> {
    try {
      let stockOrigen: any = null;
      
      // Verificar stock origen si es transferencia o salida
      if (movimiento.tipo_movimiento !== 'entrada' && movimiento.ubicacion_origen) {
        const { data: stockOrigenData } = await supabase
          .from('stock_ubicaciones')
          .select('cantidad')
          .eq('material_id', movimiento.material_id)
          .eq('ubicacion_id', movimiento.ubicacion_origen)
          .single();

        stockOrigen = stockOrigenData;
        
        if (!stockOrigen || stockOrigen.cantidad < movimiento.cantidad) {
          return {
            success: false,
            message: 'Stock insuficiente en ubicación origen'
          };
        }
      }

      // Actualizar stock origen (reducir)
      if (movimiento.ubicacion_origen && stockOrigen) {
        const { error: errorOrigen } = await supabase
          .from('stock_ubicaciones')
          .update({
            cantidad: stockOrigen.cantidad - movimiento.cantidad,
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('material_id', movimiento.material_id)
          .eq('ubicacion_id', movimiento.ubicacion_origen);

        if (errorOrigen) {
          throw new Error(`Error actualizando stock origen: ${errorOrigen.message}`);
        }
      }

      // Actualizar o crear stock destino (aumentar)
      const { data: stockDestino } = await supabase
        .from('stock_ubicaciones')
        .select('cantidad')
        .eq('material_id', movimiento.material_id)
        .eq('ubicacion_id', movimiento.ubicacion_destino)
        .single();

      if (stockDestino) {
        // Actualizar stock existente
        const { error: errorDestino } = await supabase
          .from('stock_ubicaciones')
          .update({
            cantidad: stockDestino.cantidad + movimiento.cantidad,
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('material_id', movimiento.material_id)
          .eq('ubicacion_id', movimiento.ubicacion_destino);

        if (errorDestino) {
          throw new Error(`Error actualizando stock destino: ${errorDestino.message}`);
        }
      } else {
        // Crear nuevo registro de stock
        const { error: errorNuevo } = await supabase
          .from('stock_ubicaciones')
          .insert({
            material_id: movimiento.material_id,
            ubicacion_id: movimiento.ubicacion_destino,
            cantidad: movimiento.cantidad,
            fecha_asignacion: new Date().toISOString()
          });

        if (errorNuevo) {
          throw new Error(`Error creando stock destino: ${errorNuevo.message}`);
        }
      }

      return {
        success: true,
        message: 'Movimiento de stock ejecutado exitosamente'
      };
    } catch (error) {
      console.error('Error in manual stock movement:', error);
      return {
        success: false,
        message: `Error en movimiento de stock: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Obtiene el stock por ubicaciones para un material
   */
  static async getStockByLocation(materialId: string): Promise<{
    ubicaciones: Array<{
      ubicacion_id: string;
      ubicacion_codigo: string;
      zona: string;
      cantidad: number;
      capacidad_disponible: number;
      porcentaje_ocupacion: number;
    }>;
    total_stock: number;
  }> {
    try {
      const { data: stockUbicaciones, error } = await supabase
        .from('stock_ubicaciones')
        .select(`
          cantidad,
          ubicacion_id,
          ubicaciones(
            codigo,
            zona,
            capacidad_maxima
          )
        `)
        .eq('material_id', materialId)
        .gt('cantidad', 0);

      if (error) {
        throw new Error(`Error al obtener stock por ubicaciones: ${error.message}`);
      }

      const ubicaciones = (stockUbicaciones || []).map((stock: any) => {
        const ubicacion = stock.ubicaciones;
        const capacidadDisponible = (ubicacion.capacidad_maxima || 0) - stock.cantidad;
        const porcentajeOcupacion = ubicacion.capacidad_maxima ? (stock.cantidad / ubicacion.capacidad_maxima) * 100 : 0;

        return {
          ubicacion_id: stock.ubicacion_id,
          ubicacion_codigo: ubicacion.codigo,
          zona: ubicacion.zona,
          cantidad: stock.cantidad,
          capacidad_disponible: capacidadDisponible,
          porcentaje_ocupacion: Math.round(porcentajeOcupacion * 100) / 100
        };
      });

      const totalStock = ubicaciones.reduce((total, ub) => total + ub.cantidad, 0);

      return {
        ubicaciones,
        total_stock: totalStock
      };
    } catch (error) {
      console.error('Error getting stock by location:', error);
      throw error;
    }
  }

  /**
   * Obtiene el mapa de ubicaciones del almacén
   */
  static async getWarehouseMap(): Promise<WarehouseMap> {
    try {
      // Obtener ubicaciones con su información de stock
      const { data: resumenUbicaciones, error } = await supabase
        .from('ubicaciones')
        .select(`
          id,
          codigo,
          nombre,
          tipo,
          capacidad_maxima,
          stock_ubicaciones(
            cantidad
          )
        `)
        .order('nombre')
        .order('codigo');

      if (error) {
        throw new Error(`Error al obtener mapa del almacén: ${error.message}`);
      }

      // Agrupar por zonas
      const zonaMap = new Map();
      
      (resumenUbicaciones || []).forEach((ubicacion: any) => {
        if (!zonaMap.has(ubicacion.nombre)) {
          zonaMap.set(ubicacion.nombre, []);
        }

        const capacidadOcupada = ubicacion.stock_ubicaciones?.reduce((sum: number, stock: any) => sum + (stock.cantidad || 0), 0) || 0;
        const porcentajeOcupacion = (capacidadOcupada / ubicacion.capacidad_maxima) * 100;
        
        let estado: 'disponible' | 'ocupada' | 'llena';
        if (porcentajeOcupacion === 0) {
          estado = 'disponible';
        } else if (porcentajeOcupacion >= 95) {
          estado = 'llena';
        } else {
          estado = 'ocupada';
        }

        zonaMap.get(ubicacion.nombre).push({
          id: ubicacion.id,
          codigo: ubicacion.codigo,
          tipo: ubicacion.tipo,
          capacidad_maxima: ubicacion.capacidad_maxima,
          capacidad_ocupada: capacidadOcupada,
          materiales_almacenados: ubicacion.stock_ubicaciones?.length || 0,
          estado
        });
      });

      // Convertir a array
      const zonas = Array.from(zonaMap.entries()).map(([nombre, ubicaciones]) => ({
        id: nombre.toLowerCase().replace(/\s+/g, '-'),
        nombre,
        ubicaciones
      }));

      return {
        id: 'almacen-principal',
        nombre: 'Almacén Principal',
        zonas
      };
    } catch (error) {
      console.error('Error getting warehouse map:', error);
      throw error;
    }
  }
}