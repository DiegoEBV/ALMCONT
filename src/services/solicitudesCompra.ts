import { supabase, setSupabaseUserContext } from '../lib/supabase'
import { NumberGeneratorService } from './numberGenerator'
import { localAuth } from './localAuth'
import { mapLocalIdToUUID } from '../utils/idMapper'
import type { SolicitudCompra, SolicitudCompraFormData, Requerimiento } from '../types'

// Función auxiliar para establecer contexto de usuario con mapeo de UUID
async function setUserContextWithMapping(): Promise<void> {
  const currentUser = localAuth.getCurrentUser()
  if (currentUser) {
    // Si el usuario tiene supabaseId, usarlo directamente
    if (currentUser.supabaseId) {
      console.log('Usando supabaseId directamente:', currentUser.supabaseId)
      await supabase.rpc('set_user_context', {
        user_id: currentUser.supabaseId,
        user_role: currentUser.rol
      })
    } else {
      // Fallback: mapear ID local a UUID de Supabase
      const userUUID = await mapLocalIdToUUID(currentUser.id, 'usuario')
      if (userUUID) {
        await supabase.rpc('set_user_context', {
          user_id: userUUID,
          user_role: currentUser.rol
        })
      } else {
        console.warn('No se pudo mapear el usuario local a UUID de Supabase:', currentUser.id)
      }
    }
  }
}

export const solicitudesCompraService = {
  async getAll(): Promise<SolicitudCompra[]> {
    try {
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
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
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al obtener solicitud de compra:', error)
      return null
    }
  },

  async getByObra(obraId: string): Promise<SolicitudCompra[]> {
    try {
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
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

  async searchByNumeroSC(numeroSC: string): Promise<SolicitudCompra[]> {
    try {
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      console.log('Buscando SC:', numeroSC)
      
      // Buscar directamente en la tabla requerimientos usando la columna numero_solicitud_compra
      // Sin hacer JOIN con obras para evitar errores de relación
      const { data: requerimientos, error: rqError } = await supabase
        .from('requerimientos')
        .select('*')
        .eq('numero_solicitud_compra', numeroSC)
      
      if (rqError) {
        console.error('Error al buscar requerimientos:', rqError)
        throw rqError
      }
      
      if (!requerimientos || requerimientos.length === 0) {
        console.log('No se encontraron requerimientos para SC:', numeroSC)
        throw new Error('No se encontró la solicitud de compra')
      }
      
      console.log('Requerimientos encontrados:', requerimientos.length)
      
      // Obtener información de materiales por separado si es necesario
      const materialIds = requerimientos
        .map(req => req.material_id)
        .filter(id => id)
      
      let materiales = []
      if (materialIds.length > 0) {
        const { data: materialesData, error: matError } = await supabase
          .from('materiales')
          .select('*')
          .in('id', materialIds)
        
        if (!matError) {
          materiales = materialesData || []
        }
      }
      
      // Obtener información de obras por separado si es necesario
      const obraIds = requerimientos
        .map(req => req.obra_id)
        .filter(id => id)
      
      let obras = []
      if (obraIds.length > 0) {
        const { data: obrasData, error: obraError } = await supabase
          .from('obras')
          .select('*')
          .in('id', obraIds)
        
        if (!obraError) {
          obras = obrasData || []
        }
      }
      
      // Enriquecer requerimientos con información de materiales y obras
      const requerimientosEnriquecidos = requerimientos.map(req => ({
        ...req,
        material: materiales.find(mat => mat.id === req.material_id) || null,
        obra: obras.find(obra => obra.id === req.obra_id) || null
      }))
      
      // Buscar la solicitud de compra para obtener información adicional
      const { data: solicitud, error: solicitudError } = await supabase
        .from('solicitudes_compra')
        .select('*')
        .eq('numero_sc', numeroSC)
        .single()
      
      // Si hay error, no es crítico, continuamos sin la solicitud
      if (solicitudError) {
        console.warn('No se encontró solicitud de compra:', solicitudError.message)
      }
      
      // Si no encontramos la solicitud, crear una estructura básica
      const solicitudBase = solicitud || {
        id: `temp-${numeroSC}`,
        numero_sc: numeroSC,
        estado: 'PENDIENTE' as const,
        fecha_solicitud: new Date().toISOString(),
        obra: null,
        created_by_user: null,
        aprobado_por_user: null
      }
      
      console.log('Solicitud base:', solicitudBase)
      
      // Agregar los requerimientos a la solicitud
      const solicitudConRequerimientos = {
        ...solicitudBase,
        requerimientos: requerimientosEnriquecidos
      }
      
      return [solicitudConRequerimientos]
    } catch (error) {
      console.error('Error al buscar solicitud por número SC:', error)
      throw error
    }
  },

  async getByProveedor(proveedor: string): Promise<SolicitudCompra[]> {
    try {
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
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
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
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
      // Verificar permisos - solo COORDINACION puede crear solicitudes
    const currentUser = localAuth.getCurrentUser()
    if (!currentUser || currentUser.rol !== 'COORDINACION') {
        throw new Error('No tienes permisos para crear solicitudes de compra')
      }
      
      // Establecer contexto de usuario para RLS
      const userUUID = await mapLocalIdToUUID(currentUser.id, 'usuario')
      if (!userUUID) {
        throw new Error('No se pudo mapear el usuario a UUID de Supabase')
      }
      await setSupabaseUserContext(userUUID)
      
      // Generar número automático si no se proporciona
      const scNumero = solicitud.numero_sc || await NumberGeneratorService.generateUniqueNumber('SC')
      
      const newSolicitud = {
        ...solicitud,
        numero_sc: scNumero,
        estado: 'PENDIENTE' as const,
        created_by: userUUID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .insert(newSolicitud)
        .select(`
          *,
          obra:obras(*),
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al crear solicitud de compra:', error)
      throw error
    }
  },

  async update(id: string, updates: Partial<SolicitudCompraFormData>): Promise<SolicitudCompra | null> {
    try {
      // Verificar permisos - solo COORDINACION puede actualizar solicitudes
    const currentUser = localAuth.getCurrentUser()
    if (!currentUser || currentUser.rol !== 'COORDINACION') {
        throw new Error('No tienes permisos para actualizar solicitudes de compra')
      }
      
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
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
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
        `)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al actualizar solicitud de compra:', error)
      throw error
    }
  },

  async asignar(id: string, asignadoA: string): Promise<SolicitudCompra | null> {
    try {
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
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
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
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
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
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
          created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
          aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
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
      // Verificar permisos - solo COORDINACION puede eliminar solicitudes
    const currentUser = localAuth.getCurrentUser()
    if (!currentUser || currentUser.rol !== 'COORDINACION') {
        throw new Error('No tienes permisos para eliminar solicitudes de compra')
      }
      
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      const { error } = await supabase
        .from('solicitudes_compra')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error al eliminar solicitud de compra:', error)
      throw error
    }
  },

  async checkNumeroSCExists(scNumero: string, excludeId?: string): Promise<boolean> {
    try {
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      let query = supabase
        .from('solicitudes_compra')
        .select('id')
        .eq('numero_sc', scNumero)
      
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
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
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

  async getRequerimientosBySC(scId: string): Promise<Requerimiento[]> {
    try {
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      const { data, error } = await supabase
        .from('rq_sc')
        .select(`
          requerimientos!inner(
            *,
            obra:obras(*),
            material:materiales(*)
          )
        `)
        .eq('sc_id', scId)
      
      if (error) throw error
      
      // Extraer los requerimientos de la estructura anidada
      const requerimientos = (data?.map(item => item.requerimientos).filter(Boolean) || []) as unknown as Requerimiento[]
      console.log('Requerimientos obtenidos para SC:', scId, requerimientos)
      return requerimientos
    } catch (error) {
      console.error('Error al obtener requerimientos por SC:', error)
      return []
    }
  },

  async getSCsByRequerimiento(rqId: string): Promise<SolicitudCompra[]> {
    try {
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      const { data, error } = await supabase
        .from('rq_sc')
        .select(`
          sc_id,
          solicitud_compra:solicitudes_compra(
            *,
            obra:obras(*),
            created_by_user:usuarios!solicitudes_compra_created_by_fkey(*),
            aprobado_por_user:usuarios!solicitudes_compra_aprobado_por_fkey(*)
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
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
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