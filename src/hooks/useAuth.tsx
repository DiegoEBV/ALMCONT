import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import { localAuth } from '../services/localAuth'
import { supabaseUsersService } from '../services/supabaseUsers'
import { supabase } from '../lib/supabase'
import type { AuthUser, AuthContextType, AuthSession } from '../types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoizar las funciones para evitar re-renderizados innecesarios
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)

      // Intentar autenticación con Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!data.user) {
        throw new Error('No user data received')
      }

      // Buscar usuario local correspondiente
      const usuarios = await localAuth.getUsers()
      const localUser = usuarios.find(u => u.email === email && u.activo)

      if (!localUser) {
        throw new Error('Usuario no encontrado o inactivo')
      }

      const authUser: AuthUser = {
        id: localUser.id,
        email: localUser.email,
        nombre: localUser.nombre,
        apellido: localUser.apellido,
        rol: localUser.rol,
        obra_id: localUser.obra_id,
        activo: localUser.activo,
        supabaseId: data.user.id
      }

      const newSession = {
        user: authUser,
        token: data.session.access_token,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      }

      setUser(authUser)
      setSession(newSession)
      await localAuth.saveSupabaseSession(newSession)
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
      await localAuth.signOut()
      
      console.log('✅ useAuth: Logout completado')
    } catch (error) {
      console.error('❌ Error en logout:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = user
      if (!currentUser) return null

      const refreshedUser = await localAuth.refreshUser()
      if (refreshedUser) {
        setUser(refreshedUser)
        if (session) {
          setSession(prev => prev ? { ...prev, user: refreshedUser } : null)
        }
      }
      return refreshedUser
    } catch (error) {
      console.error('Error refreshing user:', error)
      return null
    }
  }, [user, session])

  // Inicialización de autenticación optimizada
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        if (!isMounted) return
        
        // Verificar sesión local primero (más rápido)
        const localSession = localAuth.getSession()
        if (localSession && isMounted) {
          setUser(localSession.user)
          setSession(localSession)
          setLoading(false)
          return
        }

        // Solo verificar Supabase si no hay sesión local
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        
        if (supabaseSession?.user && isMounted) {
          // Buscar usuario local correspondiente
          const usuarios = await localAuth.getUsers()
          const localUser = usuarios.find(u => u.email === supabaseSession.user.email)
          
          if (localUser && isMounted) {
            const authUser: AuthUser = {
              id: localUser.id,
              email: localUser.email,
              nombre: localUser.nombre,
              apellido: localUser.apellido,
              rol: localUser.rol,
              obra_id: localUser.obra_id,
              activo: localUser.activo,
              supabaseId: supabaseSession.user.id
            }
            
            const session = {
              user: authUser,
              token: supabaseSession.access_token,
              expiresAt: Date.now() + (24 * 60 * 60 * 1000)
            }
            
            setUser(authUser)
            setSession(session)
            await localAuth.saveSupabaseSession(session)
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
    
    // Escuchar cambios de autenticación de Supabase (optimizado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      // Solo cerrar sesión si es un logout explícito, no por otros eventos
      if (event === 'SIGNED_OUT') {
        console.log('🔄 onAuthStateChange: SIGNED_OUT detectado')
        // NO llamar localAuth.signOut() aquí para evitar bucle infinito
        // Solo limpiar el estado local
        setUser(null)
        setSession(null)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // No hacer nada, mantener la sesión actual
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, []) // Dependencias vacías para ejecutar solo una vez

  const updateObraAsignada = useCallback(async (obraId: string | null): Promise<boolean> => {
    try {
      const success = await supabaseUsersService.syncCurrentUserObraAsignada(obraId)
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