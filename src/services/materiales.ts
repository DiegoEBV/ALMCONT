import { supabase } from '../lib/supabase'
import type { Material } from '../types'
import { cacheService } from './cacheService'

export interface MaterialesQuery {
  page?: number
  limit?: number
  search?: string
  categoria?: string
  activo?: boolean
}

export interface MaterialesResponse {
  data: Material[]
  total: number
  page: number
  totalPages: number
}

class MaterialesService {
  async getAll(query: MaterialesQuery = {}): Promise<MaterialesResponse> {
    const { page = 1, limit = 50, search, categoria, activo } = query
    
    // Generar clave de cache
    const cacheKey = `materiales_${JSON.stringify(query)}`
    
    // Intentar obtener desde cache
    const cachedResult = await cacheService.getCachedQuery(query)
    if (cachedResult) {
      console.log('Datos obtenidos desde cache')
      return cachedResult
    }

    let queryBuilder = supabase
      .from('materiales')
      .select('*', { count: 'exact' })

    // Aplicar filtros
    if (search) {
      queryBuilder = queryBuilder.or(`codigo.ilike.%${search}%,nombre.ilike.%${search}%,descripcion.ilike.%${search}%`)
    }

    if (categoria) {
      queryBuilder = queryBuilder.eq('categoria', categoria)
    }

    if (activo !== undefined) {
      queryBuilder = queryBuilder.eq('activo', activo)
    }

    // Aplicar paginación
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    queryBuilder = queryBuilder
      .range(from, to)
      .order('created_at', { ascending: false })

    const { data, error, count } = await queryBuilder

    if (error) {
      throw new Error(`Error al obtener materiales: ${error.message}`)
    }

    const result: MaterialesResponse = {
      data: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    }

    // Guardar en cache por 15 minutos
    await cacheService.cacheQuery(query, result, 15)
    
    console.log(`Datos obtenidos desde Supabase: ${data?.length} materiales`)
    return result
  }

  // Método legacy para compatibilidad
  async getAllLegacy(): Promise<Material[]> {
    const cacheKey = 'all_materiales_legacy'
    
    // Intentar obtener desde cache
    const cachedData = await cacheService.getCachedMateriales(cacheKey)
    if (cachedData) {
      return cachedData
    }

    const { data, error } = await supabase
      .from('materiales')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      throw new Error(`Error al obtener materiales: ${error.message}`)
    }

    // Guardar en cache por 30 minutos
    await cacheService.cacheMateriales(cacheKey, data || [], 30)
    
    return data || []
  }

  async getCategorias(): Promise<string[]> {
    // Intentar obtener desde cache
    const cachedCategorias = await cacheService.getCachedCategorias()
    if (cachedCategorias) {
      return cachedCategorias
    }

    const { data, error } = await supabase
      .from('materiales')
      .select('categoria')
      .not('categoria', 'is', null)

    if (error) {
      throw new Error(`Error al obtener categorías: ${error.message}`)
    }

    const categorias = [...new Set(data?.map(item => item.categoria).filter(Boolean))] as string[]
    
    // Guardar en cache por 1 hora
    await cacheService.cacheCategorias(categorias, 60)
    
    return categorias
  }

  async getByCodigo(codigo: string): Promise<Material | null> {
    try {
      const { data, error } = await supabase
        .from('materiales')
        .select('*')
        .eq('codigo', codigo)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error al buscar material por código:', error)
      throw error
    }
  }

  async getById(id: string): Promise<Material | null> {
    const { data, error } = await supabase
      .from('materiales')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Error al obtener material: ${error.message}`)
    }

    return data
  }

  async create(material: Omit<Material, 'id' | 'created_at' | 'updated_at'>): Promise<Material> {
    const { data, error } = await supabase
      .from('materiales')
      .insert([material])
      .select()
      .single()

    if (error) {
      throw new Error(`Error al crear material: ${error.message}`)
    }

    // Invalidar cache
    await cacheService.invalidateMaterialesCache()

    return data
  }

  async update(id: string, material: Partial<Omit<Material, 'id' | 'created_at' | 'updated_at'>>): Promise<Material> {
    const { data, error } = await supabase
      .from('materiales')
      .update(material)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Error al actualizar material: ${error.message}`)
    }

    // Invalidar cache
    await cacheService.invalidateMaterialesCache()

    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('materiales')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Error al eliminar material: ${error.message}`)
    }

    // Invalidar cache
    await cacheService.invalidateMaterialesCache()
  }

  async bulkCreate(materiales: Omit<Material, 'id' | 'created_at' | 'updated_at'>[]): Promise<Material[]> {
    const { data, error } = await supabase
      .from('materiales')
      .insert(materiales)
      .select()

    if (error) {
      throw new Error(`Error al crear materiales en lote: ${error.message}`)
    }

    // Invalidar cache
    await cacheService.invalidateMaterialesCache()

    return data || []
  }

  // Método para pre-cargar datos críticos
  async preloadCriticalData(): Promise<void> {
    try {
      // Pre-cargar primera página de materiales activos
      await this.getAll({ page: 1, limit: 50, activo: true })
      
      // Pre-cargar categorías
      await this.getCategorias()
      
      console.log('Datos críticos pre-cargados exitosamente')
    } catch (error) {
      console.error('Error al pre-cargar datos críticos:', error)
    }
  }
}

export const materialesService = new MaterialesService()