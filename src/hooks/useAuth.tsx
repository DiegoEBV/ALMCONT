import React, { createContext, useContext, useState, useEffect } from 'react'
import { localAuth } from '../services/localAuth'
import { supabaseUsersService } from '../services/supabaseUsers'
import { syncService } from '../services/syncService'
import { supabase } from '../lib/supabase'
import type { AuthUser, AuthContextType } from '../types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = async () => {
    try {
      const userData = await localAuth.refreshUser()
      
      // Si hay un usuario, sincronizar datos desde Supabase
      if (userData) {
        const supabaseUserData = await supabaseUsersService.getUserData(userData.id)
        if (supabaseUserData && supabaseUserData.obra_id !== userData.obra_id) {
          // Actualizar obra local si es diferente en Supabase
          await localAuth.updateObraAsignada(supabaseUserData.obra_id)
          // Refrescar datos después de la actualización
          const updatedUserData = await localAuth.refreshUser()
          setUser(updatedUserData)
        } else {
          // Si no hay diferencias pero el usuario no tiene información de obra cargada,
          // intentar cargarla si tiene obra_id
          if (userData.obra_id && !userData.obra) {
            const refreshedUserData = await localAuth.refreshUser()
            setUser(refreshedUserData)
          } else {
            setUser(userData)
          }
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    await fetchUserData()
  }

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      // Primero autenticar con Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError || !authData.user) {
        throw new Error('Credenciales inválidas')
      }

      // Buscar el usuario en la tabla local para obtener datos adicionales
      const usuarios = await localAuth.getUsers()
      const localUser = usuarios.find(u => u.email === email)
      
      if (!localUser) {
        throw new Error('Usuario no encontrado en base de datos local')
      }

      // Crear sesión local con datos combinados
      const authUser: AuthUser = {
        id: localUser.id,
        email: localUser.email,
        nombre: localUser.nombre,
        apellido: localUser.apellido,
        rol: localUser.rol,
        obra_id: localUser.obra_id,
        activo: localUser.activo,
        supabaseId: authData.user.id // Agregar ID de Supabase
      }

      const session = {
        user: authUser,
        token: authData.session?.access_token || '',
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      }

      setUser(authUser)
      setSession(session)
      
      // Guardar sesión localmente
      await localAuth.saveSupabaseSession(session)
      
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      // Cerrar sesión en Supabase
      await supabase.auth.signOut()
      
      // Cerrar sesión local
      await localAuth.signOut()
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true)
        
        // Verificar sesión de Supabase primero
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        
        if (supabaseSession?.user) {
          // Buscar usuario local correspondiente
          const usuarios = await localAuth.getUsers()
          const localUser = usuarios.find(u => u.email === supabaseSession.user.email)
          
          if (localUser) {
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
        } else {
          // Verificar sesión local como fallback
          const localSession = localAuth.getSession()
          if (localSession) {
            setUser(localSession.user)
            setSession(localSession)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
    
    // Escuchar cambios de autenticación de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        setSession(null)
        await localAuth.signOut()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const updateObraAsignada = async (obraId: string | null): Promise<boolean> => {
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
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut,
    refreshUser,
    updateObraAsignada
  }

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