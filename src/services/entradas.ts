import { localDB } from '../lib/localDB'
import type { Entrada } from '../types'

export const entradasService = {
  async getAll(): Promise<Entrada[]> {
    try {
      return localDB.getWithRelations('entradas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        usuario: { table: 'usuarios', key: 'created_by' }
      })
    } catch (error) {
      console.error('Error fetching entradas:', error)
      throw new Error('Error al obtener entradas')
    }
  },

  async getById(id: string): Promise<Entrada | null> {
    try {
      const entradas = await localDB.getWithRelations('entradas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        usuario: { table: 'usuarios', key: 'created_by' }
      })
      return entradas.find(e => e.id === id) || null
    } catch (error) {
      console.error('Error fetching entrada:', error)
      return null
    }
  },

  async create(data: Omit<Entrada, 'id' | 'created_at' | 'updated_at'>): Promise<Entrada> {
    try {
      const newEntrada = await localDB.create('entradas', {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      // Obtener con relaciones
      const entradas = await localDB.getWithRelations('entradas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        usuario: { table: 'usuarios', key: 'created_by' }
      })
      
      return entradas.find(e => e.id === newEntrada.id)!
    } catch (error) {
      console.error('Error creating entrada:', error)
      throw new Error('Error al crear entrada')
    }
  },

  async update(id: string, data: Partial<Omit<Entrada, 'id' | 'created_at'>>): Promise<Entrada> {
    try {
      await localDB.update('entradas', id, {
        ...data,
        updated_at: new Date().toISOString()
      })
      
      // Obtener con relaciones
      const entradas = await localDB.getWithRelations('entradas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        usuario: { table: 'usuarios', key: 'created_by' }
      })
      
      return entradas.find(e => e.id === id)!
    } catch (error) {
      console.error('Error updating entrada:', error)
      throw new Error('Error al actualizar entrada')
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await localDB.delete('entradas', id)
    } catch (error) {
      console.error('Error deleting entrada:', error)
      throw new Error('Error al eliminar entrada')
    }
  },

  async getByObra(obraId: string): Promise<Entrada[]> {
    try {
      const entradas = await localDB.getWithRelations('entradas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        usuario: { table: 'usuarios', key: 'created_by' }
      })
      return entradas.filter(e => e.obra_id === obraId)
    } catch (error) {
      console.error('Error fetching entradas by obra:', error)
      throw new Error('Error al obtener entradas por obra')
    }
  },

  async getByMaterial(materialId: string): Promise<Entrada[]> {
    try {
      const entradas = await localDB.getWithRelations('entradas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        usuario: { table: 'usuarios', key: 'created_by' }
      })
      return entradas.filter(e => e.material_id === materialId)
    } catch (error) {
      console.error('Error fetching entradas by material:', error)
      throw new Error('Error al obtener entradas por material')
    }
  },

  async getByDateRange(fechaInicio: string, fechaFin: string): Promise<Entrada[]> {
    try {
      const entradas = await localDB.getWithRelations('entradas', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        material: { table: 'materiales', key: 'material_id' },
        usuario: { table: 'usuarios', key: 'created_by' }
      })
      return entradas.filter(e => 
        e.fecha_entrada >= fechaInicio && e.fecha_entrada <= fechaFin
      ).sort((a, b) => new Date(b.fecha_entrada).getTime() - new Date(a.fecha_entrada).getTime())
    } catch (error) {
      console.error('Error fetching entradas by date range:', error)
      throw new Error('Error al obtener entradas por rango de fechas')
    }
  }
}