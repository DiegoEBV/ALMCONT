// Utilidad para sincronización offline
import { indexedDBManager } from './indexedDB';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

class OfflineSyncManager {
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private syncCallbacks: ((result: SyncResult) => void)[] = [];

  constructor() {
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Network connection restored');
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Network connection lost');
    });
  }

  private startPeriodicSync() {
    // Intentar sincronizar cada 5 minutos si hay conexión
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingChanges();
      }
    }, 5 * 60 * 1000);
  }

  async syncPendingChanges(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      const pendingItems = await indexedDBManager.getPendingSyncItems();
      console.log(`Starting sync of ${pendingItems.length} pending items`);

      for (const item of pendingItems) {
        try {
          await indexedDBManager.updateSyncItemStatus(item.id, 'syncing');
          
          const success = await this.syncItem(item);
          
          if (success) {
            await indexedDBManager.removeSyncItem(item.id);
            result.synced++;
          } else {
            await indexedDBManager.updateSyncItemStatus(item.id, 'failed');
            result.failed++;
            result.errors.push(`Failed to sync ${item.table} ${item.action}`);
          }
        } catch (error) {
          await indexedDBManager.updateSyncItemStatus(item.id, 'failed');
          result.failed++;
          result.errors.push(`Error syncing ${item.table}: ${error}`);
        }
      }

      result.success = result.failed === 0;
      console.log('Sync completed:', result);

    } catch (error) {
      result.success = false;
      result.errors.push(`Sync process failed: ${error}`);
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
      this.notifySyncCallbacks(result);
    }

    return result;
  }

  private async syncItem(item: any): Promise<boolean> {
    try {
      const url = this.getApiUrl(item.table, item.action, item.data);
      const options = this.getRequestOptions(item.action, item.data);

      const response = await fetch(url, options);
      
      if (!response.ok) {
        console.error(`API request failed: ${response.status} ${response.statusText}`);
        return false;
      }

      // Si es una creación o actualización exitosa, actualizar el dato local con la respuesta del servidor
      if (item.action === 'create' || item.action === 'update') {
        const serverData = await response.json();
        await indexedDBManager.put(item.table, { ...item.data, ...serverData });
      }

      return true;
    } catch (error) {
      console.error('Error syncing item:', error);
      return false;
    }
  }

  private getApiUrl(table: string, action: string, data: any): string {
    const baseUrl = '/api';
    
    switch (table) {
      case 'stock':
        return action === 'delete' 
          ? `${baseUrl}/stock/${data.id}`
          : `${baseUrl}/stock`;
      
      case 'materiales':
        return action === 'delete'
          ? `${baseUrl}/materiales/${data.id}`
          : `${baseUrl}/materiales`;
      
      case 'obras':
        return action === 'delete'
          ? `${baseUrl}/obras/${data.id}`
          : `${baseUrl}/obras`;
      
      case 'usuarios':
        return action === 'delete'
          ? `${baseUrl}/usuarios/${data.id}`
          : `${baseUrl}/usuarios`;
      
      default:
        throw new Error(`Unknown table: ${table}`);
    }
  }

  private getRequestOptions(action: string, data: any): RequestInit {
    const options: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    switch (action) {
      case 'create':
        options.method = 'POST';
        options.body = JSON.stringify(data);
        break;
      
      case 'update':
        options.method = 'PUT';
        options.body = JSON.stringify(data);
        break;
      
      case 'delete':
        options.method = 'DELETE';
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return options;
  }

  // Métodos para operaciones offline
  async createOffline(table: string, data: any): Promise<void> {
    // Generar ID temporal si no existe
    if (!data.id) {
      data.id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Validar que la tabla sea válida
    const validTables = ['usuarios', 'obras', 'materiales', 'stock', 'sync_queue', 'app_settings'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    // Guardar en IndexedDB
    await indexedDBManager.put(table as any, data);

    // Agregar a la cola de sincronización
    await indexedDBManager.addToSyncQueue(table, 'create', data);

    console.log(`Created ${table} offline:`, data.id);
  }

  async updateOffline(table: string, data: any): Promise<void> {
    // Validar que la tabla sea válida
    const validTables = ['usuarios', 'obras', 'materiales', 'stock', 'sync_queue', 'app_settings'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    // Actualizar en IndexedDB
    await indexedDBManager.put(table as any, data);

    // Agregar a la cola de sincronización
    await indexedDBManager.addToSyncQueue(table, 'update', data);

    console.log(`Updated ${table} offline:`, data.id);
  }

  async deleteOffline(table: string, id: string): Promise<void> {
    // Validar que la tabla sea válida
    const validTables = ['usuarios', 'obras', 'materiales', 'stock', 'sync_queue', 'app_settings'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    // Eliminar de IndexedDB
    await indexedDBManager.delete(table as any, id);

    // Agregar a la cola de sincronización
    await indexedDBManager.addToSyncQueue(table, 'delete', { id });

    console.log(`Deleted ${table} offline:`, id);
  }

  // Métodos para obtener datos (con fallback offline)
  async getData(table: string, useCache = false): Promise<any[]> {
    // Validar que la tabla sea válida
    const validTables = ['usuarios', 'obras', 'materiales', 'stock', 'sync_queue', 'app_settings'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    if (this.isOnline && !useCache) {
      try {
        const response = await fetch(`/api/${table}`);
        if (response.ok) {
          const data = await response.json();
          
          // Actualizar caché local
          await indexedDBManager.clear(table as any);
          for (const item of data) {
            await indexedDBManager.put(table as any, item);
          }
          
          return data;
        }
      } catch (error) {
        console.log(`Failed to fetch ${table} from server, using cache:`, error);
      }
    }

    // Usar datos del caché local
    return await indexedDBManager.getAll(table as any);
  }

  async getDataById(table: string, id: string, useCache = false): Promise<any | null> {
    // Validar que la tabla sea válida
    const validTables = ['usuarios', 'obras', 'materiales', 'stock', 'sync_queue', 'app_settings'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    if (this.isOnline && !useCache) {
      try {
        const response = await fetch(`/api/${table}/${id}`);
        if (response.ok) {
          const data = await response.json();
          
          // Actualizar caché local
          await indexedDBManager.put(table as any, data);
          
          return data;
        }
      } catch (error) {
        console.log(`Failed to fetch ${table}/${id} from server, using cache:`, error);
      }
    }

    // Usar datos del caché local
    return await indexedDBManager.get(table as any, id);
  }

  // Callbacks para notificaciones de sincronización
  onSyncComplete(callback: (result: SyncResult) => void) {
    this.syncCallbacks.push(callback);
  }

  private notifySyncCallbacks(result: SyncResult) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in sync callback:', error);
      }
    });
  }

  // Getters
  get online(): boolean {
    return this.isOnline;
  }

  get syncing(): boolean {
    return this.syncInProgress;
  }

  async getPendingCount(): Promise<number> {
    const pending = await indexedDBManager.getPendingSyncItems();
    return pending.length;
  }

  async getSyncStatus() {
    const pending = await indexedDBManager.getPendingSyncItems();
    const failed = pending.filter(item => item.status === 'failed');
    
    return {
      online: this.isOnline,
      syncing: this.syncInProgress,
      pendingCount: pending.length,
      failedCount: failed.length,
      lastSync: await indexedDBManager.getSetting('lastSyncTime')
    };
  }

  // Forzar sincronización manual
  async forcSync(): Promise<SyncResult> {
    if (!this.isOnline) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: ['No network connection available']
      };
    }

    return await this.syncPendingChanges();
  }
}

// Instancia singleton
export const offlineSyncManager = new OfflineSyncManager();

export default offlineSyncManager;