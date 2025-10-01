import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import { localAuth } from '../services/localAuth'
import { supabaseUsersService } from '../services/supabaseUsers'
import { supabase } from '../lib/supabase'
import { obrasService } from '../services/obras'
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
      const obra = await obrasService.getById(obraId)
      return obra
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

      // Cargar información de la obra si está asignada
      let obra = null
      if (localUser.obra_id) {
        obra = await loadObraInfo(localUser.obra_id)
      }

      const authUser: AuthUser = {
        id: localUser.id,
        email: localUser.email,
        nombre: localUser.nombre,
        apellido: localUser.apellido,
        rol: localUser.rol,
        obra_id: localUser.obra_id,
        activo: localUser.activo,
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
        // Cargar información de la obra si está asignada
        let obra = null
        if (refreshedUser.obra_id) {
          obra = await loadObraInfo(refreshedUser.obra_id)
        }

        const updatedUser = {
          ...refreshedUser,
          obra: obra
        }

        setUser(updatedUser)
        if (session) {
          setSession(prev => prev ? { ...prev, user: updatedUser } : null)
        }
        return updatedUser
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
            // Cargar información de la obra si está asignada
            let obra = null
            if (localUser.obra_id) {
              obra = await loadObraInfo(localUser.obra_id)
            }

            const authUser: AuthUser = {
              id: localUser.id,
              email: localUser.email,
              nombre: localUser.nombre,
              apellido: localUser.apellido,
              rol: localUser.rol,
              obra_id: localUser.obra_id,
              activo: localUser.activo,
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

    return () => {
      isMounted = false
    }
  }, [])

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