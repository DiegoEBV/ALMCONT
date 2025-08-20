import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../ui/LoadingSpinner'

const Layout: React.FC = () => {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Efecto para limpiar estados al cambiar de ruta
  useEffect(() => {
    // Forzar scroll al top y limpiar estados residuales al cambiar de ruta
    window.scrollTo(0, 0)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null // Redirect handled by ProtectedRoute
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Key prop fuerza re-mount del componente al cambiar de ruta */}
          <div key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout