import { localDB } from '../lib/localDB'
import { syncService } from './syncService'
import { setSupabaseUserContext } from '../lib/supabase'
import { mapLocalIdToUUID } from '../utils/idMapper'
import { Usuario, AuthUser, AuthSession } from '../types'

// Re-exportar tipos para uso externo
export type { AuthUser, AuthSession }

class LocalAuthService {
  private currentSession: AuthSession | null = null
  private readonly SESSION_KEY = 'almacen_auth_session'
  private readonly TOKEN_DURATION = 24 * 60 * 60 * 1000 // 24 horas

  constructor() {
    this.loadSession()
  }

  // Iniciar sesión
  async signIn(email: string, password: string): Promise<{ user: AuthUser; session: AuthSession } | null> {
    try {
      // Buscar usuario en la base de datos local
      const usuarios = await localDB.get('usuarios')
      const usuario = usuarios.find(u => u.email === email && u.password === password && u.activo)

      if (!usuario) {
        throw new Error('Credenciales inválidas')
      }

      // Crear sesión
      const authUser: AuthUser = {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        obra_id: usuario.obra_id,
        activo: usuario.activo
      }

      const session: AuthSession = {
        user: authUser,
        token: this.generateToken(),
        expiresAt: Date.now() + this.TOKEN_DURATION
      }

      this.currentSession = session
      this.saveSession()

      // Establecer contexto de usuario en Supabase para RLS
      try {
        const userUUID = await mapLocalIdToUUID(usuario.id, 'usuario')
        if (userUUID) {
          await setSupabaseUserContext(userUUID)
        } else {
          console.warn('No se pudo mapear el usuario local a UUID de Supabase:', usuario.id)
        }
      } catch (error) {
        console.warn('Error al establecer contexto de usuario en Supabase:', error)
        // No fallar la autenticación por este error
      }

      return { user: authUser, session }
    } catch (error) {
      console.error('Error en signIn:', error)
      return null
    }
  }

  // Cerrar sesión
  async signOut(): Promise<void> {
    this.currentSession = null
    this.clearSession()
  }

  // Obtener sesión actual
  getSession(): AuthSession | null {
    if (!this.currentSession) {
      return null
    }

    // Verificar si la sesión ha expirado
    if (Date.now() > this.currentSession.expiresAt) {
      this.signOut()
      return null
    }

    return this.currentSession
  }

  // Obtener usuario actual
  getCurrentUser(): AuthUser | null {
    const session = this.getSession()
    return session?.user || null
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return this.getSession() !== null
  }

  // Refrescar datos del usuario
  async refreshUser(): Promise<AuthUser | null> {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return null
      }

      // Obtener datos actualizados del usuario desde la base de datos local
      const updatedUserData = await localDB.getById('usuarios', currentUser.id)
      if (!updatedUserData) {
        return null
      }

      // Obtener información de la obra si está asignada
      let obra = null
      if (updatedUserData.obra_id) {
        // Primero intentar obtener la obra localmente
        obra = await localDB.getById('obras', updatedUserData.obra_id)
        
        // Si no existe localmente, sincronizar desde Supabase
        if (!obra) {
          console.log(`Obra ${updatedUserData.obra_id} no encontrada localmente, sincronizando desde Supabase...`)
          obra = await syncService.syncObraById(updatedUserData.obra_id)
        }
      }

      const updatedUser: AuthUser = {
        id: updatedUserData.id,
        email: updatedUserData.email,
        nombre: updatedUserData.nombre,
        apellido: updatedUserData.apellido,
        rol: updatedUserData.rol,
        obra_id: updatedUserData.obra_id,
        activo: updatedUserData.activo,
        obra: obra
      }

      // Actualizar la sesión con los datos frescos
      this.saveSession({
        user: updatedUser,
        token: this.loadSession()?.token || ''
      })

      return updatedUser
    } catch (error) {
      console.error('Error refreshing user:', error)
      return null
    }
  }

  // Actualizar perfil del usuario actual
  async updateProfile(profileData: { nombre: string; apellido: string; email: string }): Promise<boolean> {
    const user = this.getCurrentUser()
    if (!user) {
      return false
    }

    // Verificar que el email no esté en uso por otro usuario
    if (profileData.email !== user.email) {
      const usuarios = await localDB.get('usuarios')
      const existingUser = usuarios.find(u => u.email === profileData.email && u.id !== user.id)
      if (existingUser) {
        throw new Error('El email ya está en uso por otro usuario')
      }
    }

    // Actualizar datos del usuario
    const updated = await localDB.update('usuarios', user.id, {
      nombre: profileData.nombre,
      apellido: profileData.apellido,
      email: profileData.email,
      updated_at: new Date().toISOString()
    })

    if (updated && this.currentSession) {
      // Actualizar sesión con los nuevos datos
      this.currentSession.user = {
        ...this.currentSession.user,
        nombre: profileData.nombre,
        apellido: profileData.apellido,
        email: profileData.email
      }
      this.saveSession()
    }

    return updated !== null
  }

  // Cambiar contraseña
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const user = this.getCurrentUser()
    if (!user) {
      return false
    }

    // Verificar contraseña actual
    const usuarios = await localDB.get('usuarios')
    const usuario = usuarios.find(u => u.id === user.id)
    if (!usuario || usuario.password !== currentPassword) {
      return false
    }

    // Actualizar contraseña
    const updated = await localDB.update('usuarios', user.id, { 
      password: newPassword,
      updated_at: new Date().toISOString()
    })
    return updated !== null
  }

  // Generar token simple
  private generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  // Guardar sesión en localStorage
  private saveSession(): void {
    if (this.currentSession) {
      try {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentSession))
      } catch (error) {
        console.warn('No se pudo guardar la sesión:', error)
      }
    }
  }

  // Cargar sesión desde localStorage
  private loadSession(): void {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY)
      if (stored) {
        const session = JSON.parse(stored) as AuthSession
        
        // Verificar si la sesión no ha expirado
        if (Date.now() <= session.expiresAt) {
          this.currentSession = session
        } else {
          this.clearSession()
        }
      }
    } catch (error) {
      console.warn('No se pudo cargar la sesión:', error)
      this.clearSession()
    }
  }

  // Limpiar sesión del localStorage
  private clearSession(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY)
    } catch (error) {
      console.warn('No se pudo limpiar la sesión:', error)
    }
  }

  // Obtener usuarios (solo para administración o durante autenticación)
  async getUsers(): Promise<Usuario[]> {
    const currentUser = this.getCurrentUser()
    
    // SIEMPRE permitir acceso durante autenticación (cuando no hay usuario actual)
    // También permitir si el usuario actual tiene rol de COORDINACION
    if (currentUser !== null && currentUser.rol !== 'COORDINACION') {
      throw new Error('No tienes permisos para ver usuarios')
    }

    return await localDB.get('usuarios')
  }

  // Guardar sesión de Supabase
  async saveSupabaseSession(session: AuthSession): Promise<void> {
    this.currentSession = session
    this.saveSession()
  }

  // Crear usuario (solo para administración)
  async createUser(userData: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>): Promise<Usuario> {
    const currentUser = this.getCurrentUser()
    if (!currentUser || currentUser.rol !== 'COORDINACION') {
      throw new Error('No tienes permisos para crear usuarios')
    }

    // Verificar que el email no exista
    const usuarios = await localDB.get('usuarios')
    const existingUser = usuarios.find(u => u.email === userData.email)
    if (existingUser) {
      throw new Error('El email ya está en uso')
    }

    return await localDB.create('usuarios', {
      ...userData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  // Actualizar usuario (solo para administración)
  async updateUser(id: string, userData: Partial<Usuario>): Promise<Usuario | null> {
    const currentUser = this.getCurrentUser()
    if (!currentUser || currentUser.rol !== 'COORDINACION') {
      throw new Error('No tienes permisos para actualizar usuarios')
    }

    return await localDB.update('usuarios', id, userData)
  }

  // Eliminar usuario (solo para administración)
  async deleteUser(id: string): Promise<boolean> {
    const currentUser = this.getCurrentUser()
    if (!currentUser || currentUser.rol !== 'COORDINACION') {
      throw new Error('No tienes permisos para eliminar usuarios')
    }

    // No permitir eliminar el usuario actual
    if (id === currentUser.id) {
      throw new Error('No puedes eliminar tu propio usuario')
    }

    return await localDB.delete('usuarios', id)
  }

  // Actualizar obra asignada del usuario actual
  async updateObraAsignada(obraId: string | null): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return false
      }

      // Actualizar en la base de datos local
      await localDB.update('usuarios', currentUser.id, { obra_id: obraId })

      // Obtener información completa de la obra
      let obra = null
      if (obraId) {
        // Primero intentar obtener la obra localmente
        obra = await localDB.getById('obras', obraId)
        
        // Si no existe localmente, sincronizar desde Supabase
        if (!obra) {
          console.log(`Obra ${obraId} no encontrada localmente, sincronizando desde Supabase...`)
          obra = await syncService.syncObraById(obraId)
        }
      }

      // Actualizar la sesión actual
      const updatedUser = {
        ...currentUser,
        obra_id: obraId,
        obra: obra
      }
      
      this.saveSession({
        user: updatedUser,
        token: this.loadSession()?.token || ''
      })

      return true
    } catch (error) {
      console.error('Error updating obra asignada:', error)
      return false
    }
  }
}

// Instancia singleton del servicio de autenticación
export const localAuth = new LocalAuthService()