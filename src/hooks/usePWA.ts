import { useState, useEffect, useCallback } from 'react';
import { offlineSyncManager } from '../utils/offlineSync';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  isStandalone: boolean;
  syncStatus: {
    syncing: boolean;
    pendingCount: number;
    failedCount: number;
    lastSync?: number;
  };
}

interface PWAActions {
  install: () => Promise<boolean>;
  sync: () => Promise<void>;
  clearCache: () => Promise<void>;
  exportData: () => Promise<any>;
  importData: (data: any) => Promise<void>;
}

export const usePWA = (): PWAState & PWAActions => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [syncStatus, setSyncStatus] = useState({
    syncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSync: undefined as number | undefined
  });

  // Verificar si la app está instalada
  const checkInstallStatus = useCallback(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const installed = isStandaloneMode || isInWebAppiOS;
    
    setIsInstalled(installed);
    setIsStandalone(installed);
  }, []);

  // Actualizar estado de sincronización
  const updateSyncStatus = useCallback(async () => {
    try {
      const status = await offlineSyncManager.getSyncStatus();
      setSyncStatus({
        syncing: status.syncing,
        pendingCount: status.pendingCount,
        failedCount: status.failedCount,
        lastSync: status.lastSync
      });
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }, []);

  useEffect(() => {
    checkInstallStatus();
    updateSyncStatus();

    // Escuchar cambios en el estado de conexión
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Escuchar evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    // Escuchar cuando se instala la app
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Escuchar cambios en el display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => checkInstallStatus();
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Configurar callback de sincronización
    offlineSyncManager.onSyncComplete(() => {
      updateSyncStatus();
    });

    // Actualizar estado de sincronización periódicamente
    const syncInterval = setInterval(updateSyncStatus, 30000); // cada 30 segundos

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
      clearInterval(syncInterval);
    };
  }, [checkInstallStatus, updateSyncStatus]);

  // Instalar la PWA
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('No install prompt available');
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setDeferredPrompt(null);
        setIsInstallable(false);
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error during installation:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Sincronizar datos
  const sync = useCallback(async (): Promise<void> => {
    try {
      await offlineSyncManager.forcSync();
      await updateSyncStatus();
    } catch (error) {
      console.error('Error during sync:', error);
      throw error;
    }
  }, [updateSyncStatus]);

  // Limpiar caché
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      // Limpiar caché del Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        
        return new Promise((resolve, reject) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.success) {
              resolve();
            } else {
              reject(new Error('Failed to clear cache'));
            }
          };

          navigator.serviceWorker.controller!.postMessage(
            { type: 'CLEAR_CACHE' },
            [messageChannel.port2]
          );
        });
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }, []);

  // Exportar datos
  const exportData = useCallback(async (): Promise<any> => {
    try {
      const { indexedDBManager } = await import('../utils/indexedDB');
      return await indexedDBManager.exportData();
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }, []);

  // Importar datos
  const importData = useCallback(async (data: any): Promise<void> => {
    try {
      const { indexedDBManager } = await import('../utils/indexedDB');
      await indexedDBManager.importData(data);
      await updateSyncStatus();
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }, [updateSyncStatus]);

  return {
    // Estado
    isInstalled,
    isInstallable,
    isOnline,
    isStandalone,
    syncStatus,
    
    // Acciones
    install,
    sync,
    clearCache,
    exportData,
    importData
  };
};