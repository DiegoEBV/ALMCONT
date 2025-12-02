import { supabase, setSupabaseUserContext } from '../lib/supabase'
import { NumberGeneratorService } from './numberGenerator'
import { localAuth } from './localAuth'
import { mapLocalIdToUUID } from '../utils/idMapper'
import type { Requerimiento, RequerimientoFormData, RequerimientoFilters } from '../types'

// Función auxiliar para establecer contexto de usuario con mapeo de UUID
async function setUserContextWithMapping(): Promise<void> {
  const { data } = await supabase.auth.getUser()
  const supUser = data?.user
  if (supUser?.id) {
    await setSupabaseUserContext(supUser.id)
  }
}

export const requerimientosService = {
  // Obtener requerimiento por ID
  async getById(id: string): Promise<Requerimiento | null> {
    try {
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      const { data, error } = await supabase
        .from('requerimientos')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Error al obtener requerimiento:', error)
      return null
    }
  },

  // Obtener todos los requerimientos con filtros opcionales
  async getAll(filters?: RequerimientoFilters): Promise<Requerimiento[]> {
    try {
      console.log('🔄 Iniciando carga de requerimientos con filtros:', filters)
      
      // DEBUGGING: Verificar conexión a Supabase
      console.log('🔍 DEBUG - Verificando conexión a Supabase...')
      
      // Establecer contexto de usuario para RLS (aunque RLS esté deshabilitado)
      try {
        await setUserContextWithMapping()
        console.log('✅ DEBUG - Contexto de usuario establecido')
      } catch (contextError) {
        console.warn('⚠️ DEBUG - Error estableciendo contexto de usuario:', contextError)
      }
      
      // Obtener usuario actual
      const currentUser = localAuth.getCurrentUser()
      console.log('👤 DEBUG - Usuario actual:', currentUser)
      
      // CORRECCIÓN: No filtrar por obra_id ya que no existe en la tabla
      let query = supabase
        .from('requerimientos')
        .select('*')
        .order('fecha_solicitud', { ascending: false })

      console.log('📊 DEBUG - Query base creada sin filtro de obra_id (campo no existe)')

      // Aplicar filtros usando los campos correctos de la tabla
      if (filters?.estado) {
        query = query.eq('estado', filters.estado)
        console.log('📊 Filtro por estado:', filters.estado)
      }
      if (filters?.fecha_desde) {
        query = query.gte('fecha_solicitud', filters.fecha_desde)
        console.log('📅 Filtro fecha desde:', filters.fecha_desde)
      }
      if (filters?.fecha_hasta) {
        query = query.lte('fecha_solicitud', filters.fecha_hasta)
        console.log('📅 Filtro fecha hasta:', filters.fecha_hasta)
      }
      if (filters?.empresa) {
        query = query.eq('empresa', filters.empresa)
        console.log('🏢 Filtro por empresa:', filters.empresa)
      }
      if (filters?.solicitante) {
        query = query.ilike('solicitante', `%${filters.solicitante}%`)
        console.log('👤 Filtro por solicitante:', filters.solicitante)
      }
      if (filters?.bloque) {
        query = query.eq('bloque', filters.bloque)
        console.log('🏗️ Filtro por bloque:', filters.bloque)
      }

      console.log('🔍 DEBUG - Ejecutando query a Supabase...')
      const { data, error } = await query

      if (error) {
        console.error('❌ ERROR de Supabase:', error)
        console.error('❌ Código de error:', error.code)
        console.error('❌ Mensaje:', error.message)
        console.error('❌ Detalles:', error.details)
        throw error
      }

      console.log('✅ DEBUG - Query exitosa')
      console.log('📊 DEBUG - Número de requerimientos obtenidos:', data?.length || 0)
      console.log('📋 DEBUG - Primeros 3 requerimientos:', data?.slice(0, 3))

      // Aplicar filtro de búsqueda del lado del cliente si se especifica
      let filteredData = data || []
      if (filters?.busqueda) {
        const searchTerm = filters.busqueda.toLowerCase()
        filteredData = filteredData.filter(req => {
          const nrq = req.numero_requerimiento || req.numero_rq || ''
          const desc = req.descripcion || req.descripcion_actividad || ''
          const mat = (req.material_nombre || (req.material && (req.material as any).nombre) || '') as string
          const solic = req.solicitante || ''
          return (
            nrq.toLowerCase().includes(searchTerm) ||
            desc.toLowerCase().includes(searchTerm) ||
            mat.toLowerCase().includes(searchTerm) ||
            solic.toLowerCase().includes(searchTerm)
          )
        })
        console.log('🔍 Filtro de búsqueda aplicado:', searchTerm)
        console.log('📊 Resultados después de búsqueda:', filteredData.length)
      }

      return filteredData
    } catch (error) {
      console.error('❌ ERROR CRÍTICO en getAll requerimientos:', error)
      console.error('❌ Stack trace:', error.stack)
      return []
    }
  },

  // Obtener requerimientos por empresa
  async getByEmpresa(empresa: string): Promise<Requerimiento[]> {
    try {
      const { data, error } = await supabase
        .from('requerimientos')
        .select('*')
        .eq('empresa', empresa)
        .order('fecha_solicitud', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener requerimientos por empresa:', error)
      return []
    }
  },

  // Obtener requerimientos pendientes
  async getPendientes(empresa?: string): Promise<Requerimiento[]> {
    try {
      let query = supabase
        .from('requerimientos')
        .select('*')
        .eq('estado', 'PENDIENTE')
        .order('fecha_solicitud', { ascending: true })

      // Filtrar por empresa si se especifica
      if (empresa) {
        query = query.eq('empresa', empresa)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener requerimientos pendientes:', error)
      return []
    }
  },

  // Crear requerimiento
  async create(requerimiento: RequerimientoFormData): Promise<Requerimiento | null> {
    try {
      console.log('🔄 Iniciando creación de requerimiento:', requerimiento)
      
      // Establecer contexto de usuario para RLS
      await setUserContextWithMapping()
      
      // Validación de stock interno (Obra y Central)
      let atenderConStockInterno = false
      let stockDisponibleTotal = 0
      if (requerimiento.material_id) {
        const { data: stockObra } = await supabase
          .from('stock_obra_material')
          .select('obra_id, material_id, stock_actual')
          .eq('material_id', requerimiento.material_id)
        const stocks = stockObra || []
        stockDisponibleTotal = stocks.reduce((sum, s) => sum + (s.stock_actual || 0), 0)
        const cantidadReq = requerimiento.cantidad_solicitada || requerimiento.cantidad || 0
        atenderConStockInterno = stockDisponibleTotal >= cantidadReq
      }

      // Generar número automático si no se proporciona
      const numeroReq = requerimiento.numero_requerimiento || await NumberGeneratorService.generateUniqueNumber('RQ')
      console.log('📝 Número REQ generado:', numeroReq)
      
      const nuevoRequerimiento = {
        ...requerimiento,
        numero_requerimiento: numeroReq,
        estado: atenderConStockInterno ? 'ATENDER_STOCK_INTERNO' : (requerimiento.estado || 'PENDIENTE'),
        fecha_solicitud: requerimiento.fecha_solicitud || new Date().toISOString().split('T')[0]
      }
      
      console.log('📋 Datos del nuevo requerimiento:', nuevoRequerimiento)

      const { data, error } = await supabase
        .from('requerimientos')
        .insert(nuevoRequerimiento)
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error de Supabase al crear requerimiento:', error)
        throw error
      }
      
      console.log('✅ Requerimiento creado exitosamente:', data)

      try {
        const { error: apError } = await supabase
          .from('aprobaciones')
          .insert({
            tipo: 'solicitud_compra',
            referencia_id: data.id,
            nivel_aprobacion: 1,
            solicitante_id: (data as any).created_by || null,
            estado: 'pendiente',
            fecha_solicitud: new Date().toISOString(),
            comentarios: 'Aprobación inicial por RESIDENTE',
            datos_solicitud: {
              numero_requerimiento: data.numero_requerimiento,
              prioridad: (data as any).prioridad || 'MEDIA',
              departamento_origen: 'PRODUCCION',
              solicitante: data.solicitante || ''
            }
          })
        if (apError) {
          console.warn('No se pudo crear aprobación inicial:', apError)
        }
      } catch (e) {
        console.warn('Error creando aprobación inicial:', e)
      }

      return data
    } catch (error) {
      console.error('❌ Error en create requerimiento:', error)
      return null
    }
  },

  // Crear múltiples requerimientos (para importación XLSX)
  async createBatch(requerimientos: RequerimientoFormData[]): Promise<Requerimiento[]> {
    try {
      const nuevosRequerimientos = requerimientos.map(req => ({
        ...req,
        estado: req.estado || 'PENDIENTE',
        fecha_solicitud: req.fecha_solicitud || new Date().toISOString().split('T')[0]
      }))

      const { data, error } = await supabase
        .from('requerimientos')
        .insert(nuevosRequerimientos)
        .select('*')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al crear requerimientos en lote:', error)
      return []
    }
  },

  // Actualizar requerimiento
  async update(id: string, updates: Partial<RequerimientoFormData>): Promise<Requerimiento | null> {
    try {
      const { data, error } = await supabase
        .from('requerimientos')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al actualizar requerimiento:', error)
      return null
    }
  },

  // Actualizar estado del requerimiento
  async updateEstado(id: string, estado: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('requerimientos')
        .update({ estado })
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error al actualizar estado del requerimiento:', error)
      return false
    }
  },

  // Eliminar requerimiento
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('requerimientos')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error al eliminar requerimiento:', error)
      return false
    }
  },

  // Buscar por número de requerimiento
  async searchByNumeroRequerimiento(numeroReq: string): Promise<Requerimiento[]> {
    try {
      const { data, error } = await supabase
        .from('requerimientos')
        .select('*')
        .ilike('numero_requerimiento', `%${numeroReq}%`)
        .order('fecha_solicitud', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al buscar por número de requerimiento:', error)
      return []
    }
  },

  // Obtener estadísticas de requerimientos
  async getEstadisticas(empresa?: string): Promise<{ [key: string]: number }> {
    try {
      let query = supabase
        .from('requerimientos')
        .select('estado')

      if (empresa) {
        query = query.eq('empresa', empresa)
      }

      const { data, error } = await query

      if (error) throw error

      const estadisticas = {
        PENDIENTE: 0,
        EN_PROCESO: 0,
        ATENDIDO: 0,
        CANCELADO: 0
      }

      data?.forEach(req => {
        if (req.estado in estadisticas) {
          estadisticas[req.estado as keyof typeof estadisticas]++
        }
      })

      return estadisticas
    } catch (error) {
      console.error('Error al obtener estadísticas:', error)
      return { PENDIENTE: 0, EN_PROCESO: 0, ATENDIDO: 0, CANCELADO: 0 }
    }
  },

  // Verificar si existe un número de requerimiento
  async checkNumeroRequerimientoExists(numeroRequerimiento: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('requerimientos')
        .select('id')
        .eq('numero_requerimiento', numeroRequerimiento)
        .limit(1)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query

      if (error) throw error
      return (data && data.length > 0)
    } catch (error) {
      console.error('Error al verificar número de requerimiento:', error)
      return false
    }
  }
}
