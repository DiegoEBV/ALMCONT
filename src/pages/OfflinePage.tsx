import React from 'react'
import { WifiOff, RefreshCw, Database, Clock } from 'lucide-react'
import { useOffline } from '../hooks/useOffline'
import { usePWA } from '../hooks/usePWA'

const OfflinePage: React.FC = () => {
  const { 
    isOnline, 
    storageStats, 
    forceSync,
    syncStatus 
  } = useOffline()
  
  const { 
    sync: pwaSync,
    syncStatus: pwaSyncStatus 
  } = usePWA()

  const handleRetry = async () => {
    if (isOnline) {
      await forceSync()
      await pwaSync()
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Icono de estado */}
        <div className="mb-6">
          {isOnline ? (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-green-600" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <WifiOff className="w-8 h-8 text-red-600" />
            </div>
          )}
        </div>

        {/* Título y descripción */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isOnline ? 'Reconectando...' : 'Sin conexión'}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {isOnline 
            ? 'Se ha restablecido la conexión. Sincronizando datos...'
            : 'No hay conexión a internet. Puedes seguir trabajando con los datos almacenados localmente.'
          }
        </p>

        {/* Información de datos offline */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center mb-3">
            <Database className="w-5 h-5 text-blue-600 mr-2" />
            <span className="font-medium text-gray-900">Datos disponibles offline</span>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Almacenamiento usado:</span>
              <span className="font-medium">
                {storageStats ? `${storageStats.cachedItems} elementos` : 'Calculando...'}
              </span>
            </div>
            
            {syncStatus.lastSync && (
              <div className="flex justify-between items-center">
                <span>Última sincronización:</span>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="font-medium">
                    {new Date(syncStatus.lastSync).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            
            {syncStatus.pendingOperations > 0 && (
              <div className="flex justify-between">
                <span>Operaciones pendientes:</span>
                <span className="font-medium text-orange-600">
                  {syncStatus.pendingOperations}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Estado de sincronización */}
        {(syncStatus.isSyncing || pwaSyncStatus.syncing) && (
          <div className="mb-6">
            <div className="flex items-center justify-center mb-2">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mr-2" />
              <span className="text-blue-600 font-medium">Sincronizando...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="space-y-3">
          {isOnline && (
            <button
              onClick={handleRetry}
              disabled={syncStatus.isSyncing || pwaSyncStatus.syncing}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncStatus.isSyncing || pwaSyncStatus.syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Recargar aplicación
          </button>
        </div>

        {/* Consejos para modo offline */}
        {!isOnline && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Modo offline activo</h3>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>• Puedes consultar datos previamente cargados</li>
              <li>• Los cambios se guardarán localmente</li>
              <li>• Se sincronizarán automáticamente al reconectar</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default OfflinePage