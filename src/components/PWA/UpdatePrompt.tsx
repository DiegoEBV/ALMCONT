import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Download } from 'lucide-react';

interface UpdatePromptProps {
  onUpdate?: () => void;
  onDismiss?: () => void;
}

export const UpdatePrompt: React.FC<UpdatePromptProps> = ({
  onUpdate,
  onDismiss
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Escuchar mensajes del Service Worker sobre actualizaciones
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
        setShowPrompt(true);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // Enviar mensaje al Service Worker para actualizar
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SKIP_WAITING'
        });
      }

      // Esperar un momento y recargar la página
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      onUpdate?.();
    } catch (error) {
      console.error('Error updating app:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Actualización Disponible
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Nueva versión de ALMACÉN lista para instalar
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            disabled={isUpdating}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-3 flex space-x-2">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                <span>Actualizar</span>
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isUpdating}
            className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 disabled:opacity-50"
          >
            Después
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar el progreso de actualización
export const UpdateProgress: React.FC<{
  progress?: number;
  message?: string;
}> = ({ progress = 0, message = 'Actualizando aplicación...' }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Actualizando ALMACÉN
          </h3>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {message}
          </p>
          
          {progress > 0 && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
          
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Por favor, no cierres la aplicación
          </p>
        </div>
      </div>
    </div>
  );
};