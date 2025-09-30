import { supabase, setSupabaseUserContext } from '../lib/supabase'
import { localAuth } from './localAuth'
import { mapLocalIdToUUID } from '../utils/idMapper'
import type { RequerimientoMaterial, DetalleRequerimiento, RequerimientoMaterialFormData } from '../types'

// Función auxiliar para establecer contexto de usuario con mapeo de UUID
async function setUserContextWithMapping(): Promise<void> {
  const currentUser = localAuth.getCurrentUser()
  if (currentUser) {
    // Mapear ID local a UUID de Supabase
    const userUUID = await mapLocalIdToUUID(currentUser.id, 'usuario')
    if (userUUID) {
      await setSupabaseUserContext(userUUID)
    } else {
      console.warn('No se pudo mapear el usuario local a UUID de Supabase:', currentUser.id)
    }
  }
}

export const requerimientosMaterialesService = {
  // Obtener todos los requerimientos de materiales
  async getAll(): Promise<RequerimientoMaterial[]> {
    try {
      console.log('🔄 Iniciando carga de requerimientos de materiales')
      
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      const { data, error } = await supabase
        .from('requerimiento_materiales')
        .select(`
          *,
          obra:obras(*),
          solicitante:usuarios!requerimiento_materiales_solicitante_id_fkey(*),
          aprobado_por_user:usuarios!requerimiento_materiales_aprobado_por_fkey(*),
          detalles:detalle_requerimiento(
            *,
            material:materiales(*)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error de Supabase al obtener requerimientos:', error)
        throw error
      }
      
      console.log('📋 Requerimientos obtenidos:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ Error en getAll requerimientos:', error)
      return []
    }
  },

  // Obtener requerimientos por usuario
  async getByUsuario(usuarioId: string): Promise<RequerimientoMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('requerimiento_materiales')
        .select(`
          *,
          obra:obras(*),
          solicitante:usuarios!requerimiento_materiales_solicitante_id_fkey(*),
          aprobado_por_user:usuarios!requerimiento_materiales_aprobado_por_fkey(*),
          detalles:detalle_requerimiento(
            *,
            material:materiales(*)
          )
        `)
        .eq('solicitante_id', usuarioId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching requerimientos by usuario:', error)
      return []
    }
  },

  // Obtener requerimiento por ID
  async getById(id: string): Promise<RequerimientoMaterial | null> {
    try {
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      const { data, error } = await supabase
        .from('requerimiento_materiales')
        .select(`
          *,
          obra:obras(*),
          solicitante:usuarios!requerimiento_materiales_solicitante_id_fkey(*),
          aprobado_por_user:usuarios!requerimiento_materiales_aprobado_por_fkey(*),
          detalles:detalle_requerimiento(
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
      console.error('Error fetching requerimiento:', error)
      return null
    }
  },

  // Crear nuevo requerimiento
  async create(formData: RequerimientoMaterialFormData, solicitanteId: string): Promise<RequerimientoMaterial> {
    try {
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      // Generar número de requerimiento
      const numeroRequerimiento = await this.generateNumeroRequerimiento()
      
      // Crear el requerimiento principal
      const { data: requerimiento, error: reqError } = await supabase
        .from('requerimiento_materiales')
        .insert({
          codigo: numeroRequerimiento,
          obra_id: formData.obra_id,
          solicitante_id: solicitanteId,
          fecha_solicitud: new Date().toISOString(),
          fecha_requerida: formData.fecha_necesidad,
          estado: 'PENDIENTE',
          prioridad: formData.prioridad || 'MEDIA',
          comentarios: formData.observaciones,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (reqError) throw reqError

      // Crear los detalles del requerimiento
      if (formData.detalles && formData.detalles.length > 0) {
        const detalles = formData.detalles.map(detalle => ({
          requerimiento_id: requerimiento.id,
          material_id: detalle.material_id,
          cantidad: detalle.cantidad,
          comentarios: detalle.comentarios,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { error: detallesError } = await supabase
          .from('detalle_requerimiento')
          .insert(detalles)
        
        if (detallesError) throw detallesError
      }

      // Retornar el requerimiento completo
      return await this.getById(requerimiento.id) as RequerimientoMaterial
    } catch (error) {
      console.error('Error creating requerimiento:', error)
      throw new Error('Error al crear requerimiento de materiales')
    }
  },

  // Actualizar estado del requerimiento
  async updateEstado(id: string, estado: RequerimientoMaterial['estado']): Promise<RequerimientoMaterial> {
    try {
      const { data, error } = await supabase
        .from('requerimiento_materiales')
        .update({
          estado,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating requerimiento estado:', error)
      throw new Error('Error al actualizar estado del requerimiento')
    }
  },

  // Generar código de requerimiento
  async generateNumeroRequerimiento(): Promise<string> {
    try {
      const { count, error } = await supabase
        .from('requerimiento_materiales')
        .select('*', { count: 'exact', head: true })
      
      if (error) throw error
      
      const nextNumber = (count || 0) + 1
      const year = new Date().getFullYear()
      return `RM-${year}-${nextNumber.toString().padStart(4, '0')}`
    } catch (error) {
      console.error('Error generating codigo requerimiento:', error)
      return `RM-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
    }
  },

  // Obtener estadísticas de requerimientos
  async getEstadisticas(usuarioId?: string): Promise<{
    total: number
    pendientes: number
    enRevision: number
    aprobados: number
    rechazados: number
    atendidos: number
  }> {
    try {
      let query = supabase
        .from('requerimiento_materiales')
        .select('estado')
      
      if (usuarioId) {
        query = query.eq('solicitante_id', usuarioId)
      }

      const { data, error } = await query
      
      if (error) throw error

      const stats = {
        total: data?.length || 0,
        pendientes: data?.filter(r => r.estado === 'PENDIENTE').length || 0,
        enRevision: data?.filter(r => r.estado === 'EN_REVISION').length || 0,
        aprobados: data?.filter(r => r.estado === 'APROBADO').length || 0,
        rechazados: data?.filter(r => r.estado === 'RECHAZADO').length || 0,
        atendidos: data?.filter(r => r.estado === 'ATENDIDO').length || 0
      }

      return stats
    } catch (error) {
      console.error('Error getting estadisticas:', error)
      return {
        total: 0,
        pendientes: 0,
        enRevision: 0,
        aprobados: 0,
        rechazados: 0,
        atendidos: 0
      }
    }
  }
}