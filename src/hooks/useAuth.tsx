import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import { localAuth } from '../services/localAuth'
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

      // Intentar autenticación con Supabase
      console.log('🔍 useAuth: Intentando autenticación con Supabase Auth...')
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        console.log('❌ useAuth: Error en Supabase Auth:', authError.message)
        console.log('🔄 useAuth: Intentando autenticación local...')
        
        // Si falla Supabase Auth, intentar autenticación local
        try {
          const authUser = await localAuth.signIn(email, password)
          console.log('✅ useAuth: Autenticación local exitosa:', authUser.email)
          
          const newSession = {
            user: authUser,
            token: 'local_token_' + Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
          }

          setUser(authUser)
          setSession(newSession)
          return
        } catch (localError) {
          console.error('❌ useAuth: Error en autenticación local:', localError)
          throw new Error('Invalid login credentials')
        }
      }

      if (!data.user) {
        console.log('❌ useAuth: No se recibieron datos de usuario de Supabase')
        throw new Error('No user data received')
      }

      console.log('✅ useAuth: Autenticación Supabase exitosa para:', data.user.email)

      // Buscar usuario local correspondiente
      console.log('🔍 useAuth: Buscando usuario local correspondiente...')
      const usuarios = await localAuth.getUsers()
      let localUser = usuarios.find(u => u.email === email && u.activo)

      if (!localUser) {
        console.log('❌ useAuth: Usuario local no encontrado o inactivo para:', email)
        console.log('📋 useAuth: Usuarios disponibles:', usuarios.map(u => ({ email: u.email, activo: u.activo })))
        console.log('🛠️ useAuth: Intentando crear usuario en Supabase y base local...')

        try {
          const obraUUID = await mapLocalIdToUUID('1', 'obra')
          const supUser = await supabaseUsersService.ensureUser(email, {
            email,
            nombre: email === 'residente@obra.com' ? 'Residente' : email.split('@')[0],
            apellido: email === 'residente@obra.com' ? 'Obra' : '',
            rol: email === 'residente@obra.com' ? 'RESIDENTE' : 'PRODUCCION',
            obra_id: obraUUID || null,
            activo: true
          })

          const createdLocal = await localDB.create('usuarios', {
            id: crypto.randomUUID(),
            email,
            password: 'password123',
            nombre: supUser?.nombre || (email.split('@')[0]),
            apellido: supUser?.apellido || '',
            rol: email === 'residente@obra.com' ? 'RESIDENTE' : 'PRODUCCION',
            activo: true,
            obra_id: obraUUID || '1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

          localUser = createdLocal
          console.log('✅ useAuth: Usuario creado y activado localmente:', localUser.email)
        } catch (seedError) {
          console.error('❌ useAuth: No se pudo crear usuario automáticamente:', seedError)
          throw new Error('Usuario no encontrado o inactivo')
        }
      }

      if (localUser.email.toLowerCase() === 'residente@obra.com' && localUser.rol !== 'RESIDENTE') {
        await localDB.update('usuarios', localUser.id, { rol: 'RESIDENTE' as any })
        localUser = { ...localUser, rol: 'RESIDENTE' as any }
      }
      console.log('✅ useAuth: Usuario local encontrado:', localUser.email, 'Rol:', localUser.rol)

      // Cargar información de la obra si está asignada
      let obra = null
      if (localUser.obra_id) {
        console.log('🏗️ useAuth: Cargando información de obra:', localUser.obra_id)
        obra = await loadObraInfo(localUser.obra_id)
        if (obra) {
          console.log('✅ useAuth: Obra cargada:', obra.nombre)
        } else {
          console.log('⚠️ useAuth: No se pudo cargar la obra')
        }
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
