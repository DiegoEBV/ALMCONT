import { supabase } from '../lib/supabase'
import { isValidUUID } from '../utils/uuidValidator'
import type { Usuario, UserRole } from '../types'

export const supabaseUsersService = {
  // Helper para mapear usuario de DB (role) a App (rol)
  _mapDbUser(dbUser: any): Usuario | null {
    if (!dbUser) return null

    console.log('🔍 DEBUG _mapDbUser - Raw DB User:', dbUser)
    console.log('🔍 DEBUG _mapDbUser - Keys:', Object.keys(dbUser))

    // Si ya tiene rol y no role, asumimos que está bien o es legacy
    // Si tiene role, lo mapeamos a rol
    const mapped = {
      ...dbUser,
      rol: dbUser.role || dbUser.rol || 'PENDIENTE'
    }

    console.log('🔍 DEBUG _mapDbUser - Mapped User Rol:', mapped.rol)

    // Limpiar propiedad role para evitar confusión en el app (opcional, pero limpio)
    // delete mapped.role 
    return mapped as Usuario
  },

  // Helper para mapear usuario de App (rol) a DB (rol)
  _mapAppUserToDb(userData: Partial<Usuario>): any {
    const payload: any = { ...userData }

    // La base de datos usa 'rol', así que nos aseguramos de que se envíe así.
    // NO mapeamos a 'role' porque la columna no existe.

    return payload
  },

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

      return (data || []).map(u => this._mapDbUser(u)!)
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

      return this._mapDbUser(data)
    } catch (error) {
      console.error('Error fetching user from Supabase:', error)
      return null
    }
  },

  // Obtener usuarios por rol desde Supabase
  async getByRol(rol: UserRole): Promise<Usuario[]> {
    try {
      // Consultamos por la columna 'rol' que es la correcta en la DB
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', rol)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users by role from Supabase:', error)
        throw error
      }

      return (data || []).map(u => this._mapDbUser(u)!)

      return (data || []).map(u => this._mapDbUser(u)!)
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

      return this._mapDbUser(data)
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
    const { data } = await supabase.auth.getUser()
    const supUser = data?.user
    if (!supUser?.id) return false
    return await this.updateObraAsignada(supUser.id, obraId)
  },

  // Crear usuario en Supabase
  async create(userData: Partial<Usuario>): Promise<Usuario | null> {
    try {
      const dbPayload = this._mapAppUserToDb({
        ...userData,
        id: userData.id || crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      const { data, error } = await supabase
        .from('usuarios')
        .insert([dbPayload])
        .select()
        .single()

      if (error) {
        console.error('Error creating user in Supabase:', error)
        throw error
      }

      return this._mapDbUser(data)
    } catch (error) {
      console.error('Error creating user in Supabase:', error)
      return null
    }
  },

  async ensureUser(email: string, userData: Partial<Usuario>, supabaseUserId?: string): Promise<Usuario | null> {
    try {
      const existing = await this.getByEmail(email)
      if (existing) return existing
      const data = await this.create({
        id: supabaseUserId,
        email,
        ...userData,
        activo: userData.activo ?? true,
      })
      return data
    } catch {
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

      const dbPayload = this._mapAppUserToDb({
        ...userData,
        updated_at: new Date().toISOString()
      })

      const { data, error } = await supabase
        .from('usuarios')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user in Supabase:', error)
        throw error
      }

      return this._mapDbUser(data)
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
