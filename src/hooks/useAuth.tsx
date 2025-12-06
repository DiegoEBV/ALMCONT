import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import { localSessionCache } from '../services/localSessionCache'
import { supabaseUsersService } from '../services/supabaseUsersService'
import { supabase } from '../lib/supabase'
import { obrasService } from '../services/obras'
import { localDB } from '../lib/localDB'
import { mapLocalIdToUUID } from '../utils/idMapper'
import type { AuthUser, AuthContextType, AuthSession } from '../types'

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
        } else {
          // Fallback: intentar obtener de la base de datos local
          console.warn(`No se pudo mapear obra_id ${obraId} a UUID, intentando obtener localmente`)
          const obraLocal = await localDB.getById('obras', obraId)
          if (obraLocal) {
            console.log('✅ useAuth: Obra obtenida de BD local:', obraLocal.nombre)
            return obraLocal
          }
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

      // Resolver usuario de aplicación desde tabla usuarios en Supabase
      console.log('🔍 useAuth: Resolviendo usuario de aplicación...')
      let appUser = await supabaseUsersService.getByEmail(email)
      if (!appUser) {
        appUser = await supabaseUsersService.ensureUser(email, {
          email,
          nombre: email.split('@')[0],
          apellido: '',
          rol: email.includes('residente') ? 'RESIDENTE' : 'PRODUCCION', // Fix: Auto-detect resident role
          activo: true
        }) as any
      } else if (email === 'residente@obra.com' && appUser.rol !== 'RESIDENTE') {
        // Fix: Auto-correct role for existing user
        console.log('🛠️ Fixing resident role for existing user...')
        await supabaseUsersService.update(appUser.id, { rol: 'RESIDENTE' })
        appUser.rol = 'RESIDENTE'
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

      const authUser: AuthUser = {
        id: appUser?.id || data.user.id,
        email: email,
        nombre: appUser?.nombre || email.split('@')[0],
        apellido: appUser?.apellido || '',
        rol: email.toLowerCase().includes('residente') ? 'RESIDENTE' : ((appUser?.rol as any) || 'PRODUCCION'),
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
        rol: appUser.rol as any,
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

          // Fix: Ensure resident role is correct even from local cache
          if (userWithObra.email === 'residente@obra.com' && userWithObra.rol !== 'RESIDENTE') {
            console.log('🛠️ Fixing resident role from local cache...')
            userWithObra.rol = 'RESIDENTE'
            // Trigger background update to ensure backend is synced
            supabaseUsersService.getByEmail(userWithObra.email).then(appUser => {
              if (appUser && appUser.rol !== 'RESIDENTE') {
                supabaseUsersService.update(appUser.id, { rol: 'RESIDENTE' })
              }
            })
          }

          setUser(userWithObra)
          setSession({
            ...localSession,
            user: userWithObra
          })
          setLoading(false)
          return
        }

        // Solo verificar Supabase si no hay sesión local
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()

        if (supabaseSession?.user && isMounted) {
          // Buscar usuario local correspondiente
          let appUser = await supabaseUsersService.getByEmail(supabaseSession.user.email!)

          // Fix: Auto-correct role for resident if needed
          if (appUser && appUser.email === 'residente@obra.com' && appUser.rol !== 'RESIDENTE') {
            console.log('🛠️ Fixing resident role during init...')
            await supabaseUsersService.update(appUser.id, { rol: 'RESIDENTE' })
            appUser.rol = 'RESIDENTE'
          }

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
              rol: appUser.rol as any,
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
