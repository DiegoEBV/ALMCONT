import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useOffline } from '../hooks/useOffline';
import { toast } from 'sonner';

interface ConnectionIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  showDetails = false,
  className = ''
}) => {
  const {
    isOnline,
    isSyncing,
    pendingOperations,
    lastSync,
    syncErrors,
    forceSync,
    storageStats
  } = useOffline();

  const handleForceSync = async () => {
    if (!isOnline) {
      toast.error('Sin conexión a internet');
      return;
    }

    if (isSyncing) {
      toast.info('Sincronización ya en progreso');
      return;
    }

    try {
      const result = await forceSync();
      if (result.success) {
        toast.success(`Sincronización exitosa: ${result.syncedOperations} operaciones`);
      } else {
        toast.error(`Errores en sincronización: ${result.failedOperations} operaciones fallaron`);
      }
    } catch (error) {
      toast.error('Error durante la sincronización');
    }
  };

  const formatLastSync = (date: Date | null): string => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Hace un momento';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays}d`;
  };

  if (!showDetails) {
    // Indicador simple
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isOnline ? (
          <div className="flex items-center gap-1 text-green-600">
            <Wifi className="h-4 w-4" />
            <span className="text-xs font-medium">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-600">
            <WifiOff className="h-4 w-4" />
            <span className="text-xs font-medium">Offline</span>
          </div>
        )}
        
        {pendingOperations > 0 && (
          <div className="flex items-center gap-1 text-amber-600">
            <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-xs">{pendingOperations}</span>
          </div>
        )}
        
        {isSyncing && (
          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
        )}
      </div>
    );
  }

  // Indicador detallado
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Estado de Conexión</h3>
        
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1 text-green-600">
              <Wifi className="h-5 w-5" />
              <span className="font-medium">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Estado de sincronización */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Última sincronización:</span>
          <span className="font-medium">{formatLastSync(lastSync)}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Operaciones pendientes:</span>
          <div className="flex items-center gap-1">
            {pendingOperations > 0 ? (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-amber-600">{pendingOperations}</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-600">0</span>
              </>
            )}
          </div>
        </div>
        
        {isSyncing && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Sincronizando...</span>
          </div>
        )}
      </div>

      {/* Errores de sincronización */}
      {syncErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-800">
              Errores de sincronización ({syncErrors.length})
            </span>
          </div>
          <div className="text-xs text-red-700 space-y-1">
            {syncErrors.slice(0, 3).map((error, index) => (
              <div key={index} className="truncate">{error}</div>
            ))}
            {syncErrors.length > 3 && (
              <div className="text-red-600">... y {syncErrors.length - 3} más</div>
            )}
          </div>
        </div>
      )}

      {/* Estadísticas de almacenamiento */}
      {storageStats && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Almacenamiento Local</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium text-gray-900">{storageStats.cachedItems}</div>
              <div className="text-gray-600">Datos en caché</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{storageStats.pendingOperations}</div>
              <div className="text-gray-600">Operaciones</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{storageStats.offlinePhotos}</div>
              <div className="text-gray-600">Fotos</div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-2">
        <button
          onClick={handleForceSync}
          disabled={!isOnline || isSyncing}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      {/* Modo offline */}
      {!isOnline && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <WifiOff className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Modo Offline</span>
          </div>
          <p className="text-xs text-amber-700">
            Puedes seguir trabajando. Los cambios se sincronizarán automáticamente cuando se restaure la conexión.
          </p>
        </div>
      )}
    </div>
  );
};

// Componente para la barra de estado global
export const GlobalConnectionStatus: React.FC = () => {
  const { isOffline, pendingOperations, showOfflineMessage } = useOffline();

  if (!isOffline && !showOfflineMessage) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>
          Trabajando offline
          {pendingOperations > 0 && ` • ${pendingOperations} operaciones pendientes`}
        </span>
      </div>
    </div>
  );
};