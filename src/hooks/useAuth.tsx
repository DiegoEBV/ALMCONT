import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import { localSessionCache } from '../services/localSessionCache'
import { supabaseUsersService } from '../services/supabaseUsersService'
import { supabase } from '../lib/supabase'
import { obrasService } from '../services/obras'
import { mapLocalIdToUUID } from '../utils/idMapper'
import type { AuthUser, AuthContextType, AuthSession, SupabaseUserMetadata, SupabaseAppMetadata } from '../types/auth'
import type { Usuario } from '../types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to load obra information
  const loadObraInfo = async (obraId: string) => {
    try {
      console.log('🏗️ useAuth: Cargando obra con ID:', obraId)

      // Verificar si el obra_id ya es un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      if (uuidRegex.test(obraId)) {
        // Es un UUID, usar directamente
        console.log('🏗️ useAuth: obra_id es UUID válido, consultando directamente')
        const obra = await obrasService.getById(obraId)
        return obra
      } else {
        // Es un ID local, intentar mapear a UUID
        console.log('🏗️ useAuth: obra_id es ID local, intentando mapear a UUID')
        const obraUUID = await mapLocalIdToUUID(obraId, 'obra')
        if (obraUUID) {
          console.log('🏗️ useAuth: UUID mapeado:', obraUUID)
          const obra = await obrasService.getById(obraUUID)
          return obra
        }
      }

      console.warn(`⚠️ useAuth: Obra con ID ${obraId} no encontrada`)
      return null
    } catch (error) {
      console.error('Error loading obra info:', error)
      return null
    }
  }

  // Memoizar las funciones para evitar re-renderizados innecesarios
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)

      console.log('🔐 useAuth: Iniciando login para:', email)

      // Autenticación exclusiva con Supabase
      console.log('🔍 useAuth: Autenticación con Supabase Auth...')
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        console.log('❌ useAuth: Error en Supabase Auth:', authError.message)
        throw new Error('Invalid login credentials')
      }

      if (!data.user) {
        console.log('❌ useAuth: No se recibieron datos de usuario de Supabase')
        throw new Error('No user data received')
      }

      console.log('✅ useAuth: Autenticación Supabase exitosa para:', data.user.email)
      console.log('--- Supabase Raw User Data ---', data.user)

      // Resolver usuario de aplicación desde tabla usuarios en Supabase
      console.log('🔍 useAuth: Resolviendo usuario de aplicación...')

      // 1. Intentar obtener por ID (lo más seguro y correcto)
      let appUser: Usuario | null = await supabaseUsersService.getById(data.user.id)

      console.log('🔍 DEBUG signIn - User from getById:', appUser)
      if (appUser) {
        console.log('🔍 DEBUG signIn - User Rol:', appUser.rol)
      }

      // 2. Si no existe por ID, intentar por email (fallback para usuarios legacy o desincronizados)
      if (!appUser) {
        console.log('⚠️ useAuth: Usuario no encontrado por ID, intentando por email...')
        appUser = await supabaseUsersService.getByEmail(email)
      }

      // 3. Si aún no existe, crear o asegurar el usuario
      if (!appUser) {
        console.log('⚠️ useAuth: Usuario no encontrado, creando/asegurando nuevo usuario...')
        const meta = data.user.user_metadata as SupabaseUserMetadata | null
        const withAppMeta = data.user as unknown as { app_metadata?: SupabaseAppMetadata }
        const appMeta = withAppMeta.app_metadata || null
        console.log('Supabase user_metadata', meta)
        console.log('Supabase app_metadata', appMeta)
        const metaRol = meta?.rol || meta?.role || appMeta?.rol || appMeta?.role
        console.log('Extracted role from metadata', metaRol)

        appUser = await supabaseUsersService.ensureUser(email, {
          email,
          nombre: email.split('@')[0],
          apellido: '',
          rol: (metaRol || 'COORDINACION'),
          activo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, data.user.id) as unknown as Usuario
      }

      // Cargar información de la obra si está asignada
      let obra = null
      if (appUser?.obra_id) {
        console.log('🏗️ useAuth: Cargando información de obra:', appUser.obra_id)
        obra = await loadObraInfo(appUser.obra_id)
        if (obra) {
          console.log('✅ useAuth: Obra cargada:', obra.nombre)
        } else {
          console.log('⚠️ useAuth: No se pudo cargar la obra')
        }
      }

      const meta = data.user.user_metadata as SupabaseUserMetadata | null
      const withAppMeta = data.user as unknown as { app_metadata?: SupabaseAppMetadata }
      const appMeta = withAppMeta.app_metadata || null
      const metaRol = meta?.rol || meta?.role || appMeta?.rol || appMeta?.role
      const authUser: AuthUser = {
        id: appUser?.id || data.user.id,
        email: email,
        nombre: appUser?.nombre || email.split('@')[0],
        apellido: appUser?.apellido || '',
        rol: appUser?.rol || metaRol || 'COORDINACION',
        obra_id: appUser?.obra_id || '',
        activo: appUser?.activo ?? true,
        obra: obra,
        supabaseId: data.user.id
      }

      const newSession = {
        user: authUser,
        token: data.session.access_token,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      }

      setUser(authUser)
      setSession(newSession)
      localSessionCache.saveSupabaseSession(newSession)
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      console.log('🔄 useAuth: Iniciando logout')

      // Limpiar estado inmediatamente para evitar bucles
      setUser(null)
      setSession(null)

      // Limpiar sesión local (esto ya incluye Supabase)
      await localSessionCache.signOut()
      await supabase.auth.signOut()

      console.log('✅ useAuth: Logout completado')
    } catch (error) {
      console.error('❌ Error en logout:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser()
      const supUser = data?.user
      if (!supUser?.email) return null

      const appUser = await supabaseUsersService.getByEmail(supUser.email)
      if (!appUser) return null

      let obra = null
      if (appUser.obra_id) {
        obra = await loadObraInfo(appUser.obra_id)
      }

      const updatedUser: AuthUser = {
        id: appUser.id,
        email: appUser.email,
        nombre: appUser.nombre,
        apellido: appUser.apellido,
        rol: appUser.rol as import('../types/auth').UserRole,
        obra_id: appUser.obra_id,
        activo: appUser.activo,
        obra,
        supabaseId: supUser.id
      }

      setUser(updatedUser)
      if (session) {
        setSession(prev => prev ? { ...prev, user: updatedUser } : null)
      }
      return updatedUser
    } catch (error) {
      console.error('Error refreshing user:', error)
      return null
    }
  }, [session])

  // Inicialización de autenticación optimizada
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        if (!isMounted) return

        // Verificar sesión local primero (más rápido)
        const localSession = localSessionCache.getSession()
        if (localSession && isMounted) {
          // Cargar información de la obra si está asignada
          let obra = null
          if (localSession.user.obra_id) {
            obra = await loadObraInfo(localSession.user.obra_id)
          }

          const userWithObra = {
            ...localSession.user,
            obra: obra
          }

          setUser(userWithObra)
          setSession({
            ...localSession,
            user: userWithObra
          })
          // No retornar: continuar y validar contra Supabase para sincronizar rol actualizado
          setLoading(false)
        }

        // Verificar Supabase y sincronizar información aunque exista sesión local
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()

        if (supabaseSession?.user && isMounted) {
          // Buscar usuario local correspondiente
          const appUser = await supabaseUsersService.getByEmail(supabaseSession.user.email!)
          if (appUser && isMounted) {
            // Cargar información de la obra si está asignada
            let obra = null
            if (appUser.obra_id) {
              obra = await loadObraInfo(appUser.obra_id)
            }

            const authUser: AuthUser = {
              id: appUser.id,
              email: appUser.email,
              nombre: appUser.nombre,
              apellido: appUser.apellido,
              rol: appUser.rol as import('../types/auth').UserRole,
              obra_id: appUser.obra_id,
              activo: appUser.activo,
              obra: obra,
              supabaseId: supabaseSession.user.id
            }

            const session = {
              user: authUser,
              token: supabaseSession.access_token,
              expiresAt: Date.now() + (24 * 60 * 60 * 1000)
            }

            setUser(authUser)
            setSession(session)
            localSessionCache.saveSupabaseSession(session)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const updateObraAsignada = useCallback(async (obraId: string | null): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.getUser()
      const supUser = data?.user
      if (!supUser?.id) return false
      const success = await supabaseUsersService.updateObraAsignada(supUser.id, obraId)
      if (success) {
        // Refrescar datos del usuario para obtener la obra actualizada
        await refreshUser()
      }
      return success
    } catch (error) {
      console.error('Error updating obra asignada:', error)
      return false
    }
  }, [refreshUser])

  // Memoizar el valor del contexto para evitar re-renderizados innecesarios
  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    loading,
    error,
    signIn: async (email: string, password: string): Promise<AuthUser> => {
      await signIn(email, password)
      // Esperar a que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 100))
      if (!user) throw new Error('No user after sign-in')
      return user
    },
    signOut,
    refreshUser: async () => {
      await refreshUser()
    },
    updateObraAsignada
  }), [user, session, loading, error, signIn, signOut, refreshUser, updateObraAsignada])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext }

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
