// Servicio para manejo de datos offline
export interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  userId?: string;
  synced: boolean;
}

export interface CachedData {
  data: any;
  timestamp: number;
  expiry?: number;
}

class OfflineService {
  private dbName = 'AlmacenOfflineDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  // Inicializar IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para operaciones pendientes
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const operationsStore = db.createObjectStore('pendingOperations', {
            keyPath: 'id'
          });
          operationsStore.createIndex('timestamp', 'timestamp');
          operationsStore.createIndex('synced', 'synced');
        }

        // Store para datos cacheados
        if (!db.objectStoreNames.contains('cachedData')) {
          const cacheStore = db.createObjectStore('cachedData', {
            keyPath: 'key'
          });
          cacheStore.createIndex('timestamp', 'timestamp');
        }

        // Store para fotos offline
        if (!db.objectStoreNames.contains('offlinePhotos')) {
          const photosStore = db.createObjectStore('offlinePhotos', {
            keyPath: 'id'
          });
          photosStore.createIndex('movementId', 'movementId');
          photosStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  // Verificar si hay conexión
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Guardar operación pendiente
  async savePendingOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'synced'>): Promise<string> {
    if (!this.db) await this.init();

    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullOperation: OfflineOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const request = store.add(fullOperation);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener operaciones pendientes
  async getPendingOperations(): Promise<OfflineOperation[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readonly');
      const store = transaction.objectStore('pendingOperations');
      const index = store.index('synced');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Marcar operación como sincronizada
  async markOperationSynced(operationId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const getRequest = store.get(operationId);

      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.synced = true;
          const updateRequest = store.put(operation);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Limpiar operaciones sincronizadas
  async clearSyncedOperations(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const index = store.index('synced');
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Cachear datos
  async cacheData(key: string, data: any, expiryMinutes?: number): Promise<void> {
    if (!this.db) await this.init();

    const cachedData: CachedData & { key: string } = {
      key,
      data,
      timestamp: Date.now(),
      expiry: expiryMinutes ? Date.now() + (expiryMinutes * 60 * 1000) : undefined
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      const request = store.put(cachedData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener datos cacheados
  async getCachedData(key: string): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readonly');
      const store = transaction.objectStore('cachedData');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Verificar expiración
        if (result.expiry && Date.now() > result.expiry) {
          // Eliminar datos expirados
          this.deleteCachedData(key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Eliminar datos cacheados
  async deleteCachedData(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Guardar foto offline
  async saveOfflinePhoto(movementId: string, photoBlob: Blob, metadata: any): Promise<string> {
    if (!this.db) await this.init();

    const id = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const photoData = {
      id,
      movementId,
      blob: photoBlob,
      metadata,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlinePhotos'], 'readwrite');
      const store = transaction.objectStore('offlinePhotos');
      const request = store.add(photoData);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // Guardar foto offline con objeto completo
  async saveOfflinePhotoObject(photoData: any): Promise<string> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlinePhotos'], 'readwrite');
      const store = transaction.objectStore('offlinePhotos');
      const request = store.add(photoData);

      request.onsuccess = () => resolve(photoData.id);
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener fotos offline por movimiento
  async getOfflinePhotos(movementId?: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlinePhotos'], 'readonly');
      const store = transaction.objectStore('offlinePhotos');
      
      if (movementId) {
        const index = store.index('movementId');
        const request = index.getAll(movementId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  // Eliminar foto offline
  async deleteOfflinePhoto(photoId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlinePhotos'], 'readwrite');
      const store = transaction.objectStore('offlinePhotos');
      const request = store.delete(photoId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Limpiar datos expirados
  async cleanExpiredData(): Promise<void> {
    if (!this.db) await this.init();

    const now = Date.now();
    const transaction = this.db.transaction(['cachedData'], 'readwrite');
    const store = transaction.objectStore('cachedData');
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const data = cursor.value;
        if (data.expiry && now > data.expiry) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }

  // Obtener estadísticas de almacenamiento
  async getStorageStats(): Promise<{
    pendingOperations: number;
    cachedItems: number;
    offlinePhotos: number;
  }> {
    if (!this.db) await this.init();

    const stats = {
      pendingOperations: 0,
      cachedItems: 0,
      offlinePhotos: 0
    };

    // Contar operaciones pendientes
    const pendingOps = await this.getPendingOperations();
    stats.pendingOperations = pendingOps.length;

    // Contar elementos cacheados
    await new Promise<void>((resolve) => {
      const transaction = this.db!.transaction(['cachedData'], 'readonly');
      const store = transaction.objectStore('cachedData');
      const request = store.count();
      request.onsuccess = () => {
        stats.cachedItems = request.result;
        resolve();
      };
    });

    // Contar fotos offline
    await new Promise<void>((resolve) => {
      const transaction = this.db!.transaction(['offlinePhotos'], 'readonly');
      const store = transaction.objectStore('offlinePhotos');
      const request = store.count();
      request.onsuccess = () => {
        stats.offlinePhotos = request.result;
        resolve();
      };
    });

    return stats;
  }
}

// Instancia singleton
export const offlineService = new OfflineService();

// Inicializar automáticamente
offlineService.init().catch(console.error);