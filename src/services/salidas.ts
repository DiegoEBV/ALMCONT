import { supabase } from '../lib/supabase'
import type { Salida, SalidaFormData } from '../types'
import { supabaseUsersService } from './supabaseUsersService'

export const salidasService = {
  async getById(id: string): Promise<Salida | null> {
    try {
      const { data, error } = await supabase
        .from('salidas')
        .select(`
          *,
          obra:obras(*),
          solicitado_por_usuario:usuarios!salidas_solicitado_por_fkey(*),
          autorizado_por_usuario:usuarios!salidas_autorizado_por_fkey(*),
          entregado_por_usuario:usuarios!salidas_entregado_por_fkey(*),
          salida_items(
            *,
            material:materiales(*)
          )
        `)
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data
    } catch (error) {
      console.error('Error fetching salida:', error)
      return null
    }
  },

  async getAll(): Promise<Salida[]> {
    try {
      const { data, error } = await supabase
        .from('salidas')
        .select(`
          *,
          obra:obras(*),
          solicitado_por_usuario:usuarios!salidas_solicitado_por_fkey(*),
          autorizado_por_usuario:usuarios!salidas_autorizado_por_fkey(*),
          entregado_por_usuario:usuarios!salidas_entregado_por_fkey(*),
          salida_items(
            *,
            material:materiales(*)
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching salidas:', error)
      throw new Error('Error al obtener salidas')
    }
  },

  // Obtener salidas por solicitante
  async getBySolicitante(solicitante: string, obraId?: string): Promise<Salida[]> {
    try {
      let query = supabase
        .from('salidas')
        .select(`
          *,
          obra:obras(*),
          solicitado_por_usuario:usuarios!salidas_solicitado_por_fkey(*),
          autorizado_por_usuario:usuarios!salidas_autorizado_por_fkey(*),
          entregado_por_usuario:usuarios!salidas_entregado_por_fkey(*),
          salida_items(
            *,
            material:materiales(*)
          )
        `)
        .ilike('responsable_recepcion', `%${solicitante}%`)
        .order('fecha_entrega', { ascending: false })

      if (obraId) {
        query = query.eq('obra_id', obraId)
      }

      const { data, error } = await query
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener salidas por solicitante:', error)
      return []
    }
  },

  // Obtener salidas por requerimiento
  async getByRequerimiento(requerimientoId: string): Promise<Salida[]> {
    try {
      const { data, error } = await supabase
        .from('salidas')
        .select(`
          *,
          obra:obras(*),
          solicitado_por_usuario:usuarios!salidas_solicitado_por_fkey(*),
          autorizado_por_usuario:usuarios!salidas_autorizado_por_fkey(*),
          entregado_por_usuario:usuarios!salidas_entregado_por_fkey(*),
          salida_items(
            *,
            material:materiales(*)
          )
        `)
        .eq('documento_referencia', requerimientoId)
        .order('fecha_entrega', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener salidas por requerimiento:', error)
      return []
    }
  },

  // Buscar salidas por número RQ
  async searchByNumeroRQ(numeroRq: string): Promise<Salida[]> {
    try {
      const { data, error } = await supabase
        .from('salidas')
        .select(`
          *,
          obra:obras(*),
          solicitado_por_usuario:usuarios!salidas_solicitado_por_fkey(*),
          autorizado_por_usuario:usuarios!salidas_autorizado_por_fkey(*),
          entregado_por_usuario:usuarios!salidas_entregado_por_fkey(*),
          salida_items(
            *,
            material:materiales(*)
          )
        `)
        .ilike('documento_referencia', `%${numeroRq}%`)
        .order('fecha_entrega', { ascending: false })
        .limit(50)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al buscar salidas por número RQ:', error)
      return []
    }
  },

  // Obtener salidas por material
  async getByMaterial(materialId: string, obraId?: string): Promise<Salida[]> {
    try {
      let query = supabase
        .from('salidas')
        .select(`
          *,
          obra:obras(*),
          solicitado_por_usuario:usuarios!salidas_solicitado_por_fkey(*),
          autorizado_por_usuario:usuarios!salidas_autorizado_por_fkey(*),
          entregado_por_usuario:usuarios!salidas_entregado_por_fkey(*),
          salida_items(
            *,
            material:materiales(*)
          )
        `)
        .eq('salida_items.material_id', materialId)
        .order('fecha_entrega', { ascending: false })

      if (obraId) {
        query = query.eq('obra_id', obraId)
      }

      const { data, error } = await query
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener salidas por material:', error)
      return []
    }
  },

  // Obtener salidas por rango de fechas
  async getByDateRange(fechaDesde: string, fechaHasta: string, obraId?: string): Promise<Salida[]> {
    try {
      let query = supabase
        .from('salidas')
        .select(`
          *,
          obra:obras(*),
          solicitado_por_usuario:usuarios!salidas_solicitado_por_fkey(*),
          autorizado_por_usuario:usuarios!salidas_autorizado_por_fkey(*),
          entregado_por_usuario:usuarios!salidas_entregado_por_fkey(*),
          salida_items(
            *,
            material:materiales(*)
          )
        `)
        .gte('fecha_entrega', fechaDesde)
        .lte('fecha_entrega', fechaHasta)
        .order('fecha_entrega', { ascending: false })

      if (obraId) {
        query = query.eq('obra_id', obraId)
      }

      const { data, error } = await query
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener salidas por rango de fechas:', error)
      return []
    }
  },

  // Verificar stock disponible antes de crear salida
  async verificarStockDisponible(obraId: string, materialId: string, cantidadSolicitada: number): Promise<{
    disponible: boolean
    stockActual: number
    mensaje: string
  }> {
    try {
      const { data: stockItem, error } = await supabase
        .from('stock_obra_material')
        .select('stock_actual')
        .eq('obra_id', obraId)
        .eq('material_id', materialId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      const stockActual = stockItem?.stock_actual || 0
      const disponible = stockActual >= cantidadSolicitada

      return {
        disponible,
        stockActual,
        mensaje: disponible 
          ? 'Stock suficiente disponible'
          : `Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidadSolicitada}`
      }
    } catch (error) {
      console.error('Error al verificar stock:', error)
      return {
        disponible: false,
        stockActual: 0,
        mensaje: 'Error al verificar stock disponible'
      }
    }
  },

  // Crear nueva salida
  async create(salidaData: SalidaFormData): Promise<Salida> {
    try {
      // Verificar stock disponible
      const stockCheck = await this.verificarStockDisponible(
        salidaData.obra_id,
        salidaData.material_id,
        salidaData.cantidad_entregada
      )

      if (!stockCheck.disponible) {
        throw new Error(stockCheck.mensaje)
      }

      const { count } = await supabase
        .from('salidas')
        .select('*', { count: 'exact', head: true })
      const numeroSalida = `SAL-${String((count || 0) + 1).padStart(6, '0')}`

      let solicitanteId: string | null = null
      if (salidaData.created_by) {
        const usuarioExistente = await supabaseUsersService.getByEmail(salidaData.created_by)
        if (usuarioExistente) {
          solicitanteId = usuarioExistente.id
        } else {
          const nuevoUsuario = await supabaseUsersService.ensureUser(salidaData.created_by, {
            email: salidaData.created_by,
            nombre: salidaData.solicitante || salidaData.created_by,
            apellido: '',
            rol: 'ALMACENERO',
            obra_id: salidaData.obra_id,
            activo: true
          })
          solicitanteId = nuevoUsuario?.id || null
        }
      }
      if (!solicitanteId) {
        throw new Error('Usuario solicitante no válido')
      }

      const payloadSalida = {
        obra_id: salidaData.obra_id,
        fecha_salida: salidaData.fecha_salida,
        numero_salida: numeroSalida,
        documento_referencia: salidaData.documento_referencia,
        observaciones: salidaData.observaciones,
        estado: 'ENTREGADO',
        solicitado_por: solicitanteId
      }

      const { data: salidaHeader, error: salidaError } = await supabase
        .from('salidas')
        .insert(payloadSalida)
        .select('id, obra_id, numero_salida, fecha_salida')
        .single()
      if (salidaError) throw salidaError

      const payloadItem = {
        salida_id: salidaHeader.id,
        material_id: salidaData.material_id,
        cantidad_solicitada: salidaData.cantidad,
        cantidad_entregada: salidaData.cantidad_entregada,
        observaciones: salidaData.observaciones
      }

      const { error: itemError } = await supabase
        .from('salida_items')
        .insert(payloadItem)
      if (itemError) throw itemError

      const { data, error } = await supabase
        .from('salidas')
        .select(`
          *,
          obra:obras(*),
          solicitado_por_usuario:usuarios!salidas_solicitado_por_fkey(*),
          autorizado_por_usuario:usuarios!salidas_autorizado_por_fkey(*),
          entregado_por_usuario:usuarios!salidas_entregado_por_fkey(*),
          salida_items(
            *,
            material:materiales(*)
          )
        `)
        .eq('id', salidaHeader.id)
        .single()

      if (error) throw error

      await this.updateStock(salidaData.obra_id, salidaData.material_id, -salidaData.cantidad_entregada)

      return data
    } catch (error) {
      console.error('Error al crear salida:', error)
      throw error
    }
  },

  // Crear múltiples salidas
  async createBatch(salidasData: SalidaFormData[]): Promise<Salida[]> {
    try {
      const salidas: Salida[] = []
      
      for (const salidaData of salidasData) {
        const salida = await this.create(salidaData)
        salidas.push(salida)
      }
      
      return salidas
    } catch (error) {
      console.error('Error al crear salidas en lote:', error)
      throw error
    }
  },

  // Actualizar salida
  async update(id: string, salidaData: Partial<SalidaFormData>): Promise<Salida> {
    try {
      const salidaExistente = await this.getById(id)
      if (!salidaExistente) {
        throw new Error('Salida no encontrada')
      }

      

      const { data, error } = await supabase
        .from('salidas')
        .update(salidaData)
        .eq('id', id)
        .select(`
          *,
          obra:obras(*),
          solicitado_por_usuario:usuarios!salidas_solicitado_por_fkey(*),
          autorizado_por_usuario:usuarios!salidas_autorizado_por_fkey(*),
          entregado_por_usuario:usuarios!salidas_entregado_por_fkey(*),
          salida_items(
            *,
            material:materiales(*)
          )
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al actualizar salida:', error)
      throw error
    }
  },

  // Eliminar salida
  async delete(id: string): Promise<void> {
    try {
      const salida = await this.getById(id)
      if (!salida) {
        throw new Error('Salida no encontrada')
      }

      const items = (salida as any)?.salida_items || []
      for (const item of items) {
        const cantidad = item.cantidad_entregada || item.cantidad_autorizada || item.cantidad_solicitada || 0
        await this.updateStock(salida.obra_id, item.material_id, cantidad)
      }

      const { error } = await supabase
        .from('salidas')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error al eliminar salida:', error)
      throw error
    }
  },

  // Actualizar stock en la tabla stock_obra_material
  async updateStock(obraId: string, materialId: string, cantidadDelta: number): Promise<void> {
    try {
      // Verificar si existe registro de stock
      const { data: stockExistente, error: selectError } = await supabase
        .from('stock_obra_material')
        .select('*')
        .eq('obra_id', obraId)
        .eq('material_id', materialId)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError
      }

      if (stockExistente) {
        // Actualizar stock existente
        const nuevaCantidad = stockExistente.stock_actual + cantidadDelta

        const { error: updateError } = await supabase
          .from('stock_obra_material')
          .update({
            stock_actual: Math.max(0, nuevaCantidad) // No permitir stock negativo
          })
          .eq('id', stockExistente.id)

        if (updateError) throw updateError
      } else if (cantidadDelta > 0) {
        // Solo crear nuevo registro si la cantidad es positiva
        const { error: insertError } = await supabase
          .from('stock_obra_material')
          .insert({
            obra_id: obraId,
            material_id: materialId,
            stock_actual: cantidadDelta,
            stock_minimo: 10
          })

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('Error al actualizar stock:', error)
    }
  },

  // Obtener resumen de salidas por material
  async getResumenPorMaterial(obraId: string, materialId: string): Promise<{
    total_salidas: number
    cantidad_total: number
    ultima_salida: string | null
  }> {
    try {
      const { data: items, error } = await supabase
        .from('salida_items')
        .select('cantidad_entregada, salida:salidas(fecha_salida, obra_id)')
        .eq('material_id', materialId)
        .eq('salida.obra_id', obraId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const totalSalidas = items?.length || 0
      const cantidadTotal = (items || []).reduce((sum, it: any) => sum + (it.cantidad_entregada || 0), 0)
      const ultimaSalida = items?.[0]?.salida?.fecha_salida || null

      return {
        total_salidas: totalSalidas,
        cantidad_total: cantidadTotal,
        ultima_salida: ultimaSalida
      }
    } catch (error) {
      console.error('Error al obtener resumen de salidas:', error)
      return { total_salidas: 0, cantidad_total: 0, ultima_salida: null }
    }
  }
}
