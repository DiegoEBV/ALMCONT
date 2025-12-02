import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Componente que redirige automáticamente a los usuarios a sus dashboards específicos
 * según su rol cuando acceden a la ruta principal "/"
 */
const RoleBasedDashboard: React.FC = () => {
  const { user, loading } = useAuth()

  // Mostrar loading mientras se carga la información del usuario
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Redirigir según el rol del usuario
  // Normalizar rol por email especial
  const isResidenteEmail = String(user.email).toLowerCase() === 'residente@obra.com'
  const effectiveRole = isResidenteEmail ? 'RESIDENTE' : user.rol

  switch (effectiveRole) {
    case 'PENDIENTE':
      return (
        <React.Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        }>
          {React.createElement(React.lazy(() => import('../pages/Dashboard')))}
        </React.Suspense>
      )
    case 'ADMIN':
      return <Navigate to="/oficina/dashboard" replace />
    case 'COORDINACION':
      return <Navigate to="/oficina/dashboard" replace />
    
    case 'LOGISTICA':
      return <Navigate to="/logistica/dashboard" replace />
    
    case 'ALMACENERO':
      return <Navigate to="/almacen/dashboard" replace />
    
    case 'PRODUCCION':
      return <Navigate to="/produccion/dashboard" replace />
    case 'RESIDENTE':
      return <Navigate to="/residente/dashboard" replace />
    
    default:
      // Para roles desconocidos o como fallback, mantener el dashboard general
      return (
        <React.Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        }>
          {React.createElement(React.lazy(() => import('../pages/Dashboard')))}
        </React.Suspense>
      )
      
  }
}

export default RoleBasedDashboard
