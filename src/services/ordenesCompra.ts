import { supabase } from '../lib/supabase'
import { NumberGeneratorService } from './numberGenerator'
import type { OrdenCompra, OrdenCompraFormData, ScOc, SolicitudCompra } from '../types'

export const ordenesCompraService = {
  async getAll(): Promise<OrdenCompra[]> {
    try {
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*),
          solicitud_compra:solicitudes_compra(*)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching ordenes compra:', error)
      throw new Error('Error al obtener órdenes de compra')
    }
  },

  async getById(id: string): Promise<OrdenCompra | null> {
    try {
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*),
          solicitud_compra:solicitudes_compra(*)
        `)
        .eq('id', id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    } catch (error) {
      console.error('Error fetching orden compra:', error)
      return null
    }
  },

  async getByObra(obraId: string): Promise<OrdenCompra[]> {
    try {
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*),
          solicitud_compra:solicitudes_compra(*)
        `)
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener órdenes por obra:', error)
      return []
    }
  },

  async searchByNumeroOC(numeroOc: string): Promise<OrdenCompra[]> {
    try {
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*),
          solicitud_compra:solicitudes_compra(*)
        `)
        .ilike('oc_numero', `%${numeroOc}%`)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al buscar por número OC:', error)
      return []
    }
  },

  async getByProveedor(proveedor: string): Promise<OrdenCompra[]> {
    try {
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*),
          solicitud_compra:solicitudes_compra(*)
        `)
        .ilike('proveedor', `%${proveedor}%`)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener órdenes por proveedor:', error)
      return []
    }
  },

  async getByEstado(estado: 'PENDIENTE' | 'APROBADA' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA'): Promise<OrdenCompra[]> {
    try {
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*),
          solicitud_compra:solicitudes_compra(*)
        `)
        .eq('estado', estado)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener órdenes por estado:', error)
      return []
    }
  },

  async create(orden: OrdenCompraFormData): Promise<OrdenCompra | null> {
    try {
      // Generar número automático si no se proporciona
      const ocNumero = orden.oc_numero || await NumberGeneratorService.generateUniqueNumber('OC')
      
      const newOrden = {
        ...orden,
        oc_numero: ocNumero,
        estado: 'PENDIENTE' as const
      }
      
      const { data: created, error } = await supabase
        .from('ordenes_compra')
        .insert(newOrden)
        .select()
        .single()
      
      if (error) throw error
      
      // Obtener la orden creada con relaciones
      const ordenWithRelations = await this.getById(created.id)
      return ordenWithRelations
    } catch (error) {
      console.error('Error al crear orden de compra:', error)
      return null
    }
  },

  async update(id: string, updates: Partial<OrdenCompraFormData>): Promise<OrdenCompra | null> {
    try {
      const { error } = await supabase
        .from('ordenes_compra')
        .update(updates)
        .eq('id', id)
      
      if (error) throw error
      
      // Obtener la orden actualizada con relaciones
      const ordenWithRelations = await this.getById(id)
      return ordenWithRelations
    } catch (error) {
      console.error('Error al actualizar orden de compra:', error)
      return null
    }
  },

  async updateEstado(id: string, estado: 'PENDIENTE' | 'APROBADA' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ordenes_compra')
        .update({ estado })
        .eq('id', id)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error al actualizar estado:', error)
      return false
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ordenes_compra')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error al eliminar orden de compra:', error)
      return false
    }
  },

  async checkNumeroOCExists(ocNumero: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('ordenes_compra')
        .select('id')
        .eq('oc_numero', ocNumero)
      
      if (excludeId) {
        query = query.neq('id', excludeId)
      }
      
      const { data, error } = await query.limit(1)
      
      if (error) throw error
      return (data && data.length > 0) || false
    } catch (error) {
      console.error('Error al verificar número OC:', error)
      return false
    }
  },

  async getBySolicitudCompra(scId: string): Promise<OrdenCompra[]> {
    try {
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*),
          solicitud_compra:solicitudes_compra(*)
        `)
        .eq('sc_id', scId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener órdenes por solicitud de compra:', error)
      return []
    }
  }
}

export const ScOcService = {
  async associate(scId: string, ocId: string): Promise<ScOc> {
    try {
      const association = {
        sc_id: scId,
        oc_id: ocId
      }
      
      const { data, error } = await supabase
        .from('sc_oc')
        .insert(association)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error associating SC with OC:', error)
      throw new Error('Error al asociar solicitud con orden de compra')
    }
  },

  async disassociate(scId: string, ocId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sc_oc')
        .delete()
        .eq('sc_id', scId)
        .eq('oc_id', ocId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error disassociating SC from OC:', error)
      throw new Error('Error al desasociar solicitud de orden de compra')
    }
  },

  async getBySolicitudCompra(scId: string): Promise<ScOc[]> {
    try {
      const { data, error } = await supabase
        .from('sc_oc')
        .select('*')
        .eq('sc_id', scId)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting associations by SC:', error)
      return []
    }
  },

  async getByOrdenCompra(ocId: string): Promise<ScOc[]> {
    try {
      const { data, error } = await supabase
        .from('sc_oc')
        .select('*')
        .eq('oc_id', ocId)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting associations by OC:', error)
      return []
    }
  }
}