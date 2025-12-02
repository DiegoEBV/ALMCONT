import { supabaseUsersService } from './supabaseUsersService'
import type { Usuario, UserRole } from '../types'

export const usuariosService = {
  async getAll(): Promise<Usuario[]> {
    try {
      console.log('🔍 usuariosService.getAll: Intentando obtener usuarios desde Supabase...')
      // Intentar obtener desde Supabase primero
      const supabaseUsers = await supabaseUsersService.getAll()
      if (supabaseUsers && supabaseUsers.length > 0) {
        console.log('✅ usuariosService.getAll: Usuarios obtenidos desde Supabase:', supabaseUsers.length)
        return supabaseUsers
      }
      
      console.log('⚠️ usuariosService.getAll: No se encontraron usuarios en Supabase')
      return []
    } catch (error) {
      console.error('❌ usuariosService.getAll: Error con Supabase:', error)
      throw new Error('Error al obtener usuarios')
    }
  },

  async getById(id: string): Promise<Usuario | null> {
    try {
      console.log('🔍 usuariosService.getById: Buscando usuario por ID en Supabase:', id)
      // Intentar obtener desde Supabase primero
      const supabaseUser = await supabaseUsersService.getById(id)
      if (supabaseUser) {
        console.log('✅ usuariosService.getById: Usuario encontrado en Supabase:', supabaseUser.email)
        return supabaseUser
      }
      
      console.log('⚠️ usuariosService.getById: Usuario no encontrado en Supabase')
      return null
    } catch (error) {
      console.error('❌ usuariosService.getById: Error con Supabase:', error)
      return null
    }
  },

  async create(data: Partial<Usuario>): Promise<Usuario> {
    try {
      console.log('➕ usuariosService.create: Creando usuario en Supabase:', data.email)
      // Intentar crear en Supabase primero
      const supabaseUser = await supabaseUsersService.create({
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      if (supabaseUser) {
        console.log('✅ usuariosService.create: Usuario creado en Supabase:', supabaseUser.id)
        return supabaseUser
      }
      
      throw new Error('No se pudo crear usuario en Supabase')
    } catch (error) {
      console.error('❌ usuariosService.create: Error con Supabase:', error)
      throw new Error('Error al crear usuario')
    }
  },

  async update(id: string, data: Partial<Usuario>): Promise<Usuario> {
    try {
      console.log('✏️ usuariosService.update: Actualizando usuario en Supabase:', id)
      // Intentar actualizar en Supabase primero
      const supabaseUser = await supabaseUsersService.update(id, {
        ...data,
        updated_at: new Date().toISOString()
      })
      
      if (supabaseUser) {
        console.log('✅ usuariosService.update: Usuario actualizado en Supabase')
        return supabaseUser
      }
      
      throw new Error('No se pudo actualizar usuario en Supabase')
    } catch (error) {
      console.error('❌ usuariosService.update: Error con Supabase:', error)
      throw new Error('Error al actualizar usuario')
    }
  },

  async delete(id: string): Promise<void> {
    try {
      console.log('🗑️ usuariosService.delete: Eliminando usuario de Supabase:', id)
      // Intentar eliminar de Supabase primero
      await supabaseUsersService.delete(id)
      console.log('✅ usuariosService.delete: Usuario eliminado de Supabase')
      
      // No mantener almacenamiento local
    } catch (error) {
      console.error('❌ usuariosService.delete: Error eliminando usuario:', error)
      throw new Error('Error al eliminar usuario')
    }
  },

  async getByEmail(email: string): Promise<Usuario | null> {
    try {
      console.log('🔍 usuariosService.getByEmail: Buscando usuario por email en Supabase:', email)
      // Intentar obtener desde Supabase primero
      const supabaseUser = await supabaseUsersService.getByEmail(email)
      if (supabaseUser) {
        console.log('✅ usuariosService.getByEmail: Usuario encontrado en Supabase:', {
          id: supabaseUser.id,
          email: supabaseUser.email,
          activo: supabaseUser.activo,
          rol: supabaseUser.rol
        })
        return supabaseUser
      }
      
      console.log('⚠️ usuariosService.getByEmail: Usuario no encontrado en Supabase')
      return null
    } catch (error) {
      console.error('❌ usuariosService.getByEmail: Error con Supabase:', error)
      return null
    }
  },

  async getByRol(rol: UserRole): Promise<Usuario[]> {
    try {
      console.log('🔍 usuariosService.getByRol: Buscando usuarios por rol en Supabase:', rol)
      // Intentar obtener desde Supabase primero
      const allUsers = await supabaseUsersService.getAll()
      if (allUsers && allUsers.length > 0) {
        const filteredUsers = allUsers.filter(user => user.rol === rol)
        console.log('✅ usuariosService.getByRol: Usuarios encontrados en Supabase:', filteredUsers.length)
        return filteredUsers
      }
      
      console.log('⚠️ usuariosService.getByRol: No se encontraron usuarios en Supabase')
      return []
    } catch (error) {
      console.error('❌ usuariosService.getByRol: Error con Supabase:', error)
      throw new Error('Error al obtener usuarios por rol')
    }
  }
}
