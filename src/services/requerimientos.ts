import { supabase } from '../lib/supabase'
import { NumberGeneratorService } from './numberGenerator'
import type { Requerimiento, RequerimientoFormData, RequerimientoFilters } from '../types'

export const requerimientosService = {
  // Obtener requerimiento por ID
  async getById(id: string): Promise<Requerimiento | null> {
    try {
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
      
      let query = supabase
        .from('requerimientos')
        .select('*')
        .order('fecha_solicitud', { ascending: false })

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

      const { data, error } = await query

      if (error) {
        console.error('❌ Error de Supabase al obtener requerimientos:', error)
        throw error
      }
      
      console.log('📋 Datos obtenidos de Supabase:', data?.length || 0, 'requerimientos')

      // Filtrar en el cliente si hay término de búsqueda
      let filteredData = data || []
      if (filters?.busqueda) {
        const searchTerm = filters.busqueda.toLowerCase()
        console.log('🔍 Aplicando filtro de búsqueda:', searchTerm)
        filteredData = filteredData.filter(req => 
          req.numero_requerimiento?.toLowerCase().includes(searchTerm) ||
          req.solicitante?.toLowerCase().includes(searchTerm) ||
          req.descripcion?.toLowerCase().includes(searchTerm) ||
          req.material?.toLowerCase().includes(searchTerm)
        )
        console.log('🔍 Resultados después del filtro de búsqueda:', filteredData.length)
      }
      
      console.log('✅ Requerimientos cargados exitosamente:', filteredData.length)
      return filteredData
    } catch (error) {
      console.error('❌ Error en getAll requerimientos:', error)
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
      
      // Generar número automático si no se proporciona
      const numeroReq = requerimiento.numero_requerimiento || await NumberGeneratorService.generateUniqueNumber('RQ')
      console.log('📝 Número REQ generado:', numeroReq)
      
      const nuevoRequerimiento = {
        ...requerimiento,
        numero_requerimiento: numeroReq,
        estado: requerimiento.estado || 'PENDIENTE',
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