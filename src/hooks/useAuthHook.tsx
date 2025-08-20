import { useContext } from 'react'
import { AuthContext } from './useAuth'
import { AuthContextType } from '../types'

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}