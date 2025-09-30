import { supabase } from '../lib/supabase'
import type { Entrada } from '../types'

export const entradasService = {
  async getAll(): Promise<Entrada[]> {
    try {
      const { data, error } = await supabase
        .from('entradas')
        .select(`
          *,
          obra:obras(*),
          recibido_por_usuario:usuarios!entradas_recibido_por_fkey(*),
          verificado_por_usuario:usuarios!entradas_verificado_por_fkey(*),
          entrada_items(
            *,
            material:materiales(*)
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching entradas:', error)
      throw new Error('Error al obtener entradas')
    }
  },

  async getById(id: string): Promise<Entrada | null> {
    try {
      const { data, error } = await supabase
        .from('entradas')
        .select(`
          *,
          obra:obras(*),
          recibido_por_usuario:usuarios!entradas_recibido_por_fkey(*),
          verificado_por_usuario:usuarios!entradas_verificado_por_fkey(*),
          entrada_items(
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
      console.error('Error fetching entrada:', error)
      return null
    }
  },

  async create(entrada: {
    numero_entrada: string
    obra_id: string
    fecha_entrada: string
    proveedor?: string
    documento_referencia?: string
    observaciones?: string
    estado?: string
    recibido_por: string
  }) {
    const { data, error } = await supabase
      .from('entradas')
      .insert(entrada)
      .select(`
        *,
        obra:obras(*),
        recibido_por_usuario:usuarios!recibido_por(*)
      `)
      .single()

    if (error) {
      console.error('Error al crear entrada:', error)
      throw error
    }

    return data
  },

  async update(id: string, data: Partial<Omit<Entrada, 'id' | 'created_at'>>): Promise<Entrada> {
    try {
      const { data: updatedEntrada, error } = await supabase
        .from('entradas')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          obra:obras(*),
          recibido_por_usuario:usuarios!entradas_recibido_por_fkey(*),
          verificado_por_usuario:usuarios!entradas_verificado_por_fkey(*),
          entrada_items(
            *,
            material:materiales(*)
          )
        `)
        .single()
      
      if (error) throw error
      return updatedEntrada
    } catch (error) {
      console.error('Error updating entrada:', error)
      throw new Error('Error al actualizar entrada')
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('entradas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    } catch (error) {
      console.error('Error deleting entrada:', error)
      throw new Error('Error al eliminar entrada')
    }
  },

  async getByObra(obraId: string): Promise<Entrada[]> {
    try {
      const { data, error } = await supabase
        .from('entradas')
        .select(`
          *,
          obra:obras(*),
          recibido_por_usuario:usuarios!entradas_recibido_por_fkey(*),
          verificado_por_usuario:usuarios!entradas_verificado_por_fkey(*),
          entrada_items(
            *,
            material:materiales(*)
          )
        `)
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching entradas by obra:', error)
      throw new Error('Error al obtener entradas por obra')
    }
  },

  async getByMaterial(materialId: string): Promise<Entrada[]> {
    try {
      const { data, error } = await supabase
        .from('entradas')
        .select(`
          *,
          obra:obras(*),
          recibido_por_usuario:usuarios!entradas_recibido_por_fkey(*),
          verificado_por_usuario:usuarios!entradas_verificado_por_fkey(*),
          entrada_items(
            *,
            material:materiales(*)
          )
        `)
        .eq('entrada_items.material_id', materialId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching entradas by material:', error)
      throw new Error('Error al obtener entradas por material')
    }
  },

  async getByDateRange(fechaInicio: string, fechaFin: string): Promise<Entrada[]> {
    try {
      const { data, error } = await supabase
        .from('entradas')
        .select(`
          *,
          obra:obras(*),
          recibido_por_usuario:usuarios!entradas_recibido_por_fkey(*),
          verificado_por_usuario:usuarios!entradas_verificado_por_fkey(*),
          entrada_items(
            *,
            material:materiales(*)
          )
        `)
        .gte('fecha_entrada', fechaInicio)
        .lte('fecha_entrada', fechaFin)
        .order('fecha_entrada', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching entradas by date range:', error)
      throw new Error('Error al obtener entradas por rango de fechas')
    }
  }
}