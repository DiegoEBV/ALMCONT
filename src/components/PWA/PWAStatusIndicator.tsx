import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface PWAStatusIndicatorProps {
  isOnline: boolean;
  isInstalled: boolean;
  syncStatus: {
    syncing: boolean;
    pendingCount: number;
    failedCount: number;
    lastSync?: number;
  };
  onSync?: () => void;
  className?: string;
}

export const PWAStatusIndicator: React.FC<PWAStatusIndicatorProps> = ({
  isOnline,
  isInstalled,
  syncStatus,
  onSync,
  className = ''
}) => {
  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (syncStatus.syncing) return 'text-blue-500';
    if (syncStatus.failedCount > 0) return 'text-yellow-500';
    if (syncStatus.pendingCount > 0) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (syncStatus.syncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (syncStatus.failedCount > 0) return <AlertCircle className="w-4 h-4" />;
    if (syncStatus.pendingCount > 0) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Sin conexión';
    if (syncStatus.syncing) return 'Sincronizando...';
    if (syncStatus.failedCount > 0) return `${syncStatus.failedCount} errores`;
    if (syncStatus.pendingCount > 0) return `${syncStatus.pendingCount} pendientes`;
    return 'Sincronizado';
  };

  

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Indicador de conexión */}
      <div className="flex items-center space-x-1">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
      </div>

      {/* Indicador de estado PWA */}
      {isInstalled && (
        <div className="w-2 h-2 bg-blue-500 rounded-full" title="PWA Instalada" />
      )}

      {/* Estado de sincronización */}
      <div className="flex items-center space-x-1">
        <span className={getStatusColor()}>
          {getStatusIcon()}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {getStatusText()}
        </span>
      </div>

      {/* Botón de sincronización manual */}
      {isOnline && !syncStatus.syncing && (syncStatus.pendingCount > 0 || syncStatus.failedCount > 0) && (
        <button
          onClick={onSync}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          title="Sincronizar ahora"
        >
          Sincronizar
        </button>
      )}

      
    </div>
  );
};

// Componente compacto para la barra de estado
export const CompactPWAStatus: React.FC<{
  isOnline: boolean;
  syncStatus: PWAStatusIndicatorProps['syncStatus'];
}> = ({ isOnline, syncStatus }) => {
  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (syncStatus.syncing) return 'bg-blue-500';
    if (syncStatus.failedCount > 0) return 'bg-yellow-500';
    if (syncStatus.pendingCount > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getTooltipText = () => {
    if (!isOnline) return 'Sin conexión a internet';
    if (syncStatus.syncing) return 'Sincronizando datos...';
    if (syncStatus.failedCount > 0) return `${syncStatus.failedCount} elementos fallaron al sincronizar`;
    if (syncStatus.pendingCount > 0) return `${syncStatus.pendingCount} elementos pendientes de sincronizar`;
    return 'Todos los datos están sincronizados';
  };

  return (
    <div
      className={`w-3 h-3 rounded-full ${getStatusColor()} ${
        syncStatus.syncing ? 'animate-pulse' : ''
      }`}
      title={getTooltipText()}
    />
  );
};