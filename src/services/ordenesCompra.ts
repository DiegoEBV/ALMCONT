import { localDB } from '../lib/localDB'
import { NumberGeneratorService } from './numberGenerator'
import type { OrdenCompra, OrdenCompraFormData, ScOc, SolicitudCompra } from '../types'

export const ordenesCompraService = {
  async getAll(): Promise<OrdenCompra[]> {
    try {
      return localDB.getWithRelations('ordenes_compra', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        usuario: { table: 'usuarios', key: 'usuario_id' },
        solicitud_compra: { table: 'solicitudes_compra', key: 'sc_id' }
      })
    } catch (error) {
      console.error('Error fetching ordenes compra:', error)
      throw new Error('Error al obtener órdenes de compra')
    }
  },

  async getById(id: string): Promise<OrdenCompra | null> {
    try {
      const ordenes = await localDB.getWithRelations('ordenes_compra', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        usuario: { table: 'usuarios', key: 'usuario_id' },
        solicitud_compra: { table: 'solicitudes_compra', key: 'sc_id' }
      })
      return ordenes.find(o => o.id === id) || null
    } catch (error) {
      console.error('Error fetching orden compra:', error)
      return null
    }
  },

  async getByObra(obraId: string): Promise<OrdenCompra[]> {
    try {
      const ordenes = await localDB.getWithRelations('ordenes_compra', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        usuario: { table: 'usuarios', key: 'usuario_id' },
        solicitud_compra: { table: 'solicitudes_compra', key: 'sc_id' }
      })
      return ordenes.filter(o => o.obra_id === obraId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error('Error al obtener órdenes por obra:', error)
      return []
    }
  },

  async searchByNumeroOC(numeroOc: string): Promise<OrdenCompra[]> {
    try {
      const ordenes = await localDB.getWithRelations('ordenes_compra', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        usuario: { table: 'usuarios', key: 'usuario_id' },
        solicitud_compra: { table: 'solicitudes_compra', key: 'sc_id' }
      })
      return ordenes.filter(o => 
        o.oc_numero?.toLowerCase().includes(numeroOc.toLowerCase())
      ).sort((a, b) => (a.oc_numero || '').localeCompare(b.oc_numero || ''))
        .slice(0, 50)
    } catch (error) {
      console.error('Error al buscar por número OC:', error)
      return []
    }
  },

  async getByProveedor(proveedor: string): Promise<OrdenCompra[]> {
    try {
      const ordenes = await localDB.getWithRelations('ordenes_compra', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        usuario: { table: 'usuarios', key: 'usuario_id' },
        solicitud_compra: { table: 'solicitudes_compra', key: 'sc_id' }
      })
      return ordenes.filter(o => 
        o.proveedor?.toLowerCase().includes(proveedor.toLowerCase())
      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error('Error al obtener órdenes por proveedor:', error)
      return []
    }
  },

  async getByEstado(estado: 'PENDIENTE' | 'APROBADA' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA'): Promise<OrdenCompra[]> {
    try {
      const ordenes = await localDB.getWithRelations('ordenes_compra', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        usuario: { table: 'usuarios', key: 'usuario_id' },
        solicitud_compra: { table: 'solicitudes_compra', key: 'sc_id' }
      })
      return ordenes.filter(o => o.estado === estado)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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
        id: crypto.randomUUID(),
        estado: 'PENDIENTE' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const created = await localDB.create('ordenes_compra', newOrden)
      
      if (created) {
        const ordenes = await localDB.getWithRelations('ordenes_compra', undefined, {
          obra: { table: 'obras', key: 'obra_id' },
          usuario: { table: 'usuarios', key: 'usuario_id' },
          solicitud_compra: { table: 'solicitudes_compra', key: 'sc_id' }
        })
        return ordenes.find(o => o.id === created.id) || null
      }
      
      return null
    } catch (error) {
      console.error('Error al crear orden de compra:', error)
      return null
    }
  },

  async update(id: string, updates: Partial<OrdenCompraFormData>): Promise<OrdenCompra | null> {
    try {
      const updated = await localDB.update('ordenes_compra', id, {
        ...updates,
        updated_at: new Date().toISOString()
      })
      
      if (updated) {
        const ordenes = await localDB.getWithRelations('ordenes_compra', undefined, {
          obra: { table: 'obras', key: 'obra_id' },
          usuario: { table: 'usuarios', key: 'usuario_id' },
          solicitud_compra: { table: 'solicitudes_compra', key: 'sc_id' }
        })
        return ordenes.find(o => o.id === id) || null
      }
      
      return null
    } catch (error) {
      console.error('Error al actualizar orden de compra:', error)
      return null
    }
  },

  async updateEstado(id: string, estado: 'PENDIENTE' | 'APROBADA' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA'): Promise<boolean> {
    try {
      const updated = await localDB.update('ordenes_compra', id, { 
        estado,
        updated_at: new Date().toISOString()
      })
      return !!updated
    } catch (error) {
      console.error('Error al actualizar estado:', error)
      return false
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      return await localDB.delete('ordenes_compra', id)
    } catch (error) {
      console.error('Error al eliminar orden de compra:', error)
      return false
    }
  },

  async checkNumeroOCExists(ocNumero: string, excludeId?: string): Promise<boolean> {
    try {
      const ordenes = await localDB.get('ordenes_compra')
      const existing = ordenes.filter(o => 
        o.oc_numero === ocNumero && (!excludeId || o.id !== excludeId)
      )
      return existing.length > 0
    } catch (error) {
      console.error('Error al verificar número OC:', error)
      return false
    }
  },

  async getBySolicitudCompra(scId: string): Promise<OrdenCompra[]> {
    try {
      const ordenes = await localDB.getWithRelations('ordenes_compra', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        usuario: { table: 'usuarios', key: 'usuario_id' },
        solicitud_compra: { table: 'solicitudes_compra', key: 'sc_id' }
      })
      return ordenes.filter(o => o.sc_id === scId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error('Error al obtener órdenes por solicitud de compra:', error)
      return []
    }
  }
}

// Servicio para asociar solicitudes de compra con órdenes de compra
export class ScOcService {
  // Asociar solicitudes de compra a una orden de compra
  static async asociarSolicitudes(ocId: string, solicitudIds: string[]): Promise<boolean> {
    try {
      // Primero eliminar asociaciones existentes
      const existingAssociations = await localDB.getWhere('sc_oc', (item: ScOc) => item.oc_id === ocId)
      for (const association of existingAssociations) {
        await localDB.delete('sc_oc', association.id)
      }

      // Crear nuevas asociaciones
      for (const scId of solicitudIds) {
        await localDB.create('sc_oc', {
          id: crypto.randomUUID(),
          sc_id: scId,
          oc_id: ocId,
          created_at: new Date().toISOString()
        })
      }

      return true
    } catch (error) {
      console.error('Error al asociar solicitudes:', error)
      return false
    }
  }

  // Obtener solicitudes asociadas a una OC
  static async getSolicitudesByOC(ocId: string): Promise<SolicitudCompra[]> {
    try {
      const associations = await localDB.getWhere('sc_oc', (item: ScOc) => item.oc_id === ocId)
      const solicitudIds = associations.map(a => a.sc_id)
      
      if (solicitudIds.length === 0) return []
      
      const solicitudes = await localDB.getWithRelations('solicitudes_compra', undefined, {
        obra: { table: 'obras', key: 'obra_id' },
        usuario: { table: 'usuarios', key: 'created_by' }
      })
      
      return solicitudes.filter(s => solicitudIds.includes(s.id))
    } catch (error) {
      console.error('Error al obtener solicitudes por OC:', error)
      return []
    }
  }

  // Obtener OCs asociadas a una solicitud
  static async getOCsBySolicitud(scId: string): Promise<OrdenCompra[]> {
    try {
      const associations = await localDB.getWhere('sc_oc', (item: ScOc) => item.sc_id === scId)
      const ocIds = associations.map(a => a.oc_id)
      
      if (ocIds.length === 0) return []
      
      const ordenes = await localDB.get('ordenes_compra')
      return ordenes.filter(o => ocIds.includes(o.id))
    } catch (error) {
      console.error('Error al obtener OCs por solicitud:', error)
      return []
    }
  }

  // Desasociar una solicitud de una OC
  static async desasociarSolicitud(scId: string, ocId: string): Promise<boolean> {
    try {
      const associations = await localDB.getWhere('sc_oc', (item: ScOc) => 
        item.sc_id === scId && item.oc_id === ocId
      )
      
      for (const association of associations) {
        await localDB.delete('sc_oc', association.id)
      }
      
      return true
    } catch (error) {
      console.error('Error al desasociar solicitud:', error)
      return false
    }
  }
}