import { supabase } from '../lib/supabase'
import type { Entrada, Salida, CreateStockData, UpdateStockData, Stock } from '../types'

export const stockService = {
  async getAll(): Promise<Stock[]> {
    try {
      const { data, error } = await supabase
        .from('stock_obra_material')
        .select(`
          *,
          obra:obras(*),
          material:materiales(*)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching stock:', error)
      throw new Error('Error al obtener stock')
    }
  },

  async getById(id: string): Promise<Stock | null> {
    try {
      const { data, error } = await supabase
        .from('stock_obra_material')
        .select(`
          *,
          obra:obras(*),
          material:materiales(*)
        `)
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // No rows returned
        throw error
      }
      return data
    } catch (error) {
      console.error('Error fetching stock:', error)
      return null
    }
  },

  async create(data: CreateStockData): Promise<Stock> {
    try {
      const { data: newStock, error } = await supabase
        .from('stock_obra_material')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          obra:obras(*),
          material:materiales(*)
        `)
        .single()
      
      if (error) throw error
      return newStock
    } catch (error) {
      console.error('Error creating stock:', error)
      throw new Error('Error al crear stock')
    }
  },

  async update(id: string, data: UpdateStockData): Promise<Stock> {
    try {
      const { data: updatedStock, error } = await supabase
        .from('stock_obra_material')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          obra:obras(*),
          material:materiales(*)
        `)
        .single()
      
      if (error) throw error
      return updatedStock
    } catch (error) {
      console.error('Error updating stock:', error)
      throw new Error('Error al actualizar stock')
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('stock_obra_material')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    } catch (error) {
      console.error('Error deleting stock:', error)
      throw new Error('Error al eliminar stock')
    }
  },

  async getByObra(obraId: string): Promise<Stock[]> {
    try {
      const { data, error } = await supabase
        .from('stock_obra_material')
        .select(`
          *,
          obra:obras(*),
          material:materiales(*)
        `)
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching stock by obra:', error)
      throw new Error('Error al obtener stock por obra')
    }
  },

  async getByMaterial(materialId: string): Promise<Stock[]> {
    try {
      const { data, error } = await supabase
        .from('stock_obra_material')
        .select(`
          *,
          obra:obras(*),
          material:materiales(*)
        `)
        .eq('material_id', materialId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching stock by material:', error)
      throw new Error('Error al obtener stock por material')
    }
  },

  async getLowStock(threshold: number = 10): Promise<Stock[]> {
    try {
      const { data, error } = await supabase
        .from('stock_obra_material')
        .select(`
          *,
          obra:obras(*),
          material:materiales(*)
        `)
        .lt('stock_actual', threshold)
        .order('stock_actual', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching low stock:', error)
      throw new Error('Error al obtener stock bajo')
    }
  },

  // Obtener stock por obra y material
  async getByObraAndMaterial(obraId: string, materialId: string): Promise<Stock | null> {
    try {
      const { data, error } = await supabase
        .from('stock_obra_material')
        .select(`
          *,
          obra:obras(*),
          material:materiales(*)
        `)
        .eq('obra_id', obraId)
        .eq('material_id', materialId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // No rows returned
        throw error
      }
      return data
    } catch (error) {
      console.error('Error al obtener stock:', error)
      return null
    }
  },

  // Obtener todo el stock con filtros
  async getAllWithFilters(filters?: {
    obraId?: string
    materialId?: string
    categoria?: string
    soloConStock?: boolean
    busqueda?: string
  }): Promise<Stock[]> {
    try {
      let query = supabase
        .from('stock_obra_material')
        .select(`
          *,
          obra:obras(*),
          material:materiales(*)
        `)

      // Aplicar filtros
      if (filters?.obraId) {
        query = query.eq('obra_id', filters.obraId)
      }

      if (filters?.materialId) {
        query = query.eq('material_id', filters.materialId)
      }

      if (filters?.soloConStock) {
        query = query.gt('stock_actual', 0)
      }

      const { data: stocks, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      
      let filteredStocks = stocks || []

      // Filtros que requieren procesamiento en el cliente
      if (filters?.categoria) {
        filteredStocks = filteredStocks.filter(s => s.material?.categoria === filters.categoria)
      }

      if (filters?.busqueda) {
        const busqueda = filters.busqueda.toLowerCase()
        filteredStocks = filteredStocks.filter(s => 
          s.material?.codigo?.toLowerCase().includes(busqueda) ||
          s.material?.descripcion?.toLowerCase().includes(busqueda) ||
          s.obra?.nombre?.toLowerCase().includes(busqueda) ||
          s.obra?.codigo?.toLowerCase().includes(busqueda)
        )
      }

      return filteredStocks
    } catch (error) {
      console.error('Error al obtener stock:', error)
      return []
    }
  },

  // Obtener materiales con stock bajo (cantidad < mínimo)
  async getStockBajo(obraId?: string, cantidadMinima: number = 10): Promise<Stock[]> {
    try {
      let query = supabase
        .from('stock_obra_material')
        .select(`
          *,
          obra:obras(*),
          material:materiales(*)
        `)
        .lt('stock_actual', cantidadMinima)
        .gt('stock_actual', 0)

      if (obraId) {
        query = query.eq('obra_id', obraId)
      }

      const { data, error } = await query.order('stock_actual', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener stock bajo:', error)
      return []
    }
  },

  // Obtener estadísticas de stock por obra
  async getEstadisticasObra(obraId: string): Promise<{
    total_materiales: number
    materiales_con_stock: number
    materiales_sin_stock: number
    valor_total_stock: number
    categorias: { categoria: string; cantidad_materiales: number; cantidad_total: number }[]
  }> {
    try {
      const { data: stocks, error } = await supabase
        .from('stock_obra_material')
        .select(`
          *,
          material:materiales(*)
        `)
        .eq('obra_id', obraId)

      if (error) throw error
      
      const todosMateriales = stocks || []
      const totalMateriales = todosMateriales.length
      const materialesConStock = todosMateriales.filter(m => m.stock_actual > 0).length
      const materialesSinStock = totalMateriales - materialesConStock

      // Agrupar por categorías
      const categorias = new Map<string, { cantidad_materiales: number; cantidad_total: number }>()
      
      todosMateriales.forEach(item => {
        const categoria = item.material?.categoria || 'Sin categoría'
        const existing = categorias.get(categoria) || { cantidad_materiales: 0, cantidad_total: 0 }
        
        categorias.set(categoria, {
          cantidad_materiales: existing.cantidad_materiales + 1,
          cantidad_total: existing.cantidad_total + item.stock_actual
        })
      })

      const categoriasArray = Array.from(categorias.entries()).map(([categoria, datos]) => ({
        categoria,
        ...datos
      }))

      return {
        total_materiales: totalMateriales,
        materiales_con_stock: materialesConStock,
        materiales_sin_stock: materialesSinStock,
        valor_total_stock: 0, // Se podría calcular si se tiene precio unitario
        categorias: categoriasArray
      }
    } catch (error) {
      console.error('Error al obtener estadísticas de obra:', error)
      return {
        total_materiales: 0,
        materiales_con_stock: 0,
        materiales_sin_stock: 0,
        valor_total_stock: 0,
        categorias: []
      }
    }
  },

  // Recalcular stock basado en entradas y salidas
  async recalcularStock(obraId: string, materialId?: string): Promise<boolean> {
    try {
      // Obtener materiales
      let materialesQuery = supabase.from('materiales').select('*')
      
      if (materialId) {
        materialesQuery = materialesQuery.eq('id', materialId)
      }
      
      const { data: materiales, error: materialesError } = await materialesQuery
      if (materialesError) throw materialesError

      for (const material of materiales || []) {
        // Calcular total de entradas
        const { data: entradas, error: entradasError } = await supabase
          .from('entradas')
          .select('cantidad_atendida')
          .eq('obra_id', obraId)
          .eq('material_id', material.id)
          .eq('estado', 'VERIFICADO') // Solo entradas verificadas
        
        if (entradasError) throw entradasError

        // Calcular total de salidas
        const { data: salidas, error: salidasError } = await supabase
          .from('salidas')
          .select('cantidad_entregada')
          .eq('obra_id', obraId)
          .eq('material_id', material.id)
          .eq('estado', 'ENTREGADO') // Solo salidas entregadas
        
        if (salidasError) throw salidasError

        const totalEntradas = (entradas || []).reduce((sum, e) => sum + (e.cantidad_atendida || 0), 0)
        const totalSalidas = (salidas || []).reduce((sum, s) => sum + (s.cantidad_entregada || 0), 0)
        const stockCalculado = totalEntradas - totalSalidas

        // Verificar si existe registro de stock
        const { data: stockExistente, error: stockError } = await supabase
          .from('stock_obra_material')
          .select('id')
          .eq('obra_id', obraId)
          .eq('material_id', material.id)
          .single()

        if (stockError && stockError.code !== 'PGRST116') throw stockError

        if (stockExistente) {
          // Actualizar stock existente
          const { error: updateError } = await supabase
            .from('stock_obra_material')
            .update({
              stock_actual: Math.max(0, stockCalculado),
              updated_at: new Date().toISOString()
            })
            .eq('id', stockExistente.id)
          
          if (updateError) throw updateError
        } else if (stockCalculado > 0) {
          // Crear nuevo registro solo si hay stock positivo
          const { error: insertError } = await supabase
            .from('stock_obra_material')
            .insert({
              obra_id: obraId,
              material_id: material.id,
              stock_actual: stockCalculado,
              stock_minimo: 10,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (insertError) throw insertError
        }
      }

      return true
    } catch (error) {
      console.error('Error al recalcular stock:', error)
      return false
    }
  },

  // Obtener historial de movimientos (kardex)
  async getKardex(obraId: string, materialId: string, fechaDesde?: string, fechaHasta?: string): Promise<{
    entradas: Entrada[]
    salidas: Salida[]
    movimientos: Array<(Entrada & { tipo: 'ENTRADA'; fecha: string; cantidad: number; saldo_acumulado: number }) | (Salida & { tipo: 'SALIDA'; fecha: string; cantidad: number; saldo_acumulado: number })>
  }> {
    try {
      // Obtener entradas
      let entradasQuery = supabase
        .from('entradas')
        .select('*')
        .eq('obra_id', obraId)
        .eq('material_id', materialId)
        .order('fecha_entrada', { ascending: true })

      if (fechaDesde) {
        entradasQuery = entradasQuery.gte('fecha_entrada', fechaDesde)
      }
      if (fechaHasta) {
        entradasQuery = entradasQuery.lte('fecha_entrada', fechaHasta)
      }

      const { data: entradas, error: entradasError } = await entradasQuery
      if (entradasError) throw entradasError

      // Obtener salidas
      let salidasQuery = supabase
        .from('salidas')
        .select('*')
        .eq('obra_id', obraId)
        .eq('material_id', materialId)
        .order('fecha_entrega', { ascending: true })

      if (fechaDesde) {
        salidasQuery = salidasQuery.gte('fecha_entrega', fechaDesde)
      }
      if (fechaHasta) {
        salidasQuery = salidasQuery.lte('fecha_entrega', fechaHasta)
      }

      const { data: salidas, error: salidasError } = await salidasQuery
      if (salidasError) throw salidasError

      // Combinar y ordenar movimientos
      const entradasConTipo = (entradas || []).map(e => ({
        ...e,
        tipo: 'ENTRADA' as const,
        fecha: e.fecha_entrada,
        cantidad: e.cantidad_atendida
      }))
      
      const salidasConTipo = (salidas || []).map(s => ({
        ...s,
        tipo: 'SALIDA' as const,
        fecha: s.fecha_entrega,
        cantidad: s.cantidad_entregada
      }))
      
      const movimientos = [...entradasConTipo, ...salidasConTipo]
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

      // Calcular saldo acumulado
      let saldoAcumulado = 0
      const movimientosConSaldo = movimientos.map(mov => {
        if (mov.tipo === 'ENTRADA') {
          saldoAcumulado += mov.cantidad
        } else {
          saldoAcumulado -= mov.cantidad
        }
        
        return {
          ...mov,
          saldo_acumulado: saldoAcumulado
        }
      })

      return {
        entradas: entradas || [],
        salidas: salidas || [],
        movimientos: movimientosConSaldo
      }
    } catch (error) {
      console.error('Error al obtener kardex:', error)
      return {
        entradas: [],
        salidas: [],
        movimientos: []
      }
    }
  },

  // Exportar stock a CSV
  async exportarCSV(obraId?: string): Promise<string> {
    try {
      const stock = await this.getAllWithFilters({ obraId, soloConStock: true })
      
      const headers = [
        'Obra',
        'Código Obra',
        'Material',
        'Código Material',
        'Descripción',
        'Unidad',
        'Categoría',
        'Stock Actual',
        'Última Actualización'
      ]

      const rows = stock.map(item => [
        item.obra?.nombre || '',
        item.obra?.codigo || '',
        item.material?.codigo || '',
        item.material?.codigo || '',
        item.material?.descripcion || '',
        item.material?.unidad || '',
        item.material?.categoria || '',
        item.stock_actual.toString(),
        item.updated_at || item.created_at
      ])

      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n')

      return csvContent
    } catch (error) {
      console.error('Error al exportar CSV:', error)
      return ''
    }
  }
}