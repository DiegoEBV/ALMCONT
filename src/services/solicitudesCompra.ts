import { supabase } from '../lib/supabase'
import { NumberGeneratorService } from './numberGenerator'
import type { SolicitudCompra, SolicitudCompraFormData, RqSc, Requerimiento } from '../types'

export const solicitudesCompraService = {
  async getAll(): Promise<SolicitudCompra[]> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching solicitudes compra:', error)
      throw new Error('Error al obtener solicitudes de compra')
    }
  },

  async getById(id: string): Promise<SolicitudCompra | null> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching solicitud compra:', error)
      return null
    }
  },

  async getByObra(obraId: string): Promise<SolicitudCompra[]> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*)
        `)
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener solicitudes por obra:', error)
      return []
    }
  },

  async searchByNumeroSC(numeroSc: string): Promise<SolicitudCompra[]> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*)
        `)
        .ilike('sc_numero', `%${numeroSc}%`)
        .order('sc_numero')
        .limit(50)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al buscar por número SC:', error)
      return []
    }
  },

  async getByProveedor(proveedor: string): Promise<SolicitudCompra[]> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*)
        `)
        .ilike('proveedor', `%${proveedor}%`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener solicitudes por proveedor:', error)
      return []
    }
  },

  async getByEstado(estado: 'PENDIENTE' | 'ASIGNADA' | 'ATENDIDA' | 'CANCELADA'): Promise<SolicitudCompra[]> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*)
        `)
        .eq('estado', estado)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener solicitudes por estado:', error)
      return []
    }
  },

  async create(solicitud: SolicitudCompraFormData): Promise<SolicitudCompra | null> {
    try {
      // Generar número automático si no se proporciona
      const scNumero = solicitud.sc_numero || await NumberGeneratorService.generateUniqueNumber('SC')
      
      const newSolicitud = {
        ...solicitud,
        sc_numero: scNumero,
        estado: 'PENDIENTE' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .insert(newSolicitud)
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*)
        `)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al crear solicitud de compra:', error)
      return null
    }
  },

  async update(id: string, updates: Partial<SolicitudCompraFormData>): Promise<SolicitudCompra | null> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*)
        `)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al actualizar solicitud de compra:', error)
      return null
    }
  },

  async asignar(id: string, asignadoA: string): Promise<SolicitudCompra | null> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .update({
          asignado_a: asignadoA,
          estado: 'ASIGNADA',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*)
        `)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al asignar solicitud de compra:', error)
      return null
    }
  },

  async updateEstado(id: string, estado: 'PENDIENTE' | 'ASIGNADA' | 'ATENDIDA' | 'CANCELADA'): Promise<SolicitudCompra | null> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .update({
          estado,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*)
        `)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al actualizar estado de solicitud:', error)
      return null
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('solicitudes_compra')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error al eliminar solicitud de compra:', error)
      return false
    }
  },

  async checkNumeroSCExists(scNumero: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('solicitudes_compra')
        .select('id')
        .eq('sc_numero', scNumero)
      
      if (excludeId) {
        query = query.neq('id', excludeId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return (data?.length || 0) > 0
    } catch (error) {
      console.error('Error al verificar número SC:', error)
      return false
    }
  }
}

export const RqScService = {
  async asociarRequerimientos(scId: string, requerimientoIds: string[]): Promise<boolean> {
    try {
      // Crear las asociaciones
      const asociaciones = requerimientoIds.map(rqId => ({
        sc_id: scId,
        rq_id: rqId,
        created_at: new Date().toISOString()
      }))
      
      const { error } = await supabase
        .from('rq_sc')
        .insert(asociaciones)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error al asociar requerimientos:', error)
      return false
    }
  },

  async getRequerimientosBySC(scId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('rq_sc')
        .select(`
          rq_id,
          requerimiento:requerimientos(
            *,
            obra:obras(*),
            materiales:materiales(*)
          )
        `)
        .eq('sc_id', scId)
      
      if (error) throw error
      return data?.map(item => item.requerimiento).filter(Boolean) || []
    } catch (error) {
      console.error('Error al obtener requerimientos por SC:', error)
      return []
    }
  },

  async getSCsByRequerimiento(rqId: string): Promise<SolicitudCompra[]> {
    try {
      const { data, error } = await supabase
        .from('rq_sc')
        .select(`
          sc_id,
          solicitud_compra:solicitudes_compra(
            *,
            obra:obras(*),
            usuario:usuarios(*)
          )
        `)
        .eq('rq_id', rqId)
      
      if (error) throw error
      return (data?.map(item => item.solicitud_compra).filter(Boolean) as unknown) as SolicitudCompra[] || []
    } catch (error) {
      console.error('Error al obtener SCs por requerimiento:', error)
      return []
    }
  },

  async desasociarRequerimiento(scId: string, rqId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rq_sc')
        .delete()
        .eq('sc_id', scId)
        .eq('rq_id', rqId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error al desasociar requerimiento:', error)
      return false
    }
  }
}