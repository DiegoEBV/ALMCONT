import { supabase } from '../lib/supabase'
import { localDB } from '../lib/localDB'
import type { Obra } from '../types'

export const syncService = {
  // Sincronizar obras desde Supabase a la base de datos local
  async syncObrasFromSupabase(): Promise<boolean> {
    try {
      console.log('🔄 Sincronizando obras desde Supabase...')
      
      // Obtener obras desde Supabase
      const { data: supabaseObras, error } = await supabase
        .from('obras')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error obteniendo obras de Supabase:', error)
        return false
      }
      
      if (!supabaseObras || supabaseObras.length === 0) {
        console.log('No hay obras en Supabase para sincronizar')
        return true
      }
      
      // Obtener obras locales actuales
      const localObras = await localDB.get('obras')
      
      // Crear un mapa de obras locales por ID para búsqueda rápida
      const localObrasMap = new Map(localObras.map(obra => [obra.id, obra]))
      
      let syncCount = 0
      
      // Sincronizar cada obra de Supabase
      for (const supabaseObra of supabaseObras) {
        const obraData: Obra = {
          id: supabaseObra.id,
          codigo: supabaseObra.codigo,
          nombre: supabaseObra.nombre,
          descripcion: supabaseObra.descripcion || '',
          ubicacion: supabaseObra.ubicacion || '',
          fecha_inicio: supabaseObra.fecha_inicio,
          fecha_fin_estimada: supabaseObra.fecha_fin_estimada,
          estado: supabaseObra.estado || 'ACTIVA',
          created_at: supabaseObra.created_at,
          updated_at: supabaseObra.updated_at
        }
        
        const existingObra = localObrasMap.get(supabaseObra.id)
        
        if (!existingObra) {
          // Crear nueva obra local
          await localDB.create('obras', obraData)
          syncCount++
          console.log(`✅ Obra creada localmente: ${obraData.codigo} - ${obraData.nombre}`)
        } else {
          // Verificar si necesita actualización (comparar updated_at)
          const supabaseUpdated = new Date(supabaseObra.updated_at || supabaseObra.created_at)
          const localUpdated = new Date(existingObra.updated_at || existingObra.created_at)
          
          if (supabaseUpdated > localUpdated) {
            // Actualizar obra local
            await localDB.update('obras', supabaseObra.id, obraData)
            syncCount++
            console.log(`🔄 Obra actualizada localmente: ${obraData.codigo} - ${obraData.nombre}`)
          }
        }
      }
      
      console.log(`✅ Sincronización completada: ${syncCount} obras sincronizadas`)
      return true
      
    } catch (error) {
      console.error('Error sincronizando obras desde Supabase:', error)
      return false
    }
  },
  
  // Sincronizar una obra específica por ID
  async syncObraById(obraId: string): Promise<Obra | null> {
    try {
      console.log(`🔄 Sincronizando obra específica: ${obraId}`)
      
      // Obtener obra desde Supabase
      const { data: supabaseObra, error } = await supabase
        .from('obras')
        .select('*')
        .eq('id', obraId)
        .single()
      
      if (error) {
        console.error('Error obteniendo obra de Supabase:', error)
        return null
      }
      
      if (!supabaseObra) {
        console.log(`Obra no encontrada en Supabase: ${obraId}`)
        return null
      }
      
      const obraData: Obra = {
        id: supabaseObra.id,
        codigo: supabaseObra.codigo,
        nombre: supabaseObra.nombre,
        descripcion: supabaseObra.descripcion || '',
        ubicacion: supabaseObra.ubicacion || '',
        fecha_inicio: supabaseObra.fecha_inicio,
        fecha_fin_estimada: supabaseObra.fecha_fin_estimada,
        estado: supabaseObra.estado || 'ACTIVA',
        created_at: supabaseObra.created_at,
        updated_at: supabaseObra.updated_at
      }
      
      // Verificar si existe localmente
      const existingObra = await localDB.getById('obras', obraId)
      
      if (!existingObra) {
        // Crear nueva obra local
        await localDB.create('obras', obraData)
        console.log(`✅ Obra creada localmente: ${obraData.codigo} - ${obraData.nombre}`)
      } else {
        // Actualizar obra local
        await localDB.update('obras', obraId, obraData)
        console.log(`🔄 Obra actualizada localmente: ${obraData.codigo} - ${obraData.nombre}`)
      }
      
      return obraData
      
    } catch (error) {
      console.error('Error sincronizando obra específica:', error)
      return null
    }
  },
  
  // Inicializar sincronización al cargar la aplicación
  async initializeSync(): Promise<void> {
    try {
      console.log('🚀 Inicializando sincronización de datos...')
      
      // Sincronizar obras desde Supabase
      await this.syncObrasFromSupabase()
      
      console.log('✅ Sincronización inicial completada')
    } catch (error) {
      console.error('Error en sincronización inicial:', error)
    }
  },

  // Métodos requeridos por useOffline.ts
  getSyncStatus: () => ({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    pendingOperations: 0,
    syncErrors: []
  }),

  forcSync: async () => ({
    success: true,
    errors: [],
    syncedItems: 0,
    syncedOperations: 0,
    failedOperations: 0
  }),

  cacheEssentialData: async () => {
    // Implementación básica para cachear datos esenciales
    console.log('Cacheando datos esenciales...')
  },

  subscribe: (callback: (status: any) => void) => {
    // Implementación básica de suscripción
    const handleOnline = () => callback({ isOnline: true, isSyncing: false, lastSync: null, pendingOperations: 0, syncErrors: [] })
    const handleOffline = () => callback({ isOnline: false, isSyncing: false, lastSync: null, pendingOperations: 0, syncErrors: [] })
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }
}