import React, { useEffect, useState, useCallback } from 'react';
import { UpdatePrompt } from './UpdatePrompt';

interface AutoUpdateManagerProps {
  checkInterval?: number; // en milisegundos, por defecto 30 minutos
  autoUpdate?: boolean; // si debe actualizar automáticamente sin preguntar
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  onUpdateInstalled?: () => void;
  onUpdateError?: (error: Error) => void;
}

export const AutoUpdateManager: React.FC<AutoUpdateManagerProps> = ({
  checkInterval = 30 * 60 * 1000, // 30 minutos
  autoUpdate = false,
  onUpdateAvailable,
  onUpdateInstalled,
  onUpdateError
}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Verificar actualizaciones
  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      onUpdateError?.(error as Error);
    }
  }, [onUpdateError]);

  // Instalar actualización
  const installUpdate = useCallback(async () => {
    if (!waitingWorker) return;

    setIsUpdating(true);

    try {
      // Enviar mensaje al Service Worker para que se active
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Esperar a que el nuevo Service Worker tome control
      await new Promise<void>((resolve) => {
        const handleControllerChange = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          resolve();
        };
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      });

      setUpdateAvailable(false);
      setWaitingWorker(null);
      setIsUpdating(false);
      
      onUpdateInstalled?.();
      
      // Recargar la página para aplicar los cambios
      window.location.reload();
    } catch (error) {
      console.error('Error installing update:', error);
      setIsUpdating(false);
      onUpdateError?.(error as Error);
    }
  }, [waitingWorker, onUpdateInstalled, onUpdateError]);

  // Configurar listeners del Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const setupServiceWorkerListeners = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        setRegistration(registration);

        // Listener para nuevas actualizaciones
        const handleUpdateFound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          const handleStateChange = () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Hay una nueva versión disponible
                setUpdateAvailable(true);
                setWaitingWorker(newWorker);
                onUpdateAvailable?.(registration);

                if (autoUpdate) {
                  // Instalar automáticamente si está configurado
                  setTimeout(() => {
                    installUpdate();
                  }, 1000);
                }
              }
            }
          };

          newWorker.addEventListener('statechange', handleStateChange);
        };

        registration.addEventListener('updatefound', handleUpdateFound);

        // Verificar si ya hay un worker esperando
        if (registration.waiting) {
          setUpdateAvailable(true);
          setWaitingWorker(registration.waiting);
          onUpdateAvailable?.(registration);
        }

        // Verificar actualizaciones inmediatamente
        await checkForUpdates();

        return () => {
          registration.removeEventListener('updatefound', handleUpdateFound);
        };
      } catch (error) {
        console.error('Error setting up service worker listeners:', error);
        onUpdateError?.(error as Error);
      }
    };

    setupServiceWorkerListeners();
  }, [checkForUpdates, autoUpdate, installUpdate, onUpdateAvailable, onUpdateError]);

  // Configurar verificación periódica
  useEffect(() => {
    if (checkInterval <= 0) return;

    const interval = setInterval(checkForUpdates, checkInterval);
    return () => clearInterval(interval);
  }, [checkForUpdates, checkInterval]);

  // Listener para cuando la app vuelve a estar visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // La app volvió a estar visible, verificar actualizaciones
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkForUpdates]);

  // Listener para cuando la app vuelve a tener foco
  useEffect(() => {
    const handleFocus = () => {
      checkForUpdates();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkForUpdates]);

  // No mostrar nada si no hay actualización disponible o si está en modo automático
  if (!updateAvailable || autoUpdate) {
    return null;
  }

  return (
    <UpdatePrompt
      onUpdate={installUpdate}
      onDismiss={() => {
        setUpdateAvailable(false);
        setWaitingWorker(null);
      }}
    />
  );
};

// Hook para usar el auto-update manager
export const useAutoUpdate = (options: Omit<AutoUpdateManagerProps, 'children'> = {}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleUpdateAvailable = useCallback((registration: ServiceWorkerRegistration) => {
    setUpdateAvailable(true);
    options.onUpdateAvailable?.(registration);
  }, [options]);

  const handleUpdateInstalled = useCallback(() => {
    setUpdateAvailable(false);
    setIsUpdating(false);
    options.onUpdateInstalled?.();
  }, [options]);

  const handleUpdateError = useCallback((error: Error) => {
    setError(error);
    setIsUpdating(false);
    options.onUpdateError?.(error);
  }, [options]);

  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return true;
      }
      return false;
    } catch (error) {
      handleUpdateError(error as Error);
      return false;
    }
  }, [handleUpdateError]);

  const installUpdate = useCallback(async () => {
    setIsUpdating(true);
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        await new Promise<void>((resolve) => {
          const handleControllerChange = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        });

        handleUpdateInstalled();
        window.location.reload();
      }
    } catch (error) {
      handleUpdateError(error as Error);
    }
  }, [handleUpdateInstalled, handleUpdateError]);

  return {
    updateAvailable,
    isUpdating,
    error,
    checkForUpdates,
    installUpdate,
    AutoUpdateManager: (props: Partial<AutoUpdateManagerProps>) => (
      <AutoUpdateManager
        {...options}
        {...props}
        onUpdateAvailable={handleUpdateAvailable}
        onUpdateInstalled={handleUpdateInstalled}
        onUpdateError={handleUpdateError}
      />
    )
  };
};