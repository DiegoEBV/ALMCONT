import { supabase } from '../lib/supabase'
import { localAuth } from './localAuth'
import { isValidUUID } from '../utils/uuidValidator'
import type { Usuario, UserRole } from '../types'

export const supabaseUsersService = {
  // Obtener todos los usuarios desde Supabase
  async getAll(): Promise<Usuario[]> {
    try {
      console.log('🔍 DEBUG - Consultando usuarios desde Supabase...')
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error consultando usuarios desde Supabase:', error)
        throw error
      }

      console.log('🔍 DEBUG - Usuarios obtenidos desde Supabase:', data?.length || 0)
      console.log('🔍 DEBUG - Primeros 3 usuarios:', data?.slice(0, 3))
      
      return data || []
    } catch (error) {
      console.error('❌ Error en getAll usuarios desde Supabase:', error)
      return []
    }
  },

  // Obtener usuario por ID desde Supabase
  async getById(id: string): Promise<Usuario | null> {
    try {
      if (!isValidUUID(id)) {
        console.error('Error: userId inválido para consulta Supabase:', id)
        return null
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching user from Supabase:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user from Supabase:', error)
      return null
    }
  },

  // Obtener usuarios por rol desde Supabase
  async getByRol(rol: UserRole): Promise<Usuario[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', rol)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users by rol from Supabase:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error fetching users by rol from Supabase:', error)
      return []
    }
  },

  // Obtener usuario por email desde Supabase
  async getByEmail(email: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        console.error('Error fetching user by email from Supabase:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user by email from Supabase:', error)
      return null
    }
  },

  // Actualizar obra asignada en Supabase
  async updateObraAsignada(userId: string, obraId: string | null): Promise<boolean> {
    try {
      // Validar que userId sea un UUID válido
      if (!isValidUUID(userId)) {
        console.error('Error: userId inválido para Supabase:', userId)
        throw new Error(`ID de usuario inválido: "${userId}". Se esperaba un UUID válido.`)
      }

      // Validar obraId si no es null
      if (obraId !== null && !isValidUUID(obraId)) {
        console.error('Error: obraId inválido para Supabase:', obraId)
        throw new Error(`ID de obra inválido: "${obraId}". Se esperaba un UUID válido o null.`)
      }

      console.log('Actualizando obra en Supabase:', { userId, obraId })

      const { error } = await supabase
        .from('usuarios')
        .update({ 
          obra_id: obraId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        console.error('Error updating obra in Supabase:', error)
        return false
      }

      console.log('Obra actualizada exitosamente en Supabase')
      return true
    } catch (error) {
      console.error('Error updating obra in Supabase:', error)
      return false
    }
  },

  // Sincronizar obra asignada del usuario actual
  async syncCurrentUserObraAsignada(obraId: string | null): Promise<boolean> {
    const user = localAuth.getCurrentUser()
    if (!user) {
      return false
    }

    // Actualizar en Supabase
    const supabaseSuccess = await this.updateObraAsignada(user.id, obraId)
    
    // Actualizar localmente solo si Supabase fue exitoso
    if (supabaseSuccess) {
      const localSuccess = await localAuth.updateObraAsignada(obraId)
      return localSuccess
    }

    return false
  },

  // Crear usuario en Supabase
  async create(userData: Partial<Usuario>): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .insert([{
          ...userData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating user in Supabase:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error creating user in Supabase:', error)
      return null
    }
  },

  // Actualizar usuario en Supabase
  async update(id: string, userData: Partial<Usuario>): Promise<Usuario | null> {
    try {
      if (!isValidUUID(id)) {
        console.error('Error: userId inválido para actualización Supabase:', id)
        return null
      }

      const { data, error } = await supabase
        .from('usuarios')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user in Supabase:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error updating user in Supabase:', error)
      return null
    }
  },

  // Eliminar usuario en Supabase
  async delete(id: string): Promise<boolean> {
    try {
      if (!isValidUUID(id)) {
        console.error('Error: userId inválido para eliminación Supabase:', id)
        return false
      }

      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting user in Supabase:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting user in Supabase:', error)
      return false
    }
  }
}