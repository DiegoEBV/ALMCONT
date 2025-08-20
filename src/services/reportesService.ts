import { localDB } from '../lib/localDB'
import type { FiltrosReporte } from '../types'

// Re-exportar tipos para uso en componentes
export type { FiltrosReporte }

export interface ReporteRequerimientos {
  obra_id: string
  obra_nombre: string
  total_requerimientos: number
  pendientes: number
  aprobados: number
  rechazados: number
  valor_total: number
  [key: string]: unknown
}

export interface ReporteStock {
  material_id: string
  material_nombre: string
  material_codigo: string
  categoria: string
  stock_total: number
  stock_minimo: number
  valor_unitario: number
  valor_total: number
  estado: 'NORMAL' | 'BAJO' | 'AGOTADO'
  [key: string]: unknown
}

export interface ReporteMovimientos {
  fecha: string
  entradas: number
  salidas: number
  transferencias: number
  ajustes: number
  valor_entradas: number
  valor_salidas: number
  [key: string]: unknown
}

export interface ReporteConsumo {
  material_id: string
  material_nombre: string
  material_codigo: string
  obra_id: string
  obra_nombre: string
  cantidad_consumida: number
  valor_consumido: number
  periodo: string
  [key: string]: unknown
}

class ReportesService {
  // Reporte de requerimientos por obra
  async getReporteRequerimientos(filtros: FiltrosReporte = {}): Promise<ReporteRequerimientos[]> {
    try {
      let requerimientos = await localDB.getWithRelations('requerimientos', undefined, {
        obra: { table: 'obras', key: 'obra_id' }
      })

      // Aplicar filtros
      if (filtros.fecha_desde) {
        requerimientos = requerimientos.filter(req => 
          new Date(req.created_at) >= new Date(filtros.fecha_desde!)
        )
      }
      if (filtros.fecha_hasta) {
        requerimientos = requerimientos.filter(req => 
          new Date(req.created_at) <= new Date(filtros.fecha_hasta!)
        )
      }
      if (filtros.obra_id) {
        requerimientos = requerimientos.filter(req => req.obra_id === filtros.obra_id)
      }

      // Agrupar por obra y calcular estadísticas
      const reporteMap = new Map<string, ReporteRequerimientos>()

      requerimientos.forEach(req => {
        const obraId = req.obra_id
        const obraNombre = req.obra?.nombre || 'Sin obra'

        if (!reporteMap.has(obraId)) {
          reporteMap.set(obraId, {
            obra_id: obraId,
            obra_nombre: obraNombre,
            total_requerimientos: 0,
            pendientes: 0,
            aprobados: 0,
            rechazados: 0,
            valor_total: 0
          })
        }

        const reporte = reporteMap.get(obraId)!
        reporte.total_requerimientos++
        reporte.valor_total += (req.presupuesto_referencial as number) || 0

        switch (req.estado) {
          case 'PENDIENTE':
            reporte.pendientes++
            break
          case 'ATENDIDO':
            reporte.aprobados++
            break
          case 'CANCELADO':
            reporte.rechazados++
            break
        }
      })

      return Array.from(reporteMap.values())
    } catch (error) {
      console.error('Error al generar reporte de requerimientos:', error)
      throw error
    }
  }

  // Reporte de stock actual
  async getReporteStock(filtros: FiltrosReporte = {}): Promise<ReporteStock[]> {
    try {
      let stock = await localDB.getWithRelations('stock_obra_material', undefined, {
        material: { table: 'materiales', key: 'material_id' }
      })

      // Aplicar filtros
      if (filtros.obra_id) {
        stock = stock.filter(item => item.obra_id === filtros.obra_id)
      }
      if (filtros.categoria) {
        stock = stock.filter(item => item.material?.categoria === filtros.categoria)
      }

      return stock.map(item => {
        const material = item.material || {
          nombre: 'Material desconocido',
          codigo: '',
          categoria: '',
          precio_unitario: 0,
          unidad: ''
        }
        const valorTotal = item.cantidad_actual * (material.precio_unitario || 0)
        
        let estado: 'NORMAL' | 'BAJO' | 'AGOTADO' = 'NORMAL'
        if (item.cantidad_actual === 0) {
          estado = 'AGOTADO'
        } else if (item.cantidad_actual <= (item.cantidad_minima || 0)) {
          estado = 'BAJO'
        }

        return {
          material_id: item.material_id,
          material_nombre: material.nombre,
          material_codigo: material.codigo,
          categoria: material.categoria,
          stock_total: item.cantidad_actual,
          stock_minimo: item.cantidad_minima || 0,
          valor_unitario: material.precio_unitario || 0,
          valor_total: valorTotal,
          estado
        }
      })
    } catch (error) {
      console.error('Error al generar reporte de stock:', error)
      throw error
    }
  }

  // Reporte de movimientos por fecha
  async getReporteMovimientos(filtros: FiltrosReporte = {}): Promise<ReporteMovimientos[]> {
    try {
      // Obtener entradas y salidas para simular kardex
      const [entradas, salidas] = await Promise.all([
        localDB.getWithRelations('entradas', undefined, {
          material: { table: 'materiales', key: 'material_id' }
        }),
        localDB.getWithRelations('salidas', undefined, {
          material: { table: 'materiales', key: 'material_id' }
        })
      ])

      // Convertir a formato kardex
      const movimientos = [
        ...entradas.map(entrada => ({
          fecha_movimiento: entrada.fecha_entrada,
          tipo_movimiento: 'ENTRADA' as const,
          cantidad: entrada.cantidad_atendida,
          obra_id: entrada.obra_id,
          material: entrada.material
        })),
        ...salidas.map(salida => ({
          fecha_movimiento: salida.fecha_entrega,
          tipo_movimiento: 'SALIDA' as const,
          cantidad: salida.cantidad_entregada,
          obra_id: salida.obra_id,
          material: salida.material
        }))
      ]

      // Aplicar filtros
      let movimientosFiltrados = movimientos
      if (filtros.fecha_desde) {
        movimientosFiltrados = movimientosFiltrados.filter(mov => 
          new Date(mov.fecha_movimiento) >= new Date(filtros.fecha_desde!)
        )
      }
      if (filtros.fecha_hasta) {
        movimientosFiltrados = movimientosFiltrados.filter(mov => 
          new Date(mov.fecha_movimiento) <= new Date(filtros.fecha_hasta!)
        )
      }
      if (filtros.obra_id) {
        movimientosFiltrados = movimientosFiltrados.filter(mov => mov.obra_id === filtros.obra_id)
      }

      // Agrupar por fecha
      const reporteMap = new Map<string, ReporteMovimientos>()

      movimientosFiltrados.forEach(mov => {
        const fecha = mov.fecha_movimiento.split('T')[0] // Solo la fecha
        const material = mov.material || { precio_unitario: 0 }
        const valor = mov.cantidad * (material.precio_unitario || 0)

        if (!reporteMap.has(fecha)) {
          reporteMap.set(fecha, {
            fecha,
            entradas: 0,
            salidas: 0,
            transferencias: 0,
            ajustes: 0,
            valor_entradas: 0,
            valor_salidas: 0
          })
        }

        const reporte = reporteMap.get(fecha)!

        switch (mov.tipo_movimiento) {
          case 'ENTRADA':
            reporte.entradas += mov.cantidad
            reporte.valor_entradas += valor
            break
          case 'SALIDA':
            reporte.salidas += mov.cantidad
            reporte.valor_salidas += valor
            break
        }
      })

      return Array.from(reporteMap.values())
    } catch (error) {
      console.error('Error al generar reporte de movimientos:', error)
      throw error
    }
  }

  // Reporte de consumo por material y obra
  async getReporteConsumo(filtros: FiltrosReporte = {}): Promise<ReporteConsumo[]> {
    try {
      // Obtener salidas con relaciones
      let salidas = await localDB.getWithRelations('salidas', null, {
        material: { table: 'materiales', key: 'material_id' },
        obra: { table: 'obras', key: 'obra_id' }
      })

      // Aplicar filtros
      if (filtros.fecha_desde) {
        salidas = salidas.filter(salida => 
          new Date(salida.fecha_entrega) >= new Date(filtros.fecha_desde!)
        )
      }
      if (filtros.fecha_hasta) {
        salidas = salidas.filter(salida => 
          new Date(salida.fecha_entrega) <= new Date(filtros.fecha_hasta!)
        )
      }
      if (filtros.obra_id) {
        salidas = salidas.filter(salida => salida.obra_id === filtros.obra_id)
      }
      if (filtros.categoria) {
        salidas = salidas.filter(salida => salida.material?.categoria === filtros.categoria)
      }

      // Agrupar por material y obra
      const reporteMap = new Map<string, ReporteConsumo>()

      salidas.forEach(salida => {
        const key = `${salida.material_id}-${salida.obra_id}`
        const material = salida.material || { nombre: 'Material desconocido', codigo: '', precio_unitario: 0 }
        const obra = salida.obra || { nombre: 'Obra desconocida' }
        const valor = salida.cantidad_entregada * (material.precio_unitario || 0)

        if (!reporteMap.has(key)) {
          reporteMap.set(key, {
            material_id: salida.material_id,
            material_nombre: material.nombre,
            material_codigo: material.codigo,
            obra_id: salida.obra_id,
            obra_nombre: obra.nombre,
            cantidad_consumida: 0,
            valor_consumido: 0,
            periodo: `${filtros.fecha_desde || ''} - ${filtros.fecha_hasta || ''}`
          })
        }

        const reporte = reporteMap.get(key)!
        reporte.cantidad_consumida += salida.cantidad_entregada
        reporte.valor_consumido += valor
      })

      return Array.from(reporteMap.values())
    } catch (error) {
      console.error('Error al generar reporte de consumo:', error)
      throw error
    }
  }

  // Exportar reporte a CSV
  async exportarCSV(tipo: string, datos: (ReporteRequerimientos | ReporteStock | ReporteMovimientos | ReporteConsumo)[], nombreArchivo: string) {
    try {
      if (datos.length === 0) {
        throw new Error('No hay datos para exportar')
      }

      // Obtener las columnas del primer objeto
      const columnas = Object.keys(datos[0])
      
      // Crear el contenido CSV
      let csvContent = columnas.join(',') + '\n'
      
      datos.forEach(fila => {
        const valores = columnas.map(col => {
          const valor = fila[col]
          // Escapar comillas y envolver en comillas si contiene comas
          if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"'))) {
            return `"${valor.replace(/"/g, '""')}"`
          }
          return valor
        })
        csvContent += valores.join(',') + '\n'
      })

      // Crear y descargar el archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${nombreArchivo}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error al exportar CSV:', error)
      throw error
    }
  }

  // Obtener estadísticas generales
  async getEstadisticasGenerales(filtros: FiltrosReporte = {}) {
    try {
      const [requerimientos, stock, movimientos] = await Promise.all([
        this.getReporteRequerimientos(filtros),
        this.getReporteStock(filtros),
        this.getReporteMovimientos(filtros)
      ])

      const totalRequerimientos = requerimientos.reduce((sum, r) => sum + r.total_requerimientos, 0)
      const valorTotalRequerimientos = requerimientos.reduce((sum, r) => sum + r.valor_total, 0)
      const totalMateriales = stock.length
      const valorTotalStock = stock.reduce((sum, s) => sum + s.valor_total, 0)
      const materialesBajoStock = stock.filter(s => s.estado === 'BAJO').length
      const materialesAgotados = stock.filter(s => s.estado === 'AGOTADO').length

      return {
        requerimientos: {
          total: totalRequerimientos,
          valor_total: valorTotalRequerimientos
        },
        stock: {
          total_materiales: totalMateriales,
          valor_total: valorTotalStock,
          bajo_stock: materialesBajoStock,
          agotados: materialesAgotados
        },
        movimientos: {
          total_dias: movimientos.length,
          total_entradas: movimientos.reduce((sum, m) => sum + m.entradas, 0),
          total_salidas: movimientos.reduce((sum, m) => sum + m.salidas, 0)
        }
      }
    } catch (error) {
      console.error('Error al obtener estadísticas generales:', error)
      throw error
    }
  }
}

const reportesServiceInstance = new ReportesService()

export const reportesService = {
  getReporteStock: reportesServiceInstance.getReporteStock.bind(reportesServiceInstance),
  getReporteMovimientos: reportesServiceInstance.getReporteMovimientos.bind(reportesServiceInstance),
  getReporteRequerimientos: reportesServiceInstance.getReporteRequerimientos.bind(reportesServiceInstance),
  getReporteConsumo: reportesServiceInstance.getReporteConsumo.bind(reportesServiceInstance),
  getEstadisticasGenerales: reportesServiceInstance.getEstadisticasGenerales.bind(reportesServiceInstance),
  exportarCSV: reportesServiceInstance.exportarCSV.bind(reportesServiceInstance)
}