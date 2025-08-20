import { localDB } from '../lib/localDB'
import type { Salida, SalidaFormData } from '../types'

export const salidasService = {
  async getById(id: string): Promise<Salida | null> {
    try {
      const salidas = await localDB.getWithRelations('salidas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        usuario: { table: 'usuarios', key: 'created_by' }
      })
      return salidas.find(s => s.id === id) || null
    } catch (error) {
      console.error('Error fetching salida:', error)
      return null
    }
  },

  async getAll(): Promise<Salida[]> {
    try {
      return localDB.getWithRelations('salidas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        usuario: { table: 'usuarios', key: 'created_by' }
      })
    } catch (error) {
      console.error('Error fetching salidas:', error)
      throw new Error('Error al obtener salidas')
    }
  },

  // Obtener salidas por solicitante
  async getBySolicitante(solicitante: string, obraId?: string): Promise<Salida[]> {
    try {
      const salidas = await localDB.getWithRelations('salidas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        requerimiento: { table: 'requerimientos', key: 'requerimiento_id' }
      })

      let filteredSalidas = salidas.filter(salida => 
        salida.solicitante?.toLowerCase().includes(solicitante.toLowerCase())
      )

      if (obraId) {
        filteredSalidas = filteredSalidas.filter(salida => salida.obra_id === obraId)
      }

      // Ordenar por fecha descendente
      filteredSalidas.sort((a, b) => new Date(b.fecha_entrega).getTime() - new Date(a.fecha_entrega).getTime())

      return filteredSalidas
    } catch (error) {
      console.error('Error al obtener salidas por solicitante:', error)
      return []
    }
  },

  // Obtener salidas por requerimiento
  async getByRequerimiento(requerimientoId: string): Promise<Salida[]> {
    try {
      const salidas = await localDB.getWithRelations('salidas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        requerimiento: { table: 'requerimientos', key: 'requerimiento_id' }
      })

      const filteredSalidas = salidas.filter(salida => salida.requerimiento_id === requerimientoId)

      // Ordenar por fecha descendente
      filteredSalidas.sort((a, b) => new Date(b.fecha_entrega).getTime() - new Date(a.fecha_entrega).getTime())

      return filteredSalidas
    } catch (error) {
      console.error('Error al obtener salidas por requerimiento:', error)
      return []
    }
  },

  // Buscar salidas por número RQ
  async searchByNumeroRQ(numeroRq: string): Promise<Salida[]> {
    try {
      const salidas = await localDB.getWithRelations('salidas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        requerimiento: { table: 'requerimientos', key: 'requerimiento_id' }
      })

      const filteredSalidas = salidas.filter(salida => 
        salida.requerimiento?.numero_rq?.toLowerCase().includes(numeroRq.toLowerCase())
      )

      // Ordenar por fecha descendente y limitar a 50
      filteredSalidas.sort((a, b) => new Date(b.fecha_entrega).getTime() - new Date(a.fecha_entrega).getTime())

      return filteredSalidas.slice(0, 50)
    } catch (error) {
      console.error('Error al buscar salidas por número RQ:', error)
      return []
    }
  },

  // Obtener salidas por material
  async getByMaterial(materialId: string, obraId?: string): Promise<Salida[]> {
    try {
      const salidas = await localDB.getWithRelations('salidas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        requerimiento: { table: 'requerimientos', key: 'requerimiento_id' }
      })

      let filteredSalidas = salidas.filter(salida => salida.material_id === materialId)

      if (obraId) {
        filteredSalidas = filteredSalidas.filter(salida => salida.obra_id === obraId)
      }

      // Ordenar por fecha descendente
      filteredSalidas.sort((a, b) => new Date(b.fecha_entrega).getTime() - new Date(a.fecha_entrega).getTime())

      return filteredSalidas
    } catch (error) {
      console.error('Error al obtener salidas por material:', error)
      return []
    }
  },

  // Obtener salidas por rango de fechas
  async getByDateRange(fechaDesde: string, fechaHasta: string, obraId?: string): Promise<Salida[]> {
    try {
      const salidas = await localDB.getWithRelations('salidas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        requerimiento: { table: 'requerimientos', key: 'requerimiento_id' }
      })

      let filteredSalidas = salidas.filter(salida => 
        salida.fecha_entrega >= fechaDesde && salida.fecha_entrega <= fechaHasta
      )

      if (obraId) {
        filteredSalidas = filteredSalidas.filter(salida => salida.obra_id === obraId)
      }

      // Ordenar por fecha descendente
      filteredSalidas.sort((a, b) => new Date(b.fecha_entrega).getTime() - new Date(a.fecha_entrega).getTime())

      return filteredSalidas
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
      const stockItems = await localDB.get('stock_obra_material')
      const stockItem = stockItems.find(item => 
        item.obra_id === obraId && item.material_id === materialId
      )

      const stockActual = stockItem?.cantidad_actual || 0
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

  // Crear salida con validación de stock
  async create(salida: SalidaFormData): Promise<Salida | null> {
    try {
      // Verificar stock disponible
      const stockCheck = await this.verificarStockDisponible(
        salida.obra_id,
        salida.material_id,
        salida.cantidad
      )

      if (!stockCheck.disponible) {
        console.error('Stock insuficiente:', stockCheck.mensaje)
        throw new Error(stockCheck.mensaje)
      }

      // Crear la salida
      const salidaData = await localDB.create('salidas', {
        ...salida,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      if (!salidaData) {
        console.error('Error al crear salida')
        return null
      }

      // Obtener con relaciones
      const salidaCompleta = await localDB.getWithRelations('salidas', [salidaData.id], {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        requerimiento: { table: 'requerimientos', key: 'requerimiento_id' }
      })

      // Actualizar stock (restar cantidad)
      await this.updateStock(salida.obra_id, salida.material_id, -salida.cantidad_entregada)

      return salidaCompleta && salidaCompleta[0] ? salidaCompleta[0] : null
    } catch (error) {
      console.error('Error al crear salida:', error)
      return null
    }
  },

  // Crear múltiples salidas
  async createBatch(salidas: SalidaFormData[]): Promise<Salida[]> {
    try {
      // Verificar stock para todas las salidas
      for (const salida of salidas) {
        const stockCheck = await this.verificarStockDisponible(
          salida.obra_id,
          salida.material_id,
          salida.cantidad
        )

        if (!stockCheck.disponible) {
          throw new Error(`Stock insuficiente para material ${salida.material_id}: ${stockCheck.mensaje}`)
        }
      }

      const salidasCreadas = []
      
      for (const salida of salidas) {
        const salidaData = await localDB.create('salidas', {
          ...salida,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        if (salidaData) {
          // Obtener con relaciones
          const salidaCompleta = await localDB.getWithRelations('salidas', [salidaData.id], {
            obra: { table: 'obras', key: 'obra_id' },
            material: { table: 'materiales', key: 'material_id' },
            requerimiento: { table: 'requerimientos', key: 'requerimiento_id' }
          })
          
          if (salidaCompleta && salidaCompleta[0]) {
            salidasCreadas.push(salidaCompleta[0])
          }
        }
      }

      // Actualizar stock para cada salida
      for (const salida of salidas) {
        await this.updateStock(salida.obra_id, salida.material_id, -salida.cantidad_entregada)
      }

      return salidasCreadas
    } catch (error) {
      console.error('Error al crear salidas en lote:', error)
      return []
    }
  },

  // Actualizar salida
  async update(id: string, updates: Partial<SalidaFormData>): Promise<Salida | null> {
    try {
      // Obtener salida actual para calcular diferencia de stock
      const salidaActual = await this.getById(id)
      if (!salidaActual) {
        console.error('Salida no encontrada')
        return null
      }

      // Si se está cambiando la cantidad, verificar stock
      if (updates.cantidad_entregada !== undefined && updates.cantidad_entregada !== salidaActual.cantidad_entregada) {
        const diferencia = updates.cantidad_entregada - salidaActual.cantidad_entregada
        
        if (diferencia > 0) {
          // Se está aumentando la cantidad, verificar stock disponible
          const stockCheck = await this.verificarStockDisponible(
            salidaActual.obra_id,
            salidaActual.material_id,
            diferencia
          )

          if (!stockCheck.disponible) {
            throw new Error(stockCheck.mensaje)
          }
        }
      }

      const salidaActualizada = await localDB.update('salidas', id, {
        ...updates,
        updated_at: new Date().toISOString()
      })

      if (!salidaActualizada) {
        console.error('Error al actualizar salida')
        return null
      }

      // Obtener con relaciones
      const salidaCompleta = await localDB.getWithRelations('salidas', [id], {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        requerimiento: { table: 'requerimientos', key: 'requerimiento_id' }
      })

      // Si cambió la cantidad, actualizar stock
      if (updates.cantidad_entregada !== undefined && updates.cantidad_entregada !== salidaActual.cantidad_entregada) {
        const diferencia = updates.cantidad_entregada - salidaActual.cantidad_entregada
        await this.updateStock(salidaActual.obra_id, salidaActual.material_id, -diferencia)
      }

      return salidaCompleta && salidaCompleta[0] ? salidaCompleta[0] : null
    } catch (error) {
      console.error('Error al actualizar salida:', error)
      return null
    }
  },

  // Eliminar salida
  async delete(id: string): Promise<boolean> {
    try {
      // Obtener salida para revertir stock
      const salida = await this.getById(id)
      if (!salida) {
        console.error('Salida no encontrada')
        return false
      }

      const eliminado = await localDB.delete('salidas', id)

      if (!eliminado) {
        console.error('Error al eliminar salida')
        return false
      }

      // Revertir stock (sumar la cantidad de la salida)
      await this.updateStock(salida.obra_id, salida.material_id, salida.cantidad_entregada)

      return true
    } catch (error) {
      console.error('Error al eliminar salida:', error)
      return false
    }
  },

  // Actualizar stock en la tabla stock_obra_material
  async updateStock(obraId: string, materialId: string, cantidadDelta: number): Promise<void> {
    try {
      // Verificar si existe registro de stock
      const stockData = await localDB.get('stock_obra_material')
      const stockExistente = stockData.find(stock => 
        stock.obra_id === obraId && stock.material_id === materialId
      )

      if (stockExistente) {
        // Actualizar stock existente
        const nuevaCantidad = stockExistente.cantidad_actual + cantidadDelta

      await localDB.update('stock_obra_material', stockExistente.id, {
        cantidad_actual: Math.max(0, nuevaCantidad), // No permitir stock negativo
          updated_at: new Date().toISOString()
        })
      } else if (cantidadDelta > 0) {
        // Solo crear nuevo registro si la cantidad es positiva
        await localDB.create('stock_obra_material', {
          id: crypto.randomUUID(),
          obra_id: obraId,
          material_id: materialId,
          cantidad_actual: cantidadDelta,
        cantidad_minima: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
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
      const salidas = await localDB.get('salidas')
      const salidasFiltradas = salidas
        .filter(salida => salida.obra_id === obraId && salida.material_id === materialId)
        .sort((a, b) => new Date(b.fecha_entrega).getTime() - new Date(a.fecha_entrega).getTime())

      const totalSalidas = salidasFiltradas.length
      const cantidadTotal = salidasFiltradas.reduce((sum, salida) => sum + salida.cantidad_entregada, 0)
      const ultimaSalida = salidasFiltradas[0]?.fecha_entrega || null

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