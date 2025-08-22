import { supabase } from '../lib/supabase'
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

    return data || []
  },

  async getStockByMaterial(materialId: string) {
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

    return data || []
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
  async getStockWithFilters(filters: {
    busqueda?: string
    obra_id?: string
    categoria?: string
    stock_bajo?: boolean
  }): Promise<StockItem[]> {
    try {
      let query = supabase
        .from('stock_obra_material')
        .select(`
          *,
          obras(*),
          materiales(*)
        `)
      
      if (filters.obra_id) {
        query = query.eq('obra_id', filters.obra_id)
      }
      
      if (filters.busqueda) {
        const searchTerm = `%${filters.busqueda}%`
        query = query.or(`materiales.nombre.ilike.${searchTerm},materiales.codigo.ilike.${searchTerm},materiales.descripcion.ilike.${searchTerm}`)
      }
      
      if (filters.categoria) {
        query = query.eq('materiales.categoria', filters.categoria)
      }
      
      const { data, error } = await query.order('materiales(nombre)')
      
      if (error) {
        console.error('Error fetching filtered stock:', error)
        throw error
      }
      
      let filteredStock = data || []
      
      if (filters.stock_bajo) {
        filteredStock = filteredStock.filter(item => item.cantidad < (item.cantidad_minima || 0))
      }
      
      return filteredStock
    } catch (error) {
      console.error('Error al obtener stock filtrado:', error)
      throw error
    }
  },

  // Obtener movimientos de kardex
  async getKardexMovimientos(filters: {
    material_id?: string
    obra_id?: string
    fecha_desde?: string
    fecha_hasta?: string
    tipo_movimiento?: string
    limit?: number
  }): Promise<KardexMovimiento[]> {
    try {
      // Obtener movimientos de entradas
      let entradasQuery = supabase
        .from('entrada_items')
        .select(`
          *,
          entradas(*),
          materiales(*),
          obras(*),
          usuarios(*)
        `)
      
      // Aplicar filtros a entradas
      if (filters.material_id) {
        entradasQuery = entradasQuery.eq('material_id', filters.material_id)
      }
      
      if (filters.obra_id) {
        entradasQuery = entradasQuery.eq('obra_id', filters.obra_id)
      }
      
      if (filters.fecha_desde) {
        entradasQuery = entradasQuery.gte('entradas.fecha_entrada', filters.fecha_desde)
      }
      
      if (filters.fecha_hasta) {
        entradasQuery = entradasQuery.lte('entradas.fecha_entrada', filters.fecha_hasta)
      }
      
      const { data: entradasData, error: entradasError } = await entradasQuery
      
      if (entradasError) {
        console.error('Error fetching entradas:', entradasError)
        throw entradasError
      }
      
      // Obtener movimientos de salidas
      let salidasQuery = supabase
        .from('salida_items')
        .select(`
          *,
          salidas!inner(*),
          materiales(*)
        `)
      
      // Aplicar filtros a salidas
      if (filters.material_id) {
        salidasQuery = salidasQuery.eq('material_id', filters.material_id)
      }
      
      if (filters.obra_id) {
        salidasQuery = salidasQuery.eq('salidas.obra_id', filters.obra_id)
      }
      
      if (filters.fecha_desde) {
        salidasQuery = salidasQuery.gte('salidas.fecha_entrega', filters.fecha_desde)
      }
      
      if (filters.fecha_hasta) {
        salidasQuery = salidasQuery.lte('salidas.fecha_entrega', filters.fecha_hasta)
      }
      
      const { data: salidasData, error: salidasError } = await salidasQuery
      
      if (salidasError) {
        console.error('Error fetching salidas:', salidasError)
        throw salidasError
      }
      
      // Convertir a formato de movimientos kardex
      const movimientos: KardexMovimiento[] = [
        ...(entradasData || []).map(entrada => ({
          id: entrada.id,
          material_id: entrada.material_id,
          obra_id: entrada.obra_id,
          tipo_movimiento: 'ENTRADA' as const,
          cantidad: entrada.cantidad_atendida,
          cantidad_anterior: 0, // Se calcularía en una implementación real
          cantidad_nueva: entrada.cantidad_atendida,
          fecha_movimiento: entrada.entradas?.fecha_entrada || new Date().toISOString(),
          referencia: entrada.entradas?.numero_sc || '',
          observaciones: entrada.entradas?.observaciones || '',
          usuario_id: entrada.entradas?.usuario_id || '',
          material: entrada.materiales,
          obra: entrada.obras,
          usuario: entrada.usuarios
        })),
        ...(salidasData || []).map(salida => ({
          id: salida.id,
          material_id: salida.material_id,
          obra_id: salida.salidas?.obra_id || '',
          tipo_movimiento: 'SALIDA' as const,
          cantidad: salida.cantidad_entregada || salida.cantidad_autorizada || salida.cantidad_solicitada,
          cantidad_anterior: 0, // Se calcularía en una implementación real
          cantidad_nueva: -(salida.cantidad_entregada || salida.cantidad_autorizada || salida.cantidad_solicitada),
          fecha_movimiento: salida.salidas?.fecha_entrega || salida.salidas?.fecha_salida || new Date().toISOString(),
          referencia: salida.salidas?.numero_salida || '',
          observaciones: salida.salidas?.observaciones || salida.observaciones || '',
          usuario_id: salida.salidas?.solicitado_por || '',
          material: salida.materiales,
          obra: null,
          usuario: null
        }))
      ]
      
      let filteredMovimientos = movimientos
      
      // Filtrar por tipo de movimiento si es necesario
      if (filters.tipo_movimiento) {
        filteredMovimientos = filteredMovimientos.filter(m => m.tipo_movimiento === filters.tipo_movimiento)
      }
      
      // Ordenar por fecha descendente
      filteredMovimientos.sort((a, b) => new Date(b.fecha_movimiento).getTime() - new Date(a.fecha_movimiento).getTime())
      
      // Aplicar límite
      if (filters.limit) {
        filteredMovimientos = filteredMovimientos.slice(0, filters.limit)
      }
      
      return filteredMovimientos
    } catch (error) {
      console.error('Error al obtener movimientos kardex:', error)
      throw error
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
      const total_materiales = items.length
      const stock_bajo = items.filter(item => item.cantidad < (item.cantidad_minima || 0)).length
      const sin_stock = items.filter(item => item.cantidad === 0).length
      
      // Calcular valor total (precio unitario * cantidad actual)
      const valor_total = items.reduce((total, item) => {
        const precio = item.materiales?.precio_unitario || 0
        return total + (precio * item.cantidad)
      }, 0)
      
      return {
        total_materiales,
        stock_bajo,
        sin_stock,
        valor_total
      }
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