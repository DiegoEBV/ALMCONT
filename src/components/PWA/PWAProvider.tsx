import React, { useEffect, useState } from 'react'
import { InstallBanner } from './InstallBanner'
import { PWAStatusIndicator } from './PWAStatusIndicator'
import { UpdatePrompt } from './UpdatePrompt'
import { SplashScreen } from './SplashScreen'
import { AutoUpdateManager } from './AutoUpdateManager'
import { usePWA } from '../../hooks/usePWA'
import { useNotifications } from '../../hooks/useNotifications'

interface PWAProviderProps {
  children: React.ReactNode
  showSplashScreen?: boolean
  splashDuration?: number
  enableAutoUpdate?: boolean
  showInstallBanner?: boolean
  showStatusIndicator?: boolean
}

export const PWAProvider: React.FC<PWAProviderProps> = ({
  children,
  showSplashScreen = true,
  splashDuration = 2000,
  enableAutoUpdate = true,
  showInstallBanner = true,
  showStatusIndicator = true
}) => {
  const [showSplash, setShowSplash] = useState(showSplashScreen)
  const [appReady, setAppReady] = useState(false)
  
  const { 
    isInstalled, 
    isOnline, 
    syncStatus,
    install,
    sync
  } = usePWA()
  
  const { 
    permission: notificationPermission,
    requestPermission: requestNotificationPermission
  } = useNotifications()

  useEffect(() => {
    // Inicializar PWA cuando la app esté lista
    const initializePWA = async () => {
      try {
        // Solicitar permisos de notificación si no están configurados
        if (notificationPermission === 'default') {
          await requestNotificationPermission()
        }

        // Sincronizar datos si está online
        if (isOnline && !syncStatus.syncing) {
          await sync()
        }

        setAppReady(true)
      } catch (error) {
        console.error('Error inicializando PWA:', error)
        setAppReady(true)
      }
    }

    if (!showSplash) {
      initializePWA()
    }
  }, [showSplash, isOnline, notificationPermission, requestNotificationPermission, sync, syncStatus.syncing])

  const handleSplashComplete = () => {
    setShowSplash(false)
  }

  // Mostrar splash screen si está habilitado
  if (showSplash) {
    return (
      <SplashScreen
        duration={splashDuration}
        onComplete={handleSplashComplete}
        showProgress={true}
      />
    )
  }

  // Mostrar loading si la app no está lista
  if (!appReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando aplicación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pwa-app">
      {/* Componentes PWA */}
      {enableAutoUpdate && <AutoUpdateManager />}
      
      {/* Banner de instalación - solo si no está instalado */}
      {showInstallBanner && !isInstalled && <InstallBanner />}
      
      {/* Indicador de estado PWA */}
      {showStatusIndicator && (
        <div className="fixed top-4 right-4 z-50">
          <PWAStatusIndicator 
            isOnline={isOnline}
            isInstalled={isInstalled}
            syncStatus={syncStatus}
            onSync={sync}
          />
        </div>
      )}

      {/* Contenido principal de la aplicación */}
      {children}
    </div>
  )
}

export default PWAProvider