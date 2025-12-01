import type { Material } from '../types'

interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
}

class CacheService {
  private dbName = 'AlmacenCache'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Store para materiales
        if (!db.objectStoreNames.contains('materiales')) {
          const materialesStore = db.createObjectStore('materiales', { keyPath: 'key' })
          materialesStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store para queries paginadas
        if (!db.objectStoreNames.contains('queries')) {
          const queriesStore = db.createObjectStore('queries', { keyPath: 'key' })
          queriesStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store para categorías
        if (!db.objectStoreNames.contains('categorias')) {
          const categoriasStore = db.createObjectStore('categorias', { keyPath: 'key' })
          categoriasStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    return this.db!
  }

  private generateQueryKey(query: unknown): string {
    return `query_${JSON.stringify(query)}`
  }

  async cacheMateriales(key: string, data: Material[], ttlMinutes: number = 30): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['materiales'], 'readwrite')
    const store = transaction.objectStore('materiales')

    const cacheItem: CacheItem<Material[]> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (ttlMinutes * 60 * 1000)
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key, ...cacheItem })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getCachedMateriales(key: string): Promise<Material[] | null> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['materiales'], 'readonly')
    const store = transaction.objectStore('materiales')

    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => {
        const result = request.result
        if (!result) {
          resolve(null)
          return
        }

        // Verificar si el cache ha expirado
        if (Date.now() > result.expiry) {
          // Eliminar cache expirado
          this.deleteCachedMateriales(key)
          resolve(null)
          return
        }

        resolve(result.data)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async cacheQuery(query: unknown, data: unknown, ttlMinutes: number = 15): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['queries'], 'readwrite')
    const store = transaction.objectStore('queries')

    const key = this.generateQueryKey(query)
    const cacheItem: CacheItem<unknown> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (ttlMinutes * 60 * 1000)
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key, ...cacheItem })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getCachedQuery(query: unknown): Promise<unknown | null> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['queries'], 'readonly')
    const store = transaction.objectStore('queries')

    const key = this.generateQueryKey(query)

    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => {
        const result = request.result
        if (!result) {
          resolve(null)
          return
        }

        // Verificar si el cache ha expirado
        if (Date.now() > result.expiry) {
          // Eliminar cache expirado
          this.deleteCachedQuery(key)
          resolve(null)
          return
        }

        resolve(result.data)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async cacheCategorias(categorias: string[], ttlMinutes: number = 60): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['categorias'], 'readwrite')
    const store = transaction.objectStore('categorias')

    const cacheItem: CacheItem<string[]> = {
      data: categorias,
      timestamp: Date.now(),
      expiry: Date.now() + (ttlMinutes * 60 * 1000)
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key: 'categorias', ...cacheItem })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getCachedCategorias(): Promise<string[] | null> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['categorias'], 'readonly')
    const store = transaction.objectStore('categorias')

    return new Promise((resolve, reject) => {
      const request = store.get('categorias')
      request.onsuccess = () => {
        const result = request.result
        if (!result) {
          resolve(null)
          return
        }

        // Verificar si el cache ha expirado
        if (Date.now() > result.expiry) {
          resolve(null)
          return
        }

        resolve(result.data)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async deleteCachedMateriales(key: string): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['materiales'], 'readwrite')
    const store = transaction.objectStore('materiales')

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteCachedQuery(key: string): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['queries'], 'readwrite')
    const store = transaction.objectStore('queries')

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clearExpiredCache(): Promise<void> {
    const db = await this.ensureDB()
    const now = Date.now()

    // Limpiar materiales expirados
    const materialesTransaction = db.transaction(['materiales'], 'readwrite')
    const materialesStore = materialesTransaction.objectStore('materiales')
    const materialesIndex = materialesStore.index('timestamp')

    materialesIndex.openCursor().onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        if (cursor.value.expiry < now) {
          cursor.delete()
        }
        cursor.continue()
      }
    }

    // Limpiar queries expiradas
    const queriesTransaction = db.transaction(['queries'], 'readwrite')
    const queriesStore = queriesTransaction.objectStore('queries')
    const queriesIndex = queriesStore.index('timestamp')

    queriesIndex.openCursor().onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        if (cursor.value.expiry < now) {
          cursor.delete()
        }
        cursor.continue()
      }
    }
  }

  async clearAllCache(): Promise<void> {
    const db = await this.ensureDB()
    
    const transaction = db.transaction(['materiales', 'queries', 'categorias'], 'readwrite')
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('materiales').clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('queries').clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('categorias').clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    ])
  }

  // Invalidar cache cuando se crean, actualizan o eliminan materiales
  async invalidateMaterialesCache(): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['materiales', 'queries'], 'readwrite')
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('materiales').clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('queries').clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    ])
  }
}

export const cacheService = new CacheService()