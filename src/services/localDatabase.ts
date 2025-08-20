import database from '../data/database.json'
import { Usuario, Obra, Material, Requerimiento, StockObraMaterial, Entrada, Salida, SolicitudCompra, OrdenCompra, RqSc, ScOc } from '../types'

// Tipos para las tablas de la base de datos
export type TableName = 'usuarios' | 'obras' | 'materiales' | 'requerimientos' | 'stock_obra_material' | 'entradas' | 'salidas' | 'solicitudes_compra' | 'ordenes_compra' | 'rq_sc' | 'sc_oc'

// Tipo para mapear nombres de tabla a tipos específicos
type TableTypeMap = {
  usuarios: Usuario
  obras: Obra
  materiales: Material
  requerimientos: Requerimiento
  stock_obra_material: StockObraMaterial
  entradas: Entrada
  salidas: Salida
  solicitudes_compra: SolicitudCompra
  ordenes_compra: OrdenCompra
  rq_sc: RqSc
  sc_oc: ScOc
}

// Tipo union para todos los tipos de entidades de la base de datos
type DatabaseEntity = Usuario | Obra | Material | Requerimiento | StockObraMaterial | Entrada | Salida | SolicitudCompra | OrdenCompra | RqSc | ScOc

// Clase para manejar la base de datos local
class LocalDatabase {
  private data: Record<string, (DatabaseEntity | Record<string, unknown>)[]>

  constructor() {
    // Cargar datos desde el archivo JSON
    this.data = { ...database }
  }

  // Obtener todos los registros de una tabla
  getAll<T extends TableName>(tableName: T): TableTypeMap[T][] {
    return (this.data[tableName] as TableTypeMap[T][]) || []
  }

  // Obtener un registro por ID
  getById<T extends TableName>(tableName: T, id: string): TableTypeMap[T] | null {
    const records = this.getAll(tableName)
    return records.find((record: TableTypeMap[T]) => record.id === id) || null
  }

  // Obtener registros con filtros
  getWhere<T extends TableName>(tableName: T, filter: (item: TableTypeMap[T]) => boolean): TableTypeMap[T][] {
    const records = this.getAll(tableName)
    return records.filter(filter)
  }

  // Crear un nuevo registro
  create<T extends TableName>(tableName: T, data: Omit<TableTypeMap[T], 'id' | 'created_at' | 'updated_at'>): TableTypeMap[T] {
    const records = this.getAll(tableName)
    const newId = (Math.max(...records.map((r: TableTypeMap[T]) => parseInt(r.id) || 0), 0) + 1).toString()
    const now = new Date().toISOString()
    
    const newRecord = {
      ...data,
      id: newId,
      created_at: now,
      updated_at: now
    } as TableTypeMap[T]

    this.data[tableName] = [...records, newRecord]
    this.saveToStorage()
    return newRecord
  }

  // Actualizar un registro
  update<T extends TableName>(tableName: T, id: string, data: Partial<TableTypeMap[T]>): TableTypeMap[T] | null {
    const records = this.getAll(tableName)
    const index = records.findIndex((record: TableTypeMap[T]) => record.id === id)
    
    if (index === -1) return null

    const updatedRecord = {
      ...records[index],
      ...data,
      updated_at: new Date().toISOString()
    }

    this.data[tableName][index] = updatedRecord
    this.saveToStorage()
    return updatedRecord
  }

  // Eliminar un registro
  delete<T extends TableName>(tableName: T, id: string): boolean {
    const records = this.getAll(tableName)
    const index = records.findIndex((record: TableTypeMap[T]) => record.id === id)
    
    if (index === -1) return false

    this.data[tableName].splice(index, 1)
    this.saveToStorage()
    return true
  }

  // Obtener registros con relaciones (simula JOIN)
  getWithRelations<T extends TableName>(tableName: T, relations: { [key: string]: { table: TableName, foreignKey: string, localKey?: string } }): (TableTypeMap[T] & Record<string, DatabaseEntity>)[] {
    const records = this.getAll(tableName)
    
    return records.map((record: TableTypeMap[T]) => {
      const enrichedRecord = { ...record } as TableTypeMap[T] & Record<string, DatabaseEntity>
      
      Object.entries(relations).forEach(([relationName, config]) => {
        const foreignKey = config.localKey || config.foreignKey
        const relatedRecord = this.getById(config.table, (record as Record<string, string>)[foreignKey])
        if (relatedRecord) {
          enrichedRecord[relationName] = relatedRecord
        }
      })
      
      return enrichedRecord
    })
  }

  // Guardar cambios en localStorage (simula persistencia)
  private saveToStorage(): void {
    try {
      localStorage.setItem('almacen_database', JSON.stringify(this.data))
    } catch (error) {
      console.warn('No se pudo guardar en localStorage:', error)
    }
  }

  // Cargar datos desde localStorage
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('almacen_database')
      if (stored) {
        this.data = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('No se pudo cargar desde localStorage:', error)
    }
  }

  // Resetear a datos iniciales
  reset(): void {
    this.data = { ...database }
    this.saveToStorage()
  }

  // Obtener estadísticas para el dashboard
  getStats() {
    const requerimientos = this.getAll('requerimientos')
    const stock = this.getAll('stock_obra_material')
    const entradas = this.getAll('entradas')
    const salidas = this.getAll('salidas')

    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    return {
      requerimientosPendientes: requerimientos.filter((r: Requerimiento) => r.estado === 'PENDIENTE').length,
      stockBajo: stock.filter((s: StockObraMaterial) => s.cantidad_actual < s.cantidad_minima).length,
      entradasMes: entradas.filter((e: Entrada) => {
        const fecha = new Date(e.created_at)
        return fecha.getMonth() + 1 === currentMonth && fecha.getFullYear() === currentYear
      }).length,
      salidasMes: salidas.filter((s: Salida) => {
        const fecha = new Date(s.created_at)
        return fecha.getMonth() + 1 === currentMonth && fecha.getFullYear() === currentYear
      }).length
    }
  }

  // Obtener actividad reciente
  getRecentActivity() {
    const requerimientos = this.getWithRelations('requerimientos', {
      obra: { table: 'obras', foreignKey: 'obra_id' },
      material: { table: 'materiales', foreignKey: 'material_id' }
    })
    
    const entradas = this.getWithRelations('entradas', {
      obra: { table: 'obras', foreignKey: 'obra_id' },
      material: { table: 'materiales', foreignKey: 'material_id' }
    })

    // Ordenar por fecha de creación (más recientes primero)
    const recentRequerimientos = requerimientos
      .sort((a: Requerimiento & Record<string, DatabaseEntity>, b: Requerimiento & Record<string, DatabaseEntity>) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    const recentEntradas = entradas
      .sort((a: Entrada & Record<string, DatabaseEntity>, b: Entrada & Record<string, DatabaseEntity>) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    return {
      requerimientos: recentRequerimientos,
      entradas: recentEntradas
    }
  }
}

// Instancia singleton de la base de datos
export const localDB = new LocalDatabase()

// Cargar datos desde localStorage al inicializar
localDB.loadFromStorage()