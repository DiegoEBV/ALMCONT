// IndexedDB utility para almacenamiento offline
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Tipo para los nombres de las tiendas válidas
type ValidStoreName = 'usuarios' | 'obras' | 'materiales' | 'stock' | 'sync_queue' | 'app_settings';

// Definición del esquema de la base de datos
interface AlmacenDB extends DBSchema {
  stock: {
    key: string;
    value: {
      id: string;
      material_id: string;
      obra_id: string;
      cantidad: number;
      ubicacion: string;
      fecha_actualizacion: string;
      estado: 'activo' | 'inactivo';
      metadata?: any;
    };
    indexes: { 'by-material': string; 'by-obra': string; 'by-fecha': string };
  };
  materiales: {
    key: string;
    value: {
      id: string;
      nombre: string;
      descripcion: string;
      unidad: string;
      precio_unitario: number;
      categoria: string;
      codigo: string;
      fecha_creacion: string;
      metadata?: any;
    };
    indexes: { 'by-categoria': string; 'by-codigo': string };
  };
  obras: {
    key: string;
    value: {
      id: string;
      nombre: string;
      descripcion: string;
      ubicacion: string;
      fecha_inicio: string;
      fecha_fin?: string;
      estado: 'activa' | 'pausada' | 'finalizada';
      responsable: string;
      metadata?: any;
    };
    indexes: { 'by-estado': string; 'by-responsable': string };
  };
  usuarios: {
    key: string;
    value: {
      id: string;
      nombre: string;
      email: string;
      rol: string;
      activo: boolean;
      fecha_ultimo_acceso: string;
      metadata?: any;
    };
    indexes: { 'by-rol': string; 'by-email': string };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      table: string;
      action: 'create' | 'update' | 'delete';
      data: any;
      timestamp: number;
      retries: number;
      status: 'pending' | 'syncing' | 'failed';
    };
    indexes: { 'by-status': string; 'by-timestamp': number };
  };
  app_settings: {
    key: string;
    value: {
      key: string;
      value: any;
      timestamp: number;
    };
  };
}

class IndexedDBManager {
  private db: IDBPDatabase<AlmacenDB> | null = null;
  private readonly DB_NAME = 'AlmacenDB';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    try {
      this.db = await openDB<AlmacenDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Store para stock
          if (!db.objectStoreNames.contains('stock')) {
            const stockStore = db.createObjectStore('stock', { keyPath: 'id' });
            stockStore.createIndex('by-material', 'material_id');
            stockStore.createIndex('by-obra', 'obra_id');
            stockStore.createIndex('by-fecha', 'fecha_actualizacion');
          }

          // Store para materiales
          if (!db.objectStoreNames.contains('materiales')) {
            const materialesStore = db.createObjectStore('materiales', { keyPath: 'id' });
            materialesStore.createIndex('by-categoria', 'categoria');
            materialesStore.createIndex('by-codigo', 'codigo');
          }

          // Store para obras
          if (!db.objectStoreNames.contains('obras')) {
            const obrasStore = db.createObjectStore('obras', { keyPath: 'id' });
            obrasStore.createIndex('by-estado', 'estado');
            obrasStore.createIndex('by-responsable', 'responsable');
          }

          // Store para usuarios
          if (!db.objectStoreNames.contains('usuarios')) {
            const usuariosStore = db.createObjectStore('usuarios', { keyPath: 'id' });
            usuariosStore.createIndex('by-rol', 'rol');
            usuariosStore.createIndex('by-email', 'email');
          }

          // Store para cola de sincronización
          if (!db.objectStoreNames.contains('sync_queue')) {
            const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            syncStore.createIndex('by-status', 'status');
            syncStore.createIndex('by-timestamp', 'timestamp');
          }

          // Store para configuraciones de la app
          if (!db.objectStoreNames.contains('app_settings')) {
            db.createObjectStore('app_settings', { keyPath: 'key' });
          }
        },
      });
    } catch (error) {
      console.error('Error initializing IndexedDB:', error);
      throw error;
    }
  }

  private ensureDB(): IDBPDatabase<AlmacenDB> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // Métodos genéricos para CRUD
  async get<T extends ValidStoreName>(
    storeName: T,
    key: string
  ): Promise<AlmacenDB[T]['value'] | undefined> {
    const db = this.ensureDB();
    return await db.get(storeName, key);
  }

  async getAll<T extends ValidStoreName>(
    storeName: T
  ): Promise<AlmacenDB[T]['value'][]> {
    const db = this.ensureDB();
    return await db.getAll(storeName);
  }

  async put<T extends ValidStoreName>(
    storeName: T,
    data: AlmacenDB[T]['value']
  ): Promise<void> {
    const db = this.ensureDB();
    await db.put(storeName, data);
  }

  async delete<T extends ValidStoreName>(
    storeName: T,
    key: string
  ): Promise<void> {
    const db = this.ensureDB();
    await db.delete(storeName, key);
  }

  async clear<T extends ValidStoreName>(storeName: T): Promise<void> {
    const db = this.ensureDB();
    await db.clear(storeName);
  }

  // Métodos específicos para stock
  async getStockByMaterial(materialId: string) {
    const db = this.ensureDB();
    return await db.getAllFromIndex('stock', 'by-material', materialId);
  }

  async getStockByObra(obraId: string) {
    const db = this.ensureDB();
    return await db.getAllFromIndex('stock', 'by-obra', obraId);
  }

  // Métodos específicos para materiales
  async getMaterialesByCategoria(categoria: string) {
    const db = this.ensureDB();
    return await db.getAllFromIndex('materiales', 'by-categoria', categoria);
  }

  async getMaterialByCodigo(codigo: string) {
    const db = this.ensureDB();
    return await db.getFromIndex('materiales', 'by-codigo', codigo);
  }

  // Métodos específicos para obras
  async getObrasByEstado(estado: string) {
    const db = this.ensureDB();
    return await db.getAllFromIndex('obras', 'by-estado', estado);
  }

  async getObrasByResponsable(responsable: string) {
    const db = this.ensureDB();
    return await db.getAllFromIndex('obras', 'by-responsable', responsable);
  }

  // Métodos para cola de sincronización
  async addToSyncQueue(
    table: string,
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const syncItem = {
      id: `${table}_${action}_${Date.now()}_${Math.random()}`,
      table,
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending' as const,
    };

    await this.put('sync_queue', syncItem);
  }

  async getSyncQueue() {
    return await this.getAll('sync_queue');
  }

  async getPendingSyncItems() {
    const db = this.ensureDB();
    return await db.getAllFromIndex('sync_queue', 'by-status', 'pending');
  }

  async updateSyncItemStatus(id: string, status: 'pending' | 'syncing' | 'failed') {
    const item = await this.get('sync_queue', id);
    if (item) {
      item.status = status;
      if (status === 'failed') {
        item.retries += 1;
      }
      await this.put('sync_queue', item);
    }
  }

  async removeSyncItem(id: string) {
    await this.delete('sync_queue', id);
  }

  // Métodos para configuraciones
  async getSetting(key: string): Promise<any> {
    const setting = await this.get('app_settings', key);
    return setting?.value;
  }

  async setSetting(key: string, value: any): Promise<void> {
    await this.put('app_settings', {
      key,
      value,
      timestamp: Date.now(),
    });
  }

  // Métodos de utilidad
  async getDBSize(): Promise<{ [storeName: string]: number }> {
    const db = this.ensureDB();
    const storeNames = Array.from(db.objectStoreNames);
    const sizes: { [storeName: string]: number } = {};

    for (const storeName of storeNames) {
      const count = await db.count(storeName as ValidStoreName);
      sizes[storeName] = count;
    }

    return sizes;
  }

  async exportData(): Promise<{ [storeName: string]: any[] }> {
    const db = this.ensureDB();
    const storeNames = Array.from(db.objectStoreNames);
    const data: { [storeName: string]: any[] } = {};

    for (const storeName of storeNames) {
      if (storeName !== 'sync_queue') {
        data[storeName] = await db.getAll(storeName as ValidStoreName);
      }
    }

    return data;
  }

  async importData(data: { [storeName: string]: any[] }): Promise<void> {
    const db = this.ensureDB();
    const validStoreNames = Object.keys(data).filter(name => 
      ['usuarios', 'obras', 'materiales', 'stock', 'sync_queue', 'app_settings'].includes(name)
    ) as ValidStoreName[];
    
    const tx = db.transaction(validStoreNames, 'readwrite');

    for (const [storeName, items] of Object.entries(data)) {
      if (['usuarios', 'obras', 'materiales', 'stock', 'sync_queue', 'app_settings'].includes(storeName)) {
        const store = tx.objectStore(storeName as ValidStoreName);
        await store.clear();
        for (const item of items) {
          await store.put(item);
        }
      }
    }

    await tx.done;
  }

  async clearAllData(): Promise<void> {
    const db = this.ensureDB();
    const storeNames = Array.from(db.objectStoreNames).filter(name => 
      ['usuarios', 'obras', 'materiales', 'stock', 'sync_queue', 'app_settings'].includes(name)
    );

    for (const storeName of storeNames) {
      await db.clear(storeName as ValidStoreName);
    }
  }
}

// Instancia singleton
export const indexedDBManager = new IndexedDBManager();

// Inicializar automáticamente
indexedDBManager.init().catch(console.error);

export default indexedDBManager;