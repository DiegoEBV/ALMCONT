import { Usuario, Obra, Material, Requerimiento, SolicitudCompra, RqSc, Entrada, Salida, StockObraMaterial, OrdenCompra, ScOc } from '../types'
import database from '../data/database.json'

interface LocalDBConfig {
  storageKey: string
  version: string
}

interface RelationConfig {
  table: string
  key: string
}

// Interfaz base para todos los registros de la base de datos
export interface BaseRecord {
  id: string
  created_at: string
  updated_at: string
}

// Tipo union para todos los tipos de datos que puede manejar la base de datos
type DatabaseRecord = Usuario | Obra | Material | Requerimiento | SolicitudCompra | Entrada | Salida | StockObraMaterial | RqSc | OrdenCompra | ScOc

// Tipo para las tablas de la base de datos
type DatabaseTable = {
  usuarios: Usuario[]
  obras: Obra[]
  materiales: Material[]
  requerimientos: Requerimiento[]
  solicitudes_compra: SolicitudCompra[]
  entradas: Entrada[]
  salidas: Salida[]
  stock_obra_material: StockObraMaterial[]
  rq_sc: RqSc[]
  ordenes_compra: OrdenCompra[]
  sc_oc: ScOc[]
}

class LocalDatabase {
  private config: LocalDBConfig
  private data: Partial<DatabaseTable> = {}
  private initialized: boolean = false
  private initPromise: Promise<void> | null = null

  constructor(config: LocalDBConfig) {
    this.config = config
    this.initPromise = this.initializeAsync()
  }

  private async initializeAsync(): Promise<void> {
    if (this.initialized) return
    await this.loadData()
    this.initialized = true
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && this.initPromise) {
      await this.initPromise
    }
  }

  private async loadData(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (stored) {
        this.data = JSON.parse(stored)
      } else {
        await this.loadFromDatabaseFile()
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error)
      await this.loadFromDatabaseFile()
    }
  }

  private async loadFromDatabaseFile(): Promise<void> {
    try {
      // Cargar datos directamente desde la importación
      this.data = { ...database } as unknown as Partial<DatabaseTable>
      this.saveData() // Guardar en localStorage para futuras cargas
      console.log('✅ Datos cargados desde database.json')
    } catch (error) {
      console.error('Error cargando desde database.json:', error)
      console.log('Usando datos por defecto')
      this.initializeData()
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.data))
    } catch (error) {
      console.error('Error saving data to localStorage:', error)
    }
  }

  private initializeData(): void {
    this.data = {
      usuarios: [
        {
          id: '1',
          email: 'coordinador@obra.com',
          password: '123456',
          nombre: 'Coordinador',
          apellido: 'Principal',
          rol: 'ALMACENERO',
          activo: true,
          obra_id: '1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          email: 'logistica@obra.com',
          password: '123456',
          nombre: 'Logística',
          apellido: 'Principal',
          rol: 'COORDINACION',
          activo: true,
          obra_id: '1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          email: 'almacenero@obra.com',
          password: '123456',
          nombre: 'Almacenero',
          apellido: 'Principal',
          rol: 'LOGISTICA',
          activo: true,
          obra_id: '1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      obras: [
        {
          id: '1',
          nombre: 'Obra Principal',
          codigo: 'OP-001',
          ubicacion: 'Lima, Perú',
          estado: 'ACTIVA',
          fecha_inicio: '2024-01-01',
          responsable: 'Coordinador Principal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      materiales: [
        {
          id: '1',
          codigo: 'MAT-001',
          nombre: 'Cemento Portland',
          descripcion: 'Cemento Portland tipo I',
          unidad: 'BOLSA',
          categoria: 'CONSTRUCCION',
          precio_unitario: 25.50,
           activo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          codigo: 'MAT-002',
          nombre: 'Fierro 1/2"',
          descripcion: 'Fierro corrugado de 1/2 pulgada',
          unidad: 'VARILLA',
          categoria: 'CONSTRUCCION',
          precio_unitario: 35.00,
          activo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      requerimientos: [],
      salidas: [],
      entradas: [],
      stock_obra_material: [],
      solicitudes_compra: [],
      rq_sc: [],
      ordenes_compra: [],
      sc_oc: []
    }
    this.saveData()
  }

  async get<T extends keyof DatabaseTable>(table: T): Promise<DatabaseTable[T]> {
    await this.ensureInitialized()
    return (this.data[table] || []) as DatabaseTable[T]
  }

  async getById<T extends keyof DatabaseTable>(table: T, id: string): Promise<DatabaseTable[T][0] | null> {
    await this.ensureInitialized()
    const items = this.data[table] || []
    return items.find(item => item.id === id) || null
  }

  async getWhere<T extends keyof DatabaseTable>(table: T, condition: (item: DatabaseTable[T][0]) => boolean): Promise<DatabaseTable[T]> {
    await this.ensureInitialized()
    const items = (this.data[table] || []) as DatabaseTable[T]
    return items.filter(condition) as DatabaseTable[T]
  }

  async create<T extends keyof DatabaseTable>(table: T, item: Partial<DatabaseTable[T][0]>): Promise<DatabaseTable[T][0]> {
    await this.ensureInitialized()
    if (!this.data[table]) {
      this.data[table] = [] as DatabaseTable[T]
    }
    
    const itemWithDefaults = item as Partial<DatabaseTable[T][0]> & { created_at?: string; updated_at?: string }
    const newItem = {
      ...item,
      id: item.id || this.generateId(),
      created_at: itemWithDefaults.created_at || new Date().toISOString(),
      updated_at: itemWithDefaults.updated_at || new Date().toISOString()
    } as DatabaseTable[T][0]
    
    if (!this.data[table]) {
      this.data[table] = [] as DatabaseTable[T]
    }
    (this.data[table] as DatabaseTable[T][0][]).push(newItem)
    this.saveData()
    return newItem
  }

  async update<T extends keyof DatabaseTable>(table: T, id: string, updates: Partial<DatabaseTable[T][0]>): Promise<DatabaseTable[T][0] | null> {
    await this.ensureInitialized()
    const items = (this.data[table] || []) as DatabaseTable[T]
    const index = items.findIndex(item => item.id === id)
    
    if (index === -1) {
      return null
    }
    
    const updatedItem = {
      ...items[index],
      ...updates,
      updated_at: new Date().toISOString()
    } as DatabaseTable[T][0]
    
    ;(this.data[table] as DatabaseTable[T])[index] = updatedItem
    this.saveData()
    return updatedItem
  }

  async delete<T extends keyof DatabaseTable>(table: T, id: string): Promise<boolean> {
    await this.ensureInitialized()
    const items = (this.data[table] || []) as DatabaseTable[T]
    const index = items.findIndex(item => item.id === id)
    
    if (index === -1) {
      return false
    }
    
    ;(this.data[table] as DatabaseTable[T]).splice(index, 1)
    this.saveData()
    return true
  }

  async getWithRelations<T extends keyof DatabaseTable>(
    table: T, 
    ids?: string[], 
    relations?: Record<string, RelationConfig>
  ): Promise<DatabaseTable[T]> {
    await this.ensureInitialized()
    let items = (this.data[table] || []) as DatabaseTable[T]
    
    // Filtrar por IDs si se proporcionan
    if (ids && ids.length > 0) {
      items = items.filter(item => ids.includes(item.id)) as DatabaseTable[T]
    }
    
    // Agregar relaciones si se especifican
    if (relations) {
      items = items.map(item => {
        const itemWithRelations = { ...item } as DatabaseTable[T][0] & Record<string, DatabaseRecord | null>
        
        Object.entries(relations).forEach(([relationName, config]) => {
          const relatedItems = this.data[config.table] || []
          const relatedItem = relatedItems.find(related => related.id === (item as DatabaseRecord)[config.key])
          itemWithRelations[relationName] = relatedItem || null
        })
        
        return itemWithRelations
      }) as DatabaseTable[T]
    }
    
    return items
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  // Método para limpiar todos los datos (útil para testing)
  async clear(): Promise<void> {
    await this.ensureInitialized()
    this.data = {}
    this.saveData()
  }

  async forceReloadFromDatabase(): Promise<void> {
    try {
      console.log('🔄 Forzando recarga desde database.json...')
      
      // Limpiar localStorage completamente
      localStorage.removeItem('localDB_data')
      this.data = {
        usuarios: [],
        obras: [],
        materiales: [],
        requerimientos: [],
        solicitudes_compra: [],
        rq_sc: [],
        ordenes_compra: [],
        sc_oc: []
      }
      
      // Cargar directamente desde database.json usando import
      const jsonData = database as Partial<DatabaseTable>
      console.log('📁 Archivo database.json cargado, tamaño:', Object.keys(jsonData).length)
      
      // Asignar datos directamente con type assertions seguras
      this.data = {
        usuarios: (jsonData.usuarios || []) as unknown as Usuario[],
        obras: (jsonData.obras || []) as unknown as Obra[],
        materiales: (jsonData.materiales || []) as unknown as Material[],
        requerimientos: (jsonData.requerimientos || []) as unknown as Requerimiento[],
        solicitudes_compra: (jsonData.solicitudes_compra || []) as unknown as SolicitudCompra[],
        rq_sc: (jsonData.rq_sc || []) as unknown as RqSc[],
        ordenes_compra: (jsonData.ordenes_compra || []) as unknown as OrdenCompra[],
        sc_oc: (jsonData.sc_oc || []) as unknown as ScOc[]
      }
      
      // Guardar en localStorage
      this.saveData()
      
      console.log('✅ Recarga completada desde database.json')
      console.log('📊 Datos cargados:')
      console.log('- Usuarios:', this.data.usuarios.length)
      console.log('- Obras:', this.data.obras.length)
      console.log('- Materiales:', this.data.materiales.length)
      console.log('- Requerimientos:', this.data.requerimientos.length)
      console.log('- Solicitudes de compra:', this.data.solicitudes_compra.length)
      console.log('- Relaciones RQ-SC:', this.data.rq_sc.length)
      console.log('- Órdenes de compra:', this.data.ordenes_compra?.length || 0)
      console.log('- Relaciones SC-OC:', this.data.sc_oc?.length || 0)
    } catch (error) {
      console.error('❌ Error al forzar recarga:', error)
      throw error
    }
  }

  // Método para exportar datos
  async export(): Promise<string> {
    return JSON.stringify(this.data, null, 2)
  }

  // Método para importar datos
  async import(jsonData: string): Promise<void> {
    try {
      this.data = JSON.parse(jsonData)
      this.saveData()
    } catch (error) {
      console.error('Error importing data:', error)
      throw new Error('Invalid JSON data')
    }
  }

  // Método para obtener estadísticas del dashboard
  async getStats(): Promise<{
    requerimientosPendientes: number;
    stockBajo: number;
    entradasMes: number;
    salidasMes: number;
  }> {
    await this.ensureInitialized()
    try {
      const requerimientos = await this.get('requerimientos')
      const stockItems = await this.get('stock_obra_material')
      const entradas = await this.get('entradas')
      const salidas = await this.get('salidas')

      // Calcular requerimientos pendientes
      const requerimientosPendientes = requerimientos.filter(
        req => req.estado === 'PENDIENTE'
      ).length

      // Calcular stock bajo (cantidad actual menor a cantidad mínima)
      const stockBajo = stockItems.filter(
        item => item.cantidad_actual < item.cantidad_minima
      ).length

      // Calcular entradas y salidas del mes actual
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()

      const entradasMes = entradas.filter(entrada => {
        const entradaDate = new Date(entrada.fecha_entrada)
        return entradaDate.getMonth() === currentMonth && entradaDate.getFullYear() === currentYear
      }).length

      const salidasMes = salidas.filter(salida => {
        const salidaDate = new Date(salida.fecha_entrega)
        return salidaDate.getMonth() === currentMonth && salidaDate.getFullYear() === currentYear
      }).length

      return {
        requerimientosPendientes,
        stockBajo,
        entradasMes,
        salidasMes
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
      return {
        requerimientosPendientes: 0,
        stockBajo: 0,
        entradasMes: 0,
        salidasMes: 0
      }
    }
  }

  // Método para obtener actividad reciente
  async getRecentActivity(): Promise<{
    requerimientos: Requerimiento[];
    entradas: Entrada[];
  }> {
    await this.ensureInitialized()
    try {
      const requerimientos = await this.getWithRelations('requerimientos', undefined, {
        material: { table: 'materiales', key: 'material_id' },
        obra: { table: 'obras', key: 'obra_id' }
      })

      const entradas = await this.getWithRelations('entradas', undefined, {
        material: { table: 'materiales', key: 'material_id' },
        obra: { table: 'obras', key: 'obra_id' }
      })

      // Ordenar por fecha de creación (más recientes primero) y tomar los últimos 5
      const requerimientosRecientes = requerimientos
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      const entradasRecientes = entradas
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      return {
        requerimientos: requerimientosRecientes,
        entradas: entradasRecientes
      }
    } catch (error) {
      console.error('Error obteniendo actividad reciente:', error)
      return {
        requerimientos: [],
        entradas: []
      }
    }
  }
}

// Instancia singleton de la base de datos local
export const localDB = new LocalDatabase({
  storageKey: 'almacen_obra_db',
  version: '1.0.0'
})

// Forzar la inicialización inmediata desde database.json
;(async () => {
  try {
    await localDB.forceReloadFromDatabase()
    console.log('✅ Base de datos inicializada correctamente desde database.json')
    
    // Verificar datos cargados
    const solicitudes = await localDB.get('solicitudes_compra')
    console.log('Solicitudes de compra cargadas:', solicitudes.length)
    console.log('Primeras 3 solicitudes:', solicitudes.slice(0, 3).map(s => ({ id: s.id, sc_numero: s.sc_numero })))
    
    const requerimientos = await localDB.get('requerimientos')
    console.log('Requerimientos cargados:', requerimientos.length)
    
    const materiales = await localDB.get('materiales')
    console.log('Materiales cargados:', materiales.length)
    
    const rqSc = await localDB.get('rq_sc')
    console.log('Relaciones RQ-SC cargadas:', rqSc.length)
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error)
  }
})()

export default localDB