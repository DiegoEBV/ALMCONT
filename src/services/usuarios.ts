import { localDB } from '../lib/localDB'
import type { Usuario, UserRole } from '../types'

export const usuariosService = {
  async getAll(): Promise<Usuario[]> {
    try {
      return localDB.get('usuarios')
    } catch (error) {
      console.error('Error fetching usuarios:', error)
      throw new Error('Error al obtener usuarios')
    }
  },

  async getById(id: string): Promise<Usuario | null> {
    try {
      return localDB.getById('usuarios', id)
    } catch (error) {
      console.error('Error fetching usuario:', error)
      return null
    }
  },

  async create(data: Partial<Usuario>): Promise<Usuario> {
    try {
      return localDB.create('usuarios', {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error creating usuario:', error)
      throw new Error('Error al crear usuario')
    }
  },

  async update(id: string, data: Partial<Usuario>): Promise<Usuario> {
    try {
      return localDB.update('usuarios', id, {
        ...data,
        updated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating usuario:', error)
      throw new Error('Error al actualizar usuario')
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await localDB.delete('usuarios', id)
    } catch (error) {
      console.error('Error deleting usuario:', error)
      throw new Error('Error al eliminar usuario')
    }
  },

  async getByEmail(email: string): Promise<Usuario | null> {
    try {
      const usuarios = await localDB.getWhere('usuarios', (item: Usuario) => item.email === email)
      return usuarios[0] || null
    } catch (error) {
      console.error('Error fetching usuario by email:', error)
      return null
    }
  },

  async getByRol(rol: UserRole): Promise<Usuario[]> {
    try {
      return localDB.getWhere('usuarios', (item: Usuario) => item.rol === rol)
    } catch (error) {
      console.error('Error fetching usuarios by rol:', error)
      throw new Error('Error al obtener usuarios por rol')
    }
  }
}