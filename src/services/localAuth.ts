import { localDB } from '../lib/localDB'
import { syncService } from './syncService'
import { setSupabaseUserContext, supabase } from '../lib/supabase'
import { mapLocalIdToUUID } from '../utils/idMapper'
import { obrasService } from './obras'
import { userCache } from './userCache'
import { supabaseUsersService } from './supabaseUsersService'
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
  async signIn(email: string, password: string): Promise<AuthUser> {
    try {
      console.log('🔐 localAuth: Iniciando signIn para:', email)
      
      // PRIORIDAD 1: Buscar usuario en Supabase primero
      console.log('🔍 localAuth: Buscando usuario en Supabase...')
      let usuario: Usuario | null = null
      
      try {
        usuario = await supabaseUsersService.getByEmail(email)
        console.log('📊 localAuth: Usuario encontrado en Supabase:', !!usuario)
        
        if (usuario) {
          // Verificar estado activo y contraseña solo si existe columna
          const hasPassword = typeof (usuario as any).password !== 'undefined' && (usuario as any).password !== null
          if (usuario.activo && (!hasPassword || (usuario as any).password === password)) {
            console.log('✅ localAuth: Usuario válido encontrado en Supabase')
          } else {
            console.log('❌ localAuth: Usuario en Supabase pero credenciales inválidas o inactivo')
            console.log('   - Activo:', usuario.activo)
            console.log('   - Tiene contraseña:', hasPassword)
            console.log('   - Contraseña coincide:', hasPassword ? (usuario as any).password === password : 'N/A')
            usuario = null
          }
        }
      } catch (supabaseError) {
        console.warn('⚠️ localAuth: Error consultando Supabase, intentando localDB:', supabaseError)
      }
      
      // FALLBACK: Si no se encuentra en Supabase, buscar en localDB
      if (!usuario) {
        console.log('🔍 localAuth: Buscando usuario en base de datos local...')
        const usuarios = await localDB.get('usuarios')
        console.log('📊 localAuth: Total usuarios en BD local:', usuarios.length)
        
        usuario = usuarios.find(u => u.email === email && u.password === password && u.activo) || null

        if (!usuario) {
          if (email === 'residente@obra.com' && password === 'password123') {
            try {
              await fetch('/api/auth/seed-residente', { method: 'POST' })
              const seeded = await supabaseUsersService.getByEmail(email)
              if (seeded) {
                usuario = seeded
              }
            } catch (e) {
              console.warn('Seed residente falló:', e)
            }
          }

          if (!usuario) {
            console.log('❌ localAuth: Usuario no encontrado con credenciales válidas')
            console.log('📋 localAuth: Usuarios disponibles:', usuarios.map(u => ({ 
              email: u.email, 
              activo: u.activo, 
              hasPassword: !!u.password 
            })))
            
            // Verificar si el usuario existe pero con contraseña incorrecta
            const userExists = usuarios.find(u => u.email === email)
            if (userExists) {
              console.log('⚠️ localAuth: Usuario existe pero contraseña incorrecta o usuario inactivo')
              console.log('   - Activo:', userExists.activo)
              console.log('   - Tiene contraseña:', !!userExists.password)
            }
            
            throw new Error('Usuario no encontrado o inactivo')
          }
        }
      }

      console.log('✅ localAuth: Usuario encontrado:', usuario.email, 'Rol:', usuario.rol)
      // Obtener obra asignada si existe
      let obra = null
      if (usuario.obra_id) {
        try {
          console.log('🏗️ localAuth: Cargando obra con ID:', usuario.obra_id)
          
          // Verificar si el obra_id ya es un UUID válido
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          
          if (uuidRegex.test(usuario.obra_id)) {
            // Es un UUID, usar directamente
            console.log('🏗️ localAuth: obra_id es UUID válido, consultando directamente')
            obra = await obrasService.getById(usuario.obra_id)
          } else {
            // Es un ID local, intentar mapear a UUID
            console.log('🏗️ localAuth: obra_id es ID local, intentando mapear a UUID')
            const obraUUID = await mapLocalIdToUUID(usuario.obra_id, 'obra')
            if (obraUUID) {
              console.log('🏗️ localAuth: UUID mapeado:', obraUUID)
              obra = await obrasService.getById(obraUUID)
            } else {
              // Fallback: intentar obtener de la base de datos local
              console.warn(`No se pudo mapear obra_id ${usuario.obra_id} a UUID, intentando obtener localmente`)
              const obraLocal = await localDB.getById('obras', usuario.obra_id)
              if (obraLocal) {
                obra = obraLocal
              }
            }
          }
          
          if (obra) {
            console.log('✅ localAuth: Obra cargada exitosamente:', obra.nombre)
          } else {
            console.warn(`⚠️ localAuth: Obra con ID ${usuario.obra_id} no encontrada`)
          }
        } catch (error) {
          console.error('❌ localAuth: Error obteniendo obra:', error)
          // No fallar la autenticación por este error
        }
      }

      // Crear sesión
      const authUser: AuthUser = {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        obra_id: usuario.obra_id,
        activo: usuario.activo,
        obra: obra
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

      return authUser
    } catch (error) {
      console.error('Error en signIn:', error)
      throw error
    }
  }

  // Cerrar sesión
  async signOut(): Promise<void> {
    console.log('🚪 LocalAuth.signOut() - Cerrando sesión local')
    
    // Limpiar caché del usuario actual
    const currentUser = this.getCurrentUser()
    if (currentUser) {
      userCache.invalidate(currentUser.id)
    }
    
    // Limpiar sesión local inmediatamente
    this.currentSession = null
    this.clearSession()
    
    // Cerrar sesión en Supabase de forma no bloqueante
    try {
      // No esperar la respuesta de Supabase para evitar bloqueos
      supabase.auth.signOut().then(({ error }) => {
        if (error) {
          console.warn('Advertencia al cerrar sesión en Supabase:', error)
        } else {
          console.log('✅ Sesión cerrada correctamente en Supabase')
        }
      }).catch(error => {
        console.warn('Advertencia al cerrar sesión en Supabase:', error)
      })
    } catch (error) {
      console.warn('Advertencia al cerrar sesión en Supabase:', error)
    }
    
    console.log('✅ LocalAuth.signOut() - Sesión local cerrada')
  }

  // Obtener sesión actual
  getSession(): AuthSession | null {
    if (!this.currentSession) {
      return null
    }

    // Verificar si la sesión ha expirado
    if (Date.now() > this.currentSession.expiresAt) {
      console.log('⏰ Sesión expirada, cerrando sesión automáticamente')
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

      // Verificar caché primero
      const cachedUser = userCache.get(currentUser.id)
      if (cachedUser) {
        console.log('🚀 Usuario obtenido del caché:', cachedUser.email)
        return cachedUser
      }

      // Obtener datos actualizados del usuario desde la base de datos local únicamente
      const updatedUserData = await localDB.getById('usuarios', currentUser.id)
      if (!updatedUserData) {
        return null
      }

      // Obtener información de la obra si está asignada (solo local)
      let obra = null
      if (updatedUserData.obra_id) {
        obra = await localDB.getById('obras', updatedUserData.obra_id)
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

      // Guardar en caché
      userCache.set(currentUser.id, updatedUser)

      // Actualizar la sesión con los datos frescos
      if (this.currentSession) {
        this.currentSession.user = updatedUser
        this.saveSession()
      }

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
    console.log('🧹 Limpiando sesión del localStorage')
    try {
      localStorage.removeItem(this.SESSION_KEY)
    } catch (error) {
      console.warn('No se pudo limpiar la sesión:', error)
    }
  }

  // Obtener usuarios (solo para administración o durante autenticación)
  async getUsers(): Promise<Usuario[]> {
    const currentUser = this.getCurrentUser()
    
    console.log('🔍 getUsers() llamado - Usuario actual:', currentUser?.email || 'null', 'Rol:', currentUser?.rol || 'null')
    
    // SIEMPRE permitir acceso durante autenticación (cuando no hay usuario actual)
    // También permitir si el usuario actual tiene rol de COORDINACION
    if (currentUser === null) {
      // Durante autenticación, no hay usuario actual - PERMITIR acceso
      console.log('✅ Acceso permitido durante autenticación (currentUser es null)')
      return await localDB.get('usuarios')
    }
    
    // Si hay usuario actual, verificar que tenga permisos de COORDINACION
    if (currentUser.rol !== 'COORDINACION') {
      console.log('❌ Acceso denegado - Usuario no es COORDINACION:', currentUser.rol)
      throw new Error('No tienes permisos para ver usuarios')
    }

    console.log('✅ Acceso permitido - Usuario es COORDINACION')
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
      
      if (this.currentSession) {
        this.currentSession.user = updatedUser
        this.saveSession()
      }

      return true
    } catch (error) {
      console.error('Error updating obra asignada:', error)
      return false
    }
  }
}

// Instancia singleton del servicio de autenticación
export const localAuth = new LocalAuthService()
