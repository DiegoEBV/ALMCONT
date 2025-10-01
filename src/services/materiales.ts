import { supabase } from '../lib/supabase'
import type { Material } from '../types'

export const materialesService = {
  // Obtener todos los materiales
  async getAll(): Promise<Material[]> {
    try {
      console.log('🔄 Iniciando carga de materiales')
      
      const { data, error } = await supabase
        .from('materiales')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (error) {
        console.error('❌ Error de Supabase al obtener materiales:', error)
        console.error('❌ Detalles del error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      console.log('📋 Materiales obtenidos de Supabase:', data?.length || 0)
      console.log('✅ Materiales cargados exitosamente')
      return data || []
    } catch (error) {
      console.error('❌ Error en getAll materiales:', error)
      return []
    }
  },

  async getById(id: string): Promise<Material | null> {
    try {
      const { data, error } = await supabase
        .from('materiales')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // No rows returned
        throw error
      }
      return data
    } catch (error) {
      console.error('Error fetching material:', error)
      return null
    }
  },

  async create(data: Omit<Material, 'id' | 'created_at' | 'updated_at'>): Promise<Material> {
    try {
      const { data: newMaterial, error } = await supabase
        .from('materiales')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      return newMaterial
    } catch (error) {
      console.error('Error creating material:', error)
      throw new Error('Error al crear material')
    }
  },

  async update(id: string, data: Partial<Omit<Material, 'id' | 'created_at'>>): Promise<Material> {
    try {
      const { data: updatedMaterial, error } = await supabase
        .from('materiales')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return updatedMaterial
    } catch (error) {
      console.error('Error updating material:', error)
      throw new Error('Error al actualizar material')
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('materiales')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    } catch (error) {
      console.error('Error deleting material:', error)
      throw new Error('Error al eliminar material')
    }
  },

  async getByCodigo(codigo: string): Promise<Material | null> {
    try {
      const { data, error } = await supabase
        .from('materiales')
        .select('*')
        .eq('codigo', codigo)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // No rows returned
        throw error
      }
      return data
    } catch (error) {
      console.error('Error fetching material by codigo:', error)
      return null
    }
  },

  async getByCategoria(categoria: string): Promise<Material[]> {
    try {
      const { data, error } = await supabase
        .from('materiales')
        .select('*')
        .eq('categoria', categoria)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching materiales by categoria:', error)
      throw new Error('Error al obtener materiales por categoría')
    }
  },

  // Mapeo de categorías a prefijos
  getCategoryPrefix(categoria: string): string {
    const categoryMap: { [key: string]: string } = {
      'Acero': 'ACE',
      'Madera': 'MAD',
      'Consumible': 'CON',
      'Alambre': 'ALA',
      'Aditivos': 'ADI',
      'Cemento': 'CEM',
      'Agregados': 'AGR',
      'Herramientas': 'HER',
      'Equipos': 'EQU',
      'Pinturas': 'PIN',
      'Electricidad': 'ELE',
      'Plomería': 'PLO',
      'Otros': 'OTR'
    }
    
    return categoryMap[categoria] || 'OTR'
  },

  // Generar el siguiente código disponible para una categoría
  async getNextCode(categoria: string): Promise<string> {
    try {
      const prefix = this.getCategoryPrefix(categoria)
      
      // Obtener todos los materiales con el mismo prefijo
      const { data, error } = await supabase
        .from('materiales')
        .select('codigo')
        .like('codigo', `${prefix}%`)
        .order('codigo')
      
      if (error) throw error
      
      // Encontrar el siguiente número disponible
      let nextNumber = 1
      if (data && data.length > 0) {
        const existingNumbers = data
          .map(item => {
            const match = item.codigo.match(new RegExp(`^${prefix}(\\d+)$`))
            return match ? parseInt(match[1], 10) : 0
          })
          .filter(num => num > 0)
          .sort((a, b) => a - b)
        
        // Encontrar el primer hueco o el siguiente número
        for (let i = 0; i < existingNumbers.length; i++) {
          if (existingNumbers[i] !== i + 1) {
            nextNumber = i + 1
            break
          }
        }
        
        // Si no hay huecos, usar el siguiente número
        if (nextNumber === 1 && existingNumbers.length > 0) {
          nextNumber = existingNumbers[existingNumbers.length - 1] + 1
        }
      }
      
      // Formatear con ceros a la izquierda (2 dígitos)
      return `${prefix}${nextNumber.toString().padStart(2, '0')}`
    } catch (error) {
      console.error('Error generating next code:', error)
      throw new Error('Error al generar el código automático')
    }
  }
}