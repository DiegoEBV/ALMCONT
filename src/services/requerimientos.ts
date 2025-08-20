import { supabase } from '../lib/supabase'
import { NumberGeneratorService } from './numberGenerator'
import type { Requerimiento, RequerimientoFormData, RequerimientoFilters } from '../types'

export const requerimientosService = {
  // Obtener requerimiento por ID
  async getById(id: string): Promise<Requerimiento | null> {
    try {
      const { data, error } = await supabase
        .from('requerimientos')
        .select(`
          *,
          obra:obras(*),
          material:materiales(*)
        `)
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
        .select(`
          *,
          obra:obras(*)
        `)
        .order('fecha_requerimiento', { ascending: false })

      // Aplicar filtros
      if (filters?.obra_id) {
        query = query.eq('obra_id', filters.obra_id)
        console.log('🏗️ Filtro por obra_id:', filters.obra_id)
      }
      if (filters?.estado) {
        query = query.eq('estado', filters.estado)
        console.log('📊 Filtro por estado:', filters.estado)
      }
      if (filters?.fecha_desde) {
        query = query.gte('fecha_requerimiento', filters.fecha_desde)
        console.log('📅 Filtro fecha desde:', filters.fecha_desde)
      }
      if (filters?.fecha_hasta) {
        query = query.lte('fecha_requerimiento', filters.fecha_hasta)
        console.log('📅 Filtro fecha hasta:', filters.fecha_hasta)
      }
      if (filters?.prioridad) {
        query = query.eq('prioridad', filters.prioridad)
        console.log('⚡ Filtro por prioridad:', filters.prioridad)
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
          req.numero_rq?.toLowerCase().includes(searchTerm) ||
          req.solicitante?.toLowerCase().includes(searchTerm) ||
          req.justificacion?.toLowerCase().includes(searchTerm)
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

  // Obtener requerimientos por obra
  async getByObra(obraId: string): Promise<Requerimiento[]> {
    try {
      const { data, error } = await supabase
        .from('requerimientos')
        .select(`
          *,
          obra:obras(*)
        `)
        .eq('obra_id', obraId)
        .order('fecha_requerimiento', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener requerimientos por obra:', error)
      return []
    }
  },

  // Obtener requerimientos pendientes
  async getPendientes(obraId?: string): Promise<Requerimiento[]> {
    try {
      let query = supabase
        .from('requerimientos')
        .select(`
          *,
          obra:obras(*)
        `)
        .eq('estado', 'PENDIENTE')
        .order('fecha_requerimiento', { ascending: true })

      // Filtrar por obra si se especifica
      if (obraId) {
        query = query.eq('obra_id', obraId)
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
      const numeroRQ = requerimiento.numero_rq || await NumberGeneratorService.generateUniqueNumber('RQ')
      console.log('📝 Número RQ generado:', numeroRQ)
      
      const nuevoRequerimiento = {
        ...requerimiento,
        numero_rq: numeroRQ,
        estado: 'PENDIENTE' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('📋 Datos del nuevo requerimiento:', nuevoRequerimiento)

      const { data, error } = await supabase
        .from('requerimientos')
        .insert(nuevoRequerimiento)
        .select(`
          *,
          obra:obras(*)
        `)
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
        estado: 'PENDIENTE' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await supabase
        .from('requerimientos')
        .insert(nuevosRequerimientos)
        .select(`
          *,
          obra:obras(*)
        `)

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
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          obra:obras(*)
        `)
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
        .update({
          estado,
          updated_at: new Date().toISOString()
        })
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

  // Buscar por número RQ
  async searchByNumeroRQ(numeroRq: string): Promise<Requerimiento[]> {
    try {
      const { data, error } = await supabase
        .from('requerimientos')
        .select(`
          *,
          obra:obras(*)
        `)
        .ilike('numero_rq', `%${numeroRq}%`)
        .order('fecha_requerimiento', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al buscar por número RQ:', error)
      return []
    }
  },

  // Obtener estadísticas de requerimientos
  async getEstadisticas(obraId?: string): Promise<{ [key: string]: number }> {
    try {
      let query = supabase
        .from('requerimientos')
        .select('estado')

      if (obraId) {
        query = query.eq('obra_id', obraId)
      }

      const { data, error } = await query

      if (error) throw error

      const estadisticas = {
        PENDIENTE: 0,
        ASIGNADO: 0,
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
      return { PENDIENTE: 0, ASIGNADO: 0, ATENDIDO: 0, CANCELADO: 0 }
    }
  },

  // Verificar si existe un número RQ
  async checkNumeroRQExists(numeroRq: string, obraId: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('requerimientos')
        .select('id')
        .eq('numero_rq', numeroRq)
        .eq('obra_id', obraId)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query

      if (error) throw error

      return (data?.length || 0) > 0
    } catch (error) {
      console.error('Error al verificar número RQ:', error)
      return false
    }
  }
}