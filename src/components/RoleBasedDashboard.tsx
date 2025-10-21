import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Componente que redirige automáticamente a los usuarios a sus dashboards específicos
 * según su rol cuando acceden a la ruta principal "/"
 */
const RoleBasedDashboard: React.FC = () => {
  const { user, loading } = useAuth()

  useEffect(() => {
    console.log('🔄 RoleBasedDashboard: Usuario actual:', user?.email, 'Rol:', user?.rol)
    console.log('🔄 RoleBasedDashboard: Loading:', loading)
    console.log('🔄 RoleBasedDashboard: User object:', user)
  }, [user, loading])

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
    console.log('❌ RoleBasedDashboard: No hay usuario, redirigiendo a login')
    return <Navigate to="/login" replace />
  }

  // Redirigir según el rol del usuario
  console.log('🎯 RoleBasedDashboard: Redirigiendo usuario', user.email, 'con rol', user.rol)
  console.log('🎯 RoleBasedDashboard: Tipo de rol:', typeof user.rol)
  console.log('🎯 RoleBasedDashboard: Comparación LOGISTICA:', user.rol === 'LOGISTICA')
  
  switch (user.rol) {
    case 'COORDINACION':
      console.log('➡️ RoleBasedDashboard: Redirigiendo coordinador a /oficina/dashboard')
      return <Navigate to="/oficina/dashboard" replace />
    
    case 'LOGISTICA':
      console.log('➡️ RoleBasedDashboard: Redirigiendo logística a /logistica/dashboard')
      return <Navigate to="/logistica/dashboard" replace />
    
    case 'ALMACENERO':
      console.log('➡️ RoleBasedDashboard: Redirigiendo almacenero a /almacen/dashboard')
      return <Navigate to="/almacen/dashboard" replace />
    
    case 'PRODUCCION':
      console.log('➡️ RoleBasedDashboard: Redirigiendo producción a /produccion/dashboard')
      return <Navigate to="/produccion/dashboard" replace />
    
    default:
      { console.log('⚠️ RoleBasedDashboard: Rol desconocido, manteniendo en dashboard general')
      // Para roles desconocidos o como fallback, mantener el dashboard general
      const Dashboard = React.lazy(() => import('../pages/Dashboard'))
      return (
        <React.Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        }>
          <Dashboard />
        </React.Suspense>
      ) }
  }
}

export default RoleBasedDashboard