import { supabase } from '../lib/supabase'
import type { Obra } from '../types'
import { localAuth } from './localAuth'
import { mapLocalIdToUUID } from '../utils/idMapper'

export const obrasService = {
  async getAll(): Promise<Obra[]> {
    try {
      try {
        const current = localAuth.getCurrentUser()
        if (current) {
          const userUUID = await mapLocalIdToUUID(current.id, 'usuario')
          await supabase.rpc('set_user_context', { user_id: userUUID || current.supabaseId, user_role: current.rol })
        }
      } catch (e) {
        console.warn('No se pudo establecer contexto de usuario para obras', e)
      }
      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching obras:', error)
      throw new Error('Error al obtener obras')
    }
  },

  async getById(id: string): Promise<Obra | null> {
    try {
      // Validar que el ID sea un UUID válido
      if (!id || typeof id !== 'string') {
        console.error('Error: ID de obra inválido:', id)
        return null
      }

      // Verificar formato UUID básico
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        console.error('Error: ID de obra no es un UUID válido:', id)
        return null
      }

      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // No rows returned
        console.error('Error en consulta de obra:', error)
        throw error
      }
      return data
    } catch (error) {
      console.error('Error fetching obra:', error)
      return null
    }
  },

  async create(data: Omit<Obra, 'id' | 'created_at' | 'updated_at'>): Promise<Obra> {
    try {
      // Convertir responsable a responsable_id si es necesario
      const obraData = {
        ...data,
        responsable_id: data.responsable_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Remover el campo responsable si existe para evitar conflictos
      delete obraData.responsable
      
      const { data: newObra, error } = await supabase
        .from('obras')
        .insert(obraData)
        .select()
        .single()
      
      if (error) throw error
      return newObra
    } catch (error) {
      console.error('Error creating obra:', error)
      throw new Error('Error al crear obra')
    }
  },

  async update(id: string, data: Partial<Omit<Obra, 'id' | 'created_at'>>): Promise<Obra> {
    try {
      // Preparar datos para actualización
      const updateData = {
        ...data,
        responsable_id: data.responsable_id || null,
        updated_at: new Date().toISOString()
      }
      
      // Remover el campo responsable si existe para evitar conflictos
      delete updateData.responsable
      
      console.log('Actualizando obra con datos:', updateData)
      
      const { data: updatedObra, error } = await supabase
        .from('obras')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Error de Supabase al actualizar:', error)
        throw error
      }
      
      console.log('Obra actualizada exitosamente:', updatedObra)
      return updatedObra
    } catch (error) {
      console.error('Error updating obra:', error)
      throw new Error('Error al actualizar obra')
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    } catch (error) {
      console.error('Error deleting obra:', error)
      throw new Error('Error al eliminar obra')
    }
  },

  async getByCodigo(codigo: string): Promise<Obra | null> {
    try {
      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('codigo', codigo)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // No rows returned
        throw error
      }
      return data
    } catch (error) {
      console.error('Error fetching obra by codigo:', error)
      return null
    }
  },

  async getByEstado(estado: string): Promise<Obra[]> {
    try {
      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('estado', estado)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching obras by estado:', error)
      throw new Error('Error al obtener obras por estado')
    }
  }
}
