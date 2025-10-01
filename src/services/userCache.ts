import type { AuthUser } from '../types'

interface CacheEntry {
  data: AuthUser
  timestamp: number
  expiresAt: number
}

class UserCacheService {
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  // Obtener usuario del caché
  get(userId: string): AuthUser | null {
    const entry = this.cache.get(userId)
    
    if (!entry) {
      return null
    }

    // Verificar si el caché ha expirado
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(userId)
      return null
    }

    return entry.data
  }

  // Guardar usuario en el caché
  set(userId: string, userData: AuthUser): void {
    const entry: CacheEntry = {
      data: userData,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_DURATION
    }
    
    this.cache.set(userId, entry)
  }

  // Invalidar entrada específica del caché
  invalidate(userId: string): void {
    this.cache.delete(userId)
  }

  // Limpiar todo el caché
  clear(): void {
    this.cache.clear()
  }

  // Limpiar entradas expiradas
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  // Obtener estadísticas del caché
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        userId: key,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        isExpired: Date.now() > entry.expiresAt
      }))
    }
  }
}

// Instancia singleton del servicio de caché
export const userCache = new UserCacheService()

// Limpiar caché automáticamente cada 10 minutos
setInterval(() => {
  userCache.cleanup()
}, 10 * 60 * 1000)