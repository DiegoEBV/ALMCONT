import React, { createContext, useEffect, useState } from 'react'
import { localAuth, AuthUser, AuthSession } from '../services/localAuth'
import { AuthContextType } from '../types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = async () => {
    try {
      const userData = await localAuth.refreshUser()
      setUser(userData)
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
      const result = await localAuth.signIn(email, password)
      if (!result) {
        throw new Error('Credenciales inválidas')
      }

      setUser(result.user)
      setSession(result.session)
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await localAuth.signOut()
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  useEffect(() => {
    // Verificar sesión inicial
    const currentSession = localAuth.getSession()
    if (currentSession) {
      setSession(currentSession)
      setUser(currentSession.user)
      // Cargar datos actualizados del usuario
      fetchUserData()
    } else {
      setLoading(false)
    }
  }, [])

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut,
    refreshUser
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