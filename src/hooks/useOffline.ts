import { useState, useEffect, useCallback } from 'react';
import { syncService } from '../services/syncService';
import { offlineService } from '../services/offlineService';
import { offlineSyncManager } from '../utils/offlineSync';
import { indexedDBManager } from '../utils/indexedDB';

// Definir tipos localmente ya que no están exportados desde syncService
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number | null;
  pendingOperations: number;
  syncErrors: string[];
}

export interface SyncResult {
  success: boolean;
  errors: string[];
  syncedItems: number;
  syncedOperations?: number;
  failedOperations?: number;
}

export interface OfflineHookReturn {
  // Estado de conexión
  isOnline: boolean;
  isOffline: boolean;
  
  // Estado de sincronización
  isSyncing: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  syncErrors: string[];
  syncStatus: SyncStatus;
  
  // Funciones
  forceSync: () => Promise<SyncResult>;
  cacheEssentialData: () => Promise<void>;
  
  // Estadísticas
  storageStats: {
    pendingOperations: number;
    cachedItems: number;
    offlinePhotos: number;
  } | null;
  
  // Funciones de utilidad
  canPerformAction: (requiresOnline?: boolean) => boolean;
  showOfflineMessage: boolean;
  
  // Nuevas funciones PWA
  exportOfflineData: () => Promise<any>;
  importOfflineData: (data: any) => Promise<void>;
  clearOfflineData: () => Promise<void>;
  getOfflineDataSize: () => Promise<number>;
  syncWithPWA: () => Promise<void>;
}

export const useOffline = (): OfflineHookReturn => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus());
  const [storageStats, setStorageStats] = useState<{
    pendingOperations: number;
    cachedItems: number;
    offlinePhotos: number;
  } | null>(null);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  // Actualizar estadísticas de almacenamiento
  const updateStorageStats = useCallback(async () => {
    try {
      const stats = await offlineService.getStorageStats();
      // También obtener estadísticas de IndexedDB
      const dbSize = await indexedDBManager.getDBSize();
      const syncQueue = await indexedDBManager.getSyncQueue();
      
      setStorageStats({
        ...stats,
        pendingOperations: syncQueue.length,
        cachedItems: stats.cachedItems + dbSize.totalRecords
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas de almacenamiento:', error);
    }
  }, []);

  // Forzar sincronización mejorada con PWA
  const forceSync = useCallback(async (): Promise<SyncResult> => {
    try {
      // Usar el nuevo sistema de sincronización PWA
      await offlineSyncManager.forcSync();
      const result = await syncService.forcSync();
      await updateStorageStats();
      return result;
    } catch (error) {
      console.error('Error en sincronización forzada:', error);
      return {
        success: false,
        syncedItems: 0,
        syncedOperations: 0,
        failedOperations: 0,
        errors: [String(error)]
      };
    }
  }, [updateStorageStats]);

  // Cachear datos esenciales
  const cacheEssentialData = useCallback(async (): Promise<void> => {
    try {
      await syncService.cacheEssentialData();
      await updateStorageStats();
    } catch (error) {
      console.error('Error cacheando datos esenciales:', error);
      throw error;
    }
  }, [updateStorageStats]);

  // Verificar si se puede realizar una acción
  const canPerformAction = useCallback((requiresOnline: boolean = false): boolean => {
    if (requiresOnline) {
      return syncStatus.isOnline;
    }
    return true; // Las acciones offline siempre están disponibles
  }, [syncStatus.isOnline]);

  useEffect(() => {
    // Suscribirse a cambios de estado de sincronización
    const unsubscribe = syncService.subscribe((status: SyncStatus) => {
      setSyncStatus(status);
      
      // Mostrar mensaje offline si se perdió la conexión
      if (!status.isOnline && syncStatus.isOnline) {
        setShowOfflineMessage(true);
        setTimeout(() => setShowOfflineMessage(false), 5000);
      }
    });

    // Actualizar estadísticas iniciales
    updateStorageStats();

    // Actualizar estadísticas periódicamente
    const statsInterval = setInterval(updateStorageStats, 30000); // Cada 30 segundos

    return () => {
      unsubscribe();
      clearInterval(statsInterval);
    };
  }, [updateStorageStats, syncStatus.isOnline]);

  // Nuevas funciones PWA
  const exportOfflineData = useCallback(async (): Promise<any> => {
    try {
      return await indexedDBManager.exportData();
    } catch (error) {
      console.error('Error exportando datos offline:', error);
      throw error;
    }
  }, []);

  const importOfflineData = useCallback(async (data: any): Promise<void> => {
    try {
      await indexedDBManager.importData(data);
      await updateStorageStats();
    } catch (error) {
      console.error('Error importando datos offline:', error);
      throw error;
    }
  }, [updateStorageStats]);

  const clearOfflineData = useCallback(async (): Promise<void> => {
    try {
      await indexedDBManager.clearAllData();
      await updateStorageStats();
    } catch (error) {
      console.error('Error limpiando datos offline:', error);
      throw error;
    }
  }, [updateStorageStats]);

  const getOfflineDataSize = useCallback(async (): Promise<number> => {
    try {
      const dbSize = await indexedDBManager.getDBSize();
      return Object.values(dbSize).reduce((total, count) => total + count, 0);
    } catch (error) {
      console.error('Error obteniendo tamaño de datos offline:', error);
      return 0;
    }
  }, []);

  const syncWithPWA = useCallback(async (): Promise<void> => {
    try {
      await offlineSyncManager.syncPendingChanges();
      await updateStorageStats();
    } catch (error) {
      console.error('Error sincronizando con PWA:', error);
      throw error;
    }
  }, [updateStorageStats]);

  return {
    // Estado de conexión
    isOnline: syncStatus.isOnline,
    isOffline: !syncStatus.isOnline,
    
    // Estado de sincronización
    isSyncing: syncStatus.isSyncing,
    lastSync: syncStatus.lastSync ? new Date(syncStatus.lastSync) : null,
    pendingOperations: syncStatus.pendingOperations,
    syncErrors: syncStatus.syncErrors,
    syncStatus,
    
    // Funciones
    forceSync,
    cacheEssentialData,
    
    // Estadísticas
    storageStats,
    
    // Funciones de utilidad
    canPerformAction,
    showOfflineMessage,
    
    // Nuevas funciones PWA
    exportOfflineData,
    importOfflineData,
    clearOfflineData,
    getOfflineDataSize,
    syncWithPWA
  };
};

// Hook para operaciones offline específicas
export const useOfflineOperations = () => {
  const { isOnline } = useOffline();

  // Guardar operación para sincronización posterior
  const saveOfflineOperation = useCallback(async (
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    table: string,
    data: any,
    userId?: string
  ): Promise<string> => {
    try {
      const operationId = await offlineService.savePendingOperation({
        type,
        table,
        data,
        userId
      });
      
      console.log(`Operación ${type} guardada offline para tabla ${table}:`, operationId);
      return operationId;
    } catch (error) {
      console.error('Error guardando operación offline:', error);
      throw error;
    }
  }, []);

  // Obtener datos cacheados
  const getCachedData = useCallback(async (key: string): Promise<any | null> => {
    try {
      return await offlineService.getCachedData(key);
    } catch (error) {
      console.error('Error obteniendo datos cacheados:', error);
      return null;
    }
  }, []);

  // Cachear datos
  const cacheData = useCallback(async (
    key: string,
    data: any,
    expiryMinutes?: number
  ): Promise<void> => {
    try {
      await offlineService.cacheData(key, data, expiryMinutes);
    } catch (error) {
      console.error('Error cacheando datos:', error);
      throw error;
    }
  }, []);

  // Guardar foto offline
  const saveOfflinePhoto = useCallback(async (
    movementId: string,
    photoBlob: Blob,
    metadata: any
  ): Promise<string> => {
    try {
      return await offlineService.saveOfflinePhoto(movementId, photoBlob, metadata);
    } catch (error) {
      console.error('Error guardando foto offline:', error);
      throw error;
    }
  }, []);

  // Obtener fotos offline
  const getOfflinePhotos = useCallback(async (movementId: string): Promise<any[]> => {
    try {
      return await offlineService.getOfflinePhotos(movementId);
    } catch (error) {
      console.error('Error obteniendo fotos offline:', error);
      return [];
    }
  }, []);

  return {
    isOnline,
    saveOfflineOperation,
    getCachedData,
    cacheData,
    saveOfflinePhoto,
    getOfflinePhotos
  };
};

// Hook para mostrar notificaciones de estado offline
export const useOfflineNotifications = () => {
  const { isOffline, pendingOperations, syncErrors } = useOffline();
  const [notifications, setNotifications] = useState<{
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }[]>([]);

  useEffect(() => {
    // Notificación cuando se va offline
    if (isOffline) {
      const notification = {
        id: `offline-${Date.now()}`,
        type: 'warning' as const,
        message: 'Sin conexión a internet. Trabajando en modo offline.',
        timestamp: Date.now()
      };
      setNotifications(prev => [...prev, notification]);
    }
  }, [isOffline]);

  useEffect(() => {
    // Notificación de operaciones pendientes
    if (pendingOperations > 0) {
      const notification = {
        id: `pending-${Date.now()}`,
        type: 'info' as const,
        message: `${pendingOperations} operaciones pendientes de sincronización.`,
        timestamp: Date.now()
      };
      setNotifications(prev => {
        // Reemplazar notificación anterior de operaciones pendientes
        const filtered = prev.filter(n => !n.id.startsWith('pending-'));
        return [...filtered, notification];
      });
    }
  }, [pendingOperations]);

  useEffect(() => {
    // Notificaciones de errores de sincronización
    if (syncErrors.length > 0) {
      const notification = {
        id: `sync-error-${Date.now()}`,
        type: 'error' as const,
        message: `Errores de sincronización: ${syncErrors.length} operaciones fallaron.`,
        timestamp: Date.now()
      };
      setNotifications(prev => [...prev, notification]);
    }
  }, [syncErrors]);

  // Limpiar notificaciones automáticamente
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNotifications(prev => 
        prev.filter(notification => now - notification.timestamp < 10000) // 10 segundos
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    dismissNotification
  };
};