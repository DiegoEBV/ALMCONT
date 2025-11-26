import { supabase } from '../lib/supabase'
import { sanitizeUUID} from '../utils/uuidValidator'
import type { Material } from '../types'

export interface StockItem {
  id: string
  material_id: string
  obra_id: string
  stock_actual: number
  stock_reservado?: number
  stock_disponible?: number
  stock_minimo?: number
  stock_maximo?: number
  costo_promedio?: number
  valor_total?: number
  ubicacion_principal?: string
  ultima_entrada?: string
  ultima_salida?: string
  material?: Material
  obra?: {
    id: string
    nombre: string
    codigo: string
  }
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface KardexMovimiento {
  id: string
  material_id: string
  obra_id: string
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA' | 'AJUSTE'
  cantidad: number
  cantidad_anterior: number
  cantidad_nueva: number
  fecha_movimiento: string
  referencia?: string
  observaciones?: string
  usuario_id: string
  material?: Material
  obra?: {
    id: string
    nombre: string
    codigo: string
  }
  usuario?: {
    id: string
    nombre: string
    email: string
  }
  [key: string]: unknown
}

export const stockService = {
  async getStockByObra(obraId: string) {
    try {
      console.log('Fetching stock for obra:', obraId)
      const { data, error } = await supabase
        .from('stock_obra_material')
        .select(`
          *,
          obras(*),
          materiales(*)
        `)
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching stock by obra:', error)
        throw error
      }

      console.log('Stock data fetched:', data?.length || 0, 'items')
      return data || []
    } catch (error) {
      console.error('Error in getStockByObra:', error)
      throw error
    }
  },

  async getStockByMaterial(materialId: string) {
    try {
      console.log('Fetching stock for material:', materialId)
      const { data, error } = await supabase
        .from('stock_obra_material')
        .select(`
          *,
          obras(*),
          materiales(*)
        `)
        .eq('material_id', materialId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching stock by material:', error)
        throw error
      }

      console.log('Stock data fetched:', data?.length || 0, 'items')
      return data || []
    } catch (error) {
      console.error('Error in getStockByMaterial:', error)
      throw error
    }
  },

  async updateStock(obraId: string, materialId: string, cantidad: number) {
    // First check if stock item exists
    const { data: existingStock } = await supabase
      .from('stock_obra_material')
      .select('*')
      .eq('obra_id', obraId)
      .eq('material_id', materialId)
      .single()

    if (existingStock) {
      // Update existing stock
      const { data, error } = await supabase
        .from('stock_obra_material')
        .update({
          stock_actual: (existingStock.stock_actual || 0) + cantidad,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingStock.id)
        .select(`
          *,
          obras(*),
          materiales(*)
        `)
        .single()

      if (error) {
        console.error('Error updating stock:', error)
        throw error
      }

      return data
    } else {
      // Create new stock entry
      const { data, error } = await supabase
        .from('stock_obra_material')
        .insert({
          obra_id: obraId,
          material_id: materialId,
          stock_actual: cantidad,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          obras(*),
          materiales(*)
        `)
        .single()

      if (error) {
        console.error('Error creating stock:', error)
        throw error
      }

      return data
    }
  },

  async getStockItem(obraId: string, materialId: string) {
    const { data, error } = await supabase
      .from('stock_obra_material')
      .select(`
        *,
        obras(*),
        materiales(*)
      `)
      .eq('obra_id', obraId)
      .eq('material_id', materialId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching stock item:', error)
      throw error
    }

    return data
  },

  // Obtener stock con filtros
  async getStockWithFilters(
    filters: {
      obra_id?: string;
      busqueda?: string;
      categoria?: string;
      stock_bajo?: boolean;
    }
  ): Promise<StockItem[]> {
    try {
      const { obra_id, busqueda, categoria, stock_bajo } = filters;
      console.log('🔍 getStockWithFilters - Parámetros:', { obra_id, busqueda, categoria, stock_bajo });
  
      // Sanitizar el UUID de obra
      const sanitizedObraId = sanitizeUUID(obra_id);
      console.log('🔍 UUID sanitizado:', { original: obra_id, sanitized: sanitizedObraId });
  
      let query = supabase
        .from('stock_obra_material')
        .select(`
          *,
          obras:obra_id(nombre),
          materiales:material_id(codigo, descripcion, nombre, categoria, unidad)
        `);
  
      // Aplicar filtro de obra si se proporciona y es válido
      if (sanitizedObraId) {
        query = query.eq('obra_id', sanitizedObraId);
      }
  
      const { data, error } = await query;
  
      if (error) {
        console.error('❌ Error en getStockWithFilters:', error);
        throw error;
      }
  
      console.log('✅ Datos obtenidos de stock_obra_material:', data?.length || 0, 'items');
  
      if (!data) return [];
  
      // Aplicar filtros del lado del cliente
      let filteredData = data;
  
      // Filtro de búsqueda
      if (busqueda) {
        const searchTerm = busqueda.toLowerCase();
        filteredData = filteredData.filter(item => 
          item.materiales?.nombre?.toLowerCase().includes(searchTerm) ||
          item.obras?.nombre?.toLowerCase().includes(searchTerm)
        );
      }
  
      // Filtro de categoría
      if (categoria) {
        filteredData = filteredData.filter(item => 
          item.materiales?.categoria === categoria
        );
      }
  
      // Filtro de stock bajo
      if (stock_bajo) {
        filteredData = filteredData.filter(item => 
          item.stock_actual <= item.stock_minimo
        );
      }
  
      // Mapear a la estructura StockItem
      const stockItems: StockItem[] = filteredData.map(item => ({
        id: item.id,
        material_id: item.material_id,
        obra_id: item.obra_id,
        stock_actual: item.stock_actual || 0,
        stock_reservado: item.stock_reservado,
        stock_disponible: item.stock_disponible,
        stock_minimo: item.stock_minimo,
        stock_maximo: item.stock_maximo,
        costo_promedio: item.costo_promedio,
        valor_total: item.valor_total,
        ubicacion_principal: item.ubicacion_principal,
        ultima_entrada: item.ultima_entrada,
        ultima_salida: item.ultima_salida,
        material: item.materiales,
        obra: item.obras,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
  
      console.log('✅ Stock items procesados:', stockItems.length);
     return stockItems;

   } catch (error) {
     console.error('❌ Error en getStockWithFilters:', error);
     throw error;
   }
 },

  // Obtener movimientos de kardex
  async getKardexMovimientos(
    materialId?: string,
    obraId?: string,
    fechaInicio?: string,
    fechaFin?: string,
    tipoMovimiento?: 'ENTRADA' | 'SALIDA'
  ): Promise<KardexMovimiento[]> {
    try {
      console.log('🔍 getKardexMovimientos - Parámetros:', { materialId, obraId, fechaInicio, fechaFin, tipoMovimiento });
      
      // Sanitizar UUIDs
      const sanitizedMaterialId = sanitizeUUID(materialId);
      const sanitizedObraId = sanitizeUUID(obraId);
      
      console.log('🔍 UUIDs sanitizados:', { 
        materialId: { original: materialId, sanitized: sanitizedMaterialId },
        obraId: { original: obraId, sanitized: sanitizedObraId }
      });
      
      const movimientos: KardexMovimiento[] = [];
      
      // Obtener entradas sin joins automáticos
      if (!tipoMovimiento || tipoMovimiento === 'ENTRADA') {
        console.log('📥 Consultando entrada_items...');
        let entradaQuery = supabase
          .from('entrada_items')
          .select('id, entrada_id, material_id, cantidad_recibida, cantidad_aceptada, observaciones');
        if (sanitizedMaterialId) entradaQuery = entradaQuery.eq('material_id', sanitizedMaterialId);
        const { data: entradaItems, error: entradaError } = await entradaQuery;
        if (!entradaError && entradaItems && entradaItems.length > 0) {
          const entradaIds = Array.from(new Set(entradaItems.map(e => e.entrada_id).filter(Boolean)));
          const materialIds = Array.from(new Set(entradaItems.map(e => e.material_id).filter(Boolean)));
          const { data: entradasData } = await supabase
            .from('entradas')
            .select('id, fecha_entrada, numero_entrada, obra_id, observaciones, recibido_por');
          const entradasMap = new Map((entradasData || []).map(e => [e.id, e]));
          const { data: materialesData } = await supabase
            .from('materiales')
            .select('id, nombre, unidad_medida')
            .in('id', materialIds);
          const materialesMap = new Map((materialesData || []).map(m => [m.id, m]));
          const obraIds = Array.from(new Set((entradasData || []).map(e => e.obra_id).filter(Boolean)));
          const { data: obrasData } = await supabase
            .from('obras')
            .select('id, nombre, codigo')
            .in('id', obraIds);
          const obrasMap = new Map((obrasData || []).map(o => [o.id, o]));
          for (const item of entradaItems) {
            const entrada = entradasMap.get(item.entrada_id);
            if (!entrada) continue;
            if (sanitizedObraId && entrada.obra_id !== sanitizedObraId) continue;
            if (fechaInicio && entrada.fecha_entrada && entrada.fecha_entrada < fechaInicio) continue;
            if (fechaFin && entrada.fecha_entrada && entrada.fecha_entrada > fechaFin) continue;
            movimientos.push({
              id: item.id,
              material_id: item.material_id,
              obra_id: entrada.obra_id || '',
              tipo_movimiento: 'ENTRADA',
              cantidad: item.cantidad_recibida || item.cantidad_aceptada || 0,
              cantidad_anterior: 0,
              cantidad_nueva: 0,
              fecha_movimiento: entrada.fecha_entrada || '',
              referencia: entrada.numero_entrada || '',
              observaciones: entrada.observaciones || item.observaciones || '',
              usuario_id: entrada.recibido_por || '',
              material: materialesMap.get(item.material_id) as any,
              obra: obrasMap.get(entrada.obra_id || '') as any
            });
          }
        } else if (entradaError) {
          console.error('❌ Error consultando entrada_items:', entradaError);
        }
      }
      
      // Obtener salidas si no se especifica tipo o si es 'SALIDA'
      if (!tipoMovimiento || tipoMovimiento === 'SALIDA') {
        console.log('📤 Consultando salida_items...');
        let salidaQuery = supabase
          .from('salida_items')
          .select('id, salida_id, material_id, cantidad_solicitada, cantidad_autorizada, cantidad_entregada, observaciones');
        if (sanitizedMaterialId) salidaQuery = salidaQuery.eq('material_id', sanitizedMaterialId);
        const { data: salidaItems, error: salidaError } = await salidaQuery;
        if (!salidaError && salidaItems && salidaItems.length > 0) {
          const salidaIds = Array.from(new Set(salidaItems.map(s => s.salida_id).filter(Boolean)));
          const materialIds = Array.from(new Set(salidaItems.map(s => s.material_id).filter(Boolean)));
          const { data: salidasData } = await supabase
            .from('salidas')
            .select('id, fecha_salida, numero_salida, obra_id, observaciones, solicitado_por');
          const salidasMap = new Map((salidasData || []).map(s => [s.id, s]));
          const { data: materialesData } = await supabase
            .from('materiales')
            .select('id, nombre, unidad_medida')
            .in('id', materialIds);
          const materialesMap = new Map((materialesData || []).map(m => [m.id, m]));
          const obraIds = Array.from(new Set((salidasData || []).map(s => s.obra_id).filter(Boolean)));
          const { data: obrasData } = await supabase
            .from('obras')
            .select('id, nombre, codigo')
            .in('id', obraIds);
          const obrasMap = new Map((obrasData || []).map(o => [o.id, o]));
          for (const item of salidaItems) {
            const salida = salidasMap.get(item.salida_id);
            if (!salida) continue;
            if (sanitizedObraId && salida.obra_id !== sanitizedObraId) continue;
            if (fechaInicio && salida.fecha_salida && salida.fecha_salida < fechaInicio) continue;
            if (fechaFin && salida.fecha_salida && salida.fecha_salida > fechaFin) continue;
            const cantidad = -(item.cantidad_entregada || item.cantidad_autorizada || item.cantidad_solicitada || 0);
            movimientos.push({
              id: item.id,
              material_id: item.material_id,
              obra_id: salida.obra_id || '',
              tipo_movimiento: 'SALIDA',
              cantidad,
              cantidad_anterior: 0,
              cantidad_nueva: 0,
              fecha_movimiento: salida.fecha_salida || '',
              referencia: salida.numero_salida || '',
              observaciones: salida.observaciones || item.observaciones || '',
              usuario_id: salida.solicitado_por || '',
              material: materialesMap.get(item.material_id) as any,
              obra: obrasMap.get(salida.obra_id || '') as any
            });
          }
        } else if (salidaError) {
          console.error('❌ Error consultando salida_items:', salidaError);
        }
      }
      
      // Ordenar por fecha
      movimientos.sort((a, b) => new Date(a.fecha_movimiento).getTime() - new Date(b.fecha_movimiento).getTime());
      
      // Calcular cantidades acumuladas
      let cantidadAcumulada = 0;
      for (const movimiento of movimientos) {
        movimiento.cantidad_anterior = cantidadAcumulada;
        cantidadAcumulada += movimiento.cantidad;
        movimiento.cantidad_nueva = cantidadAcumulada;
      }
      
      console.log('✅ Movimientos kardex procesados:', movimientos.length);
      return movimientos;
      
    } catch (error) {
      console.error('❌ Error en getKardexMovimientos:', error);
      throw error;
    }
  },

  // Obtener resumen de stock
  async getStockSummary(): Promise<{
    total_materiales: number
    stock_bajo: number
    sin_stock: number
    valor_total: number
  }> {
    try {
      console.log('Fetching stock summary')
      const { data: stockItems, error } = await supabase
        .from('stock_obra_material')
        .select(`
          *,
          materiales(*)
        `)
      
      if (error) {
        console.error('Error fetching stock summary:', error)
        throw error
      }
      
      const items = stockItems || []
      console.log('Stock summary data:', items.length, 'items')
      
      const total_materiales = items.length
      const stock_bajo = items.filter(item => (item.stock_actual || 0) < (item.stock_minimo || 0)).length
      const sin_stock = items.filter(item => (item.stock_actual || 0) === 0).length
      
      // Calcular valor total usando costo_promedio * stock_actual
      const valor_total = items.reduce((total, item) => {
        const costo = item.costo_promedio || item.materiales?.precio_unitario || 0
        return total + (costo * (item.stock_actual || 0))
      }, 0)
      
      const summary = {
        total_materiales,
        stock_bajo,
        sin_stock,
        valor_total
      }
      
      console.log('Stock summary calculated:', summary)
      return summary
    } catch (error) {
      console.error('Error al obtener resumen de stock:', error)
      return {
        total_materiales: 0,
        stock_bajo: 0,
        sin_stock: 0,
        valor_total: 0
      }
    }
  },

  // Exportar stock a Excel
  async exportStockToExcel(filters: {
    obra_id?: string
    categoria?: string
    stock_bajo?: boolean
  }): Promise<Blob> {
    try {
      await this.getStockWithFilters(filters)
      
      // Aquí implementarías la lógica de exportación a Excel
      // Por ahora retornamos un blob vacío
      return new Blob([], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    } catch (error) {
      console.error('Error al exportar stock:', error)
      throw error
    }
  }
}