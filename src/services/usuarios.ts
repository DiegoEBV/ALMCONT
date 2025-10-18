import { localDB } from '../lib/localDB'
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
      
      console.log('⚠️ usuariosService.getAll: No se encontraron usuarios en Supabase, usando localDB como fallback')
      return localDB.get('usuarios')
    } catch (error) {
      console.error('❌ usuariosService.getAll: Error con Supabase, usando localDB como fallback:', error)
      try {
        return localDB.get('usuarios')
      } catch (localError) {
        console.error('❌ usuariosService.getAll: Error también en localDB:', localError)
        throw new Error('Error al obtener usuarios')
      }
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
      
      console.log('⚠️ usuariosService.getById: Usuario no encontrado en Supabase, buscando en localDB')
      return localDB.getById('usuarios', id)
    } catch (error) {
      console.error('❌ usuariosService.getById: Error con Supabase, usando localDB como fallback:', error)
      try {
        return localDB.getById('usuarios', id)
      } catch (localError) {
        console.error('❌ usuariosService.getById: Error también en localDB:', localError)
        return null
      }
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
        // También crear en localDB para sincronización
        try {
          await localDB.create('usuarios', supabaseUser)
          console.log('✅ usuariosService.create: Usuario sincronizado en localDB')
        } catch (localError) {
          console.warn('⚠️ usuariosService.create: Error sincronizando en localDB:', localError)
        }
        return supabaseUser
      }
      
      console.log('⚠️ usuariosService.create: Creando usuario en localDB como fallback')
      return localDB.create('usuarios', {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('❌ usuariosService.create: Error con Supabase, usando localDB como fallback:', error)
      try {
        return localDB.create('usuarios', {
          ...data,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      } catch (localError) {
        console.error('❌ usuariosService.create: Error también en localDB:', localError)
        throw new Error('Error al crear usuario')
      }
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
        // También actualizar en localDB para sincronización
        try {
          await localDB.update('usuarios', id, supabaseUser)
          console.log('✅ usuariosService.update: Usuario sincronizado en localDB')
        } catch (localError) {
          console.warn('⚠️ usuariosService.update: Error sincronizando en localDB:', localError)
        }
        return supabaseUser
      }
      
      console.log('⚠️ usuariosService.update: Actualizando usuario en localDB como fallback')
      return localDB.update('usuarios', id, {
        ...data,
        updated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('❌ usuariosService.update: Error con Supabase, usando localDB como fallback:', error)
      try {
        return localDB.update('usuarios', id, {
          ...data,
          updated_at: new Date().toISOString()
        })
      } catch (localError) {
        console.error('❌ usuariosService.update: Error también en localDB:', localError)
        throw new Error('Error al actualizar usuario')
      }
    }
  },

  async delete(id: string): Promise<void> {
    try {
      console.log('🗑️ usuariosService.delete: Eliminando usuario de Supabase:', id)
      // Intentar eliminar de Supabase primero
      await supabaseUsersService.delete(id)
      console.log('✅ usuariosService.delete: Usuario eliminado de Supabase')
      
      // También eliminar de localDB si existe
      await localDB.delete('usuarios', id)
      console.log('✅ usuariosService.delete: Usuario eliminado de localDB')
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
      
      console.log('⚠️ usuariosService.getByEmail: Usuario no encontrado en Supabase, buscando en localDB')
      const usuarios = await localDB.getWhere('usuarios', (item: Usuario) => item.email === email)
      const localUser = usuarios[0] || null
      if (localUser) {
        console.log('✅ usuariosService.getByEmail: Usuario encontrado en localDB:', {
          id: localUser.id,
          email: localUser.email,
          activo: localUser.activo,
          rol: localUser.rol
        })
      } else {
        console.log('❌ usuariosService.getByEmail: Usuario no encontrado en ninguna fuente:', email)
      }
      return localUser
    } catch (error) {
      console.error('❌ usuariosService.getByEmail: Error con Supabase, usando localDB como fallback:', error)
      try {
        const usuarios = await localDB.getWhere('usuarios', (item: Usuario) => item.email === email)
        const localUser = usuarios[0] || null
        if (localUser) {
          console.log('✅ usuariosService.getByEmail: Usuario encontrado en localDB (fallback):', localUser.email)
        }
        return localUser
      } catch (localError) {
        console.error('❌ usuariosService.getByEmail: Error también en localDB:', localError)
        return null
      }
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
      
      console.log('⚠️ usuariosService.getByRol: No se encontraron usuarios en Supabase, usando localDB como fallback')
      return localDB.getWhere('usuarios', (item: Usuario) => item.rol === rol)
    } catch (error) {
      console.error('❌ usuariosService.getByRol: Error con Supabase, usando localDB como fallback:', error)
      try {
        return localDB.getWhere('usuarios', (item: Usuario) => item.rol === rol)
      } catch (localError) {
        console.error('❌ usuariosService.getByRol: Error también en localDB:', localError)
        throw new Error('Error al obtener usuarios por rol')
      }
    }
  }
}