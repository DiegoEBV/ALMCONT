import { offlineService, OfflineOperation } from './offlineService';
import { stockService } from './stock';
import { materialesService } from './materiales';
import { obrasService } from './obras';
import { entradasService } from './entradas';
import { salidasService } from './salidas';
import { requerimientosService } from './requerimientos';
import { solicitudesCompraService } from './solicitudesCompra';
import { ordenesCompraService } from './ordenesCompra';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number | null;
  pendingOperations: number;
  syncErrors: string[];
}

export interface SyncResult {
  success: boolean;
  syncedOperations: number;
  failedOperations: number;
  errors: string[];
}

class SyncService {
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    pendingOperations: 0,
    syncErrors: []
  };

  private listeners: ((status: SyncStatus) => void)[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Escuchar cambios de conexión
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Verificar estado inicial
    this.updateConnectionStatus();

    // Iniciar sincronización automática
    this.startAutoSync();

    // Limpiar datos expirados periódicamente
    setInterval(() => {
      offlineService.cleanExpiredData();
    }, 60000); // Cada minuto
  }

  private handleOnline() {
    console.log('Conexión restaurada');
    this.updateConnectionStatus();
    this.syncPendingOperations();
  }

  private handleOffline() {
    console.log('Conexión perdida');
    this.updateConnectionStatus();
  }

  private async updateConnectionStatus() {
    const wasOnline = this.syncStatus.isOnline;
    this.syncStatus.isOnline = navigator.onLine;

    // Actualizar contador de operaciones pendientes
    try {
      const pendingOps = await offlineService.getPendingOperations();
      this.syncStatus.pendingOperations = pendingOps.length;
    } catch (error) {
      console.error('Error al obtener operaciones pendientes:', error);
    }

    // Si se recuperó la conexión, intentar sincronizar
    if (!wasOnline && this.syncStatus.isOnline) {
      setTimeout(() => this.syncPendingOperations(), 1000);
    }

    this.notifyListeners();
  }

  private startAutoSync() {
    // Sincronizar cada 30 segundos si hay conexión
    this.syncInterval = setInterval(() => {
      if (this.syncStatus.isOnline && !this.syncStatus.isSyncing) {
        this.syncPendingOperations();
      }
    }, 30000);
  }

  // Sincronizar operaciones pendientes
  async syncPendingOperations(): Promise<SyncResult> {
    if (this.syncStatus.isSyncing || !this.syncStatus.isOnline) {
      return {
        success: false,
        syncedOperations: 0,
        failedOperations: 0,
        errors: ['Sincronización ya en progreso o sin conexión']
      };
    }

    this.syncStatus.isSyncing = true;
    this.syncStatus.syncErrors = [];
    this.notifyListeners();

    try {
      const pendingOperations = await offlineService.getPendingOperations();
      console.log(`Sincronizando ${pendingOperations.length} operaciones pendientes`);

      let syncedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Procesar operaciones en orden cronológico
      const sortedOperations = pendingOperations.sort((a, b) => a.timestamp - b.timestamp);

      for (const operation of sortedOperations) {
        try {
          await this.syncOperation(operation);
          await offlineService.markOperationSynced(operation.id);
          syncedCount++;
          console.log(`Operación ${operation.id} sincronizada exitosamente`);
        } catch (error) {
          failedCount++;
          const errorMsg = `Error sincronizando ${operation.type} en ${operation.table}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Limpiar operaciones sincronizadas
      if (syncedCount > 0) {
        await offlineService.clearSyncedOperations();
      }

      // Actualizar estado
      this.syncStatus.lastSync = Date.now();
      this.syncStatus.syncErrors = errors;
      await this.updateConnectionStatus();

      const result: SyncResult = {
        success: failedCount === 0,
        syncedOperations: syncedCount,
        failedOperations: failedCount,
        errors
      };

      console.log('Sincronización completada:', result);
      return result;

    } catch (error) {
      console.error('Error durante la sincronización:', error);
      this.syncStatus.syncErrors = [`Error general de sincronización: ${error}`];
      return {
        success: false,
        syncedOperations: 0,
        failedOperations: 0,
        errors: [String(error)]
      };
    } finally {
      this.syncStatus.isSyncing = false;
      this.notifyListeners();
    }
  }

  private async syncOperation(operation: OfflineOperation): Promise<void> {
    const { type, table, data } = operation;

    switch (table) {
      case 'entradas':
        if (type === 'CREATE') {
          await entradasService.create(data);
        } else if (type === 'UPDATE') {
          await entradasService.update(data.id, data);
        }
        break;

      case 'salidas':
        if (type === 'CREATE') {
          await salidasService.create(data);
        } else if (type === 'UPDATE') {
          await salidasService.update(data.id, data);
        }
        break;

      case 'requerimientos':
        if (type === 'CREATE') {
          await requerimientosService.create(data);
        } else if (type === 'UPDATE') {
          await requerimientosService.update(data.id, data);
        }
        break;

      case 'solicitudes_compra':
        if (type === 'CREATE') {
          await solicitudesCompraService.create(data);
        } else if (type === 'UPDATE') {
          await solicitudesCompraService.update(data.id, data);
        }
        break;

      case 'ordenes_compra':
        if (type === 'CREATE') {
          await ordenesCompraService.create(data);
        } else if (type === 'UPDATE') {
          await ordenesCompraService.update(data.id, data);
        }
        break;

      case 'materiales':
        if (type === 'CREATE') {
          await materialesService.create(data);
        } else if (type === 'UPDATE') {
          await materialesService.update(data.id, data);
        }
        break;

      case 'obras':
        if (type === 'CREATE') {
          await obrasService.create(data);
        } else if (type === 'UPDATE') {
          await obrasService.update(data.id, data);
        }
        break;

      default:
        throw new Error(`Tabla no soportada para sincronización: ${table}`);
    }
  }

  // Forzar sincronización manual
  async forcSync(): Promise<SyncResult> {
    console.log('Forzando sincronización manual');
    return this.syncPendingOperations();
  }

  // Obtener estado de sincronización
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Suscribirse a cambios de estado
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Retornar función para desuscribirse
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.getSyncStatus());
      } catch (error) {
        console.error('Error notificando listener de sync:', error);
      }
    });
  }

  // Programar reintento de sincronización
  scheduleRetry(delayMs: number = 60000) {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(() => {
      if (this.syncStatus.isOnline && this.syncStatus.pendingOperations > 0) {
        this.syncPendingOperations();
      }
    }, delayMs);
  }

  // Limpiar recursos
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    this.listeners = [];
  }

  // Cachear datos críticos para uso offline
  async cacheEssentialData(): Promise<void> {
    if (!this.syncStatus.isOnline) {
      console.log('Sin conexión, no se pueden cachear datos');
      return;
    }

    try {
      console.log('Cacheando datos esenciales...');

      // Cachear stock actual
      const stock = await stockService.getAll();
      await offlineService.cacheData('stock', stock, 60); // 1 hora

      // Cachear materiales
      const materiales = await materialesService.getAll();
      await offlineService.cacheData('materiales', materiales, 120); // 2 horas

      // Cachear obras activas
      const obras = await obrasService.getAll();
      await offlineService.cacheData('obras', obras, 120); // 2 horas

      console.log('Datos esenciales cacheados exitosamente');
    } catch (error) {
      console.error('Error cacheando datos esenciales:', error);
    }
  }
}

// Instancia singleton
export const syncService = new SyncService();

// Cachear datos esenciales al inicializar
syncService.cacheEssentialData();