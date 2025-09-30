import { supabase } from '../lib/supabase'
import type { Alerta, AlertaFormData } from '../types'

export const alertasService = {
  // Obtener todas las alertas de un usuario
  async getByUsuario(usuarioId: string, limit?: number): Promise<Alerta[]> {
    try {
      console.log('🔄 Cargando alertas para usuario:', usuarioId)
      
      let query = supabase
        .from('alertas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false })
      
      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error al obtener alertas:', error)
        throw error
      }
      
      console.log('📋 Alertas obtenidas:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ Error en getByUsuario alertas:', error)
      return []
    }
  },

  // Obtener alertas no leídas de un usuario
  async getNoLeidasByUsuario(usuarioId: string): Promise<Alerta[]> {
    try {
      const { data, error } = await supabase
        .from('alertas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('leida', false)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching alertas no leídas:', error)
      return []
    }
  },

  // Contar alertas no leídas
  async countNoLeidasByUsuario(usuarioId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('alertas')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId)
        .eq('leida', false)
      
      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error counting alertas no leídas:', error)
      return 0
    }
  },

  // Crear nueva alerta
  async create(alertaData: AlertaFormData): Promise<Alerta> {
    try {
      const { data, error } = await supabase
        .from('alertas')
        .insert({
          ...alertaData,
          leida: false,
          fecha_creacion: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating alerta:', error)
      throw new Error('Error al crear alerta')
    }
  },

  // Marcar alerta como leída
  async marcarComoLeida(id: string): Promise<Alerta> {
    try {
      const { data, error } = await supabase
        .from('alertas')
        .update({
          leida: true,
          fecha_lectura: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error marking alerta as read:', error)
      throw new Error('Error al marcar alerta como leída')
    }
  },

  // Marcar todas las alertas de un usuario como leídas
  async marcarTodasComoLeidas(usuarioId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alertas')
        .update({
          leida: true,
          fecha_lectura: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('usuario_id', usuarioId)
        .eq('leida', false)
      
      if (error) throw error
    } catch (error) {
      console.error('Error marking all alertas as read:', error)
      throw new Error('Error al marcar todas las alertas como leídas')
    }
  },

  // Eliminar alerta
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alertas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    } catch (error) {
      console.error('Error deleting alerta:', error)
      throw new Error('Error al eliminar alerta')
    }
  },

  // Crear alerta para requerimiento de material
  async createRequerimientoAlerta(
    usuarioId: string,
    requerimientoId: string,
    numeroRequerimiento: string,
    tipo: 'creado' | 'aprobado' | 'rechazado' | 'atendido'
  ): Promise<Alerta> {
    const mensajes = {
      creado: `Se ha creado el requerimiento ${numeroRequerimiento}`,
      aprobado: `El requerimiento ${numeroRequerimiento} ha sido aprobado`,
      rechazado: `El requerimiento ${numeroRequerimiento} ha sido rechazado`,
      atendido: `El requerimiento ${numeroRequerimiento} ha sido atendido`
    }

    const tipos = {
      creado: 'INFO' as const,
      aprobado: 'SUCCESS' as const,
      rechazado: 'ERROR' as const,
      atendido: 'SUCCESS' as const
    }

    return this.create({
      usuario_id: usuarioId,
      tipo: tipos[tipo],
      titulo: 'Requerimiento de Material',
      mensaje: mensajes[tipo],
      referencia_tipo: 'requerimiento_material',
      referencia_id: requerimientoId
    })
  },

  // Crear alerta para stock bajo
  async createStockBajoAlerta(
    usuarioId: string,
    materialId: string,
    materialNombre: string,
    stockActual: number,
    stockMinimo: number
  ): Promise<Alerta> {
    return this.create({
      usuario_id: usuarioId,
      tipo: 'WARNING',
      titulo: 'Stock Bajo',
      mensaje: `El material "${materialNombre}" tiene stock bajo (${stockActual}/${stockMinimo})`,
      referencia_tipo: 'material',
      referencia_id: materialId
    })
  },

  // Limpiar alertas antiguas (más de 30 días)
  async limpiarAlertasAntiguas(): Promise<void> {
    try {
      const fechaLimite = new Date()
      fechaLimite.setDate(fechaLimite.getDate() - 30)

      const { error } = await supabase
        .from('alertas')
        .delete()
        .lt('created_at', fechaLimite.toISOString())
      
      if (error) throw error
      console.log('✅ Alertas antiguas limpiadas')
    } catch (error) {
      console.error('Error cleaning old alertas:', error)
    }
  }
}