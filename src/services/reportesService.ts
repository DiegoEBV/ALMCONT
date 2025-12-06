import { supabase } from '../lib/supabase'
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
      console.log('🔍 [ReportesService] Iniciando getReporteRequerimientos con filtros:', filtros)

      let query = supabase
        .from('requerimientos')
        .select(`
          *,
          obra:obras (
            id,
            nombre
          )
        `)

      // Aplicar filtros
      if (filtros.fecha_desde) {
        query = query.gte('created_at', filtros.fecha_desde)
      }
      if (filtros.fecha_hasta) {
        // Ajustar fecha hasta para incluir todo el día
        const fechaHasta = new Date(filtros.fecha_hasta)
        fechaHasta.setHours(23, 59, 59, 999)
        query = query.lte('created_at', fechaHasta.toISOString())
      }
      if (filtros.obra_id) {
        query = query.eq('obra_id', filtros.obra_id)
      }

      const { data: requerimientos, error } = await query

      if (error) throw error

      console.log('📋 [ReportesService] Requerimientos obtenidos de BD:', requerimientos?.length)

      // Agrupar por obra y calcular estadísticas
      const reporteMap = new Map<string, ReporteRequerimientos>()

      requerimientos?.forEach(req => {
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
          case 'ASIGNADO':
          case 'EN_PROCESO':
            reporte.aprobados++
            break
          case 'CANCELADO':
            reporte.rechazados++
            break
        }
      })

      const resultado = Array.from(reporteMap.values())
      console.log('📊 [ReportesService] Reporte final generado:', resultado)
      return resultado
    } catch (error) {
      console.error('❌ [ReportesService] Error al generar reporte de requerimientos:', error)
      throw error
    }
  }

  // Reporte de stock actual
  async getReporteStock(filtros: FiltrosReporte = {}): Promise<ReporteStock[]> {
    try {
      console.log('🔍 [ReportesService] Iniciando getReporteStock con filtros:', filtros)

      let query = supabase
        .from('stock_obra_material')
        .select(`
          *,
          material:materiales (
            id,
            nombre,
            codigo,
            categoria,
            precio_referencial,
            unidad_medida
          )
        `)

      // Aplicar filtros
      if (filtros.obra_id) {
        query = query.eq('obra_id', filtros.obra_id)
      }
      // Nota: El filtro de categoría se debe aplicar en memoria porque está en la tabla relacionada

      const { data: stock, error } = await query

      if (error) throw error

      console.log('📦 [ReportesService] Stock obtenido de BD:', stock?.length)

      let stockFiltrado = stock || []

      if (filtros.categoria) {
        stockFiltrado = stockFiltrado.filter(item => item.material?.categoria === filtros.categoria)
        console.log('📂 [ReportesService] Después de filtro categoria:', stockFiltrado.length)
      }

      const resultado = stockFiltrado.map(item => {
        const material = item.material || {
          nombre: 'Material desconocido',
          codigo: '',
          categoria: '',
          precio_referencial: 0,
          unidad_medida: ''
        }
        const valorTotal = item.stock_actual * (material.precio_referencial || 0)

        let estado: 'NORMAL' | 'BAJO' | 'AGOTADO' = 'NORMAL'
        if (item.stock_actual === 0) {
          estado = 'AGOTADO'
        } else if (item.stock_actual <= (item.stock_minimo || 0)) {
          estado = 'BAJO'
        }

        return {
          material_id: item.material_id,
          material_nombre: material.nombre,
          material_codigo: material.codigo,
          categoria: material.categoria,
          stock_total: item.stock_actual,
          stock_minimo: item.stock_minimo || 0,
          valor_unitario: material.precio_referencial || 0,
          valor_total: valorTotal,
          estado
        }
      })

      console.log('📊 [ReportesService] Reporte de stock final generado:', resultado.length, 'items')
      return resultado
    } catch (error) {
      console.error('❌ [ReportesService] Error al generar reporte de stock:', error)
      throw error
    }
  }

  // Reporte de movimientos por fecha
  async getReporteMovimientos(filtros: FiltrosReporte = {}): Promise<ReporteMovimientos[]> {
    try {
      // Obtener entradas y salidas para simular kardex
      let queryEntradas = supabase
        .from('entradas')
        .select(`
          *,
          material:materiales (
            id,
            precio_referencial
          )
        `)

      let querySalidas = supabase
        .from('salidas')
        .select(`
          *,
          material:materiales (
            id,
            precio_referencial
          )
        `)

      // Aplicar filtros a entradas
      if (filtros.fecha_desde) {
        queryEntradas = queryEntradas.gte('fecha_recepcion', filtros.fecha_desde)
      }
      if (filtros.fecha_hasta) {
        const fechaHasta = new Date(filtros.fecha_hasta)
        fechaHasta.setHours(23, 59, 59, 999)
        queryEntradas = queryEntradas.lte('fecha_recepcion', fechaHasta.toISOString())
      }
      if (filtros.obra_id) {
        queryEntradas = queryEntradas.eq('obra_id', filtros.obra_id)
      }

      // Aplicar filtros a salidas
      if (filtros.fecha_desde) {
        querySalidas = querySalidas.gte('fecha_salida', filtros.fecha_desde)
      }
      if (filtros.fecha_hasta) {
        const fechaHasta = new Date(filtros.fecha_hasta)
        fechaHasta.setHours(23, 59, 59, 999)
        querySalidas = querySalidas.lte('fecha_salida', fechaHasta.toISOString())
      }
      if (filtros.obra_id) {
        querySalidas = querySalidas.eq('obra_id', filtros.obra_id)
      }

      const [resEntradas, resSalidas] = await Promise.all([
        queryEntradas,
        querySalidas
      ])

      if (resEntradas.error) throw resEntradas.error
      if (resSalidas.error) throw resSalidas.error

      const entradas = resEntradas.data || []
      const salidas = resSalidas.data || []

      // Convertir a formato kardex
      const movimientos = [
        ...entradas.map(entrada => ({
          fecha_movimiento: entrada.fecha_recepcion,
          tipo_movimiento: 'ENTRADA' as const,
          cantidad: entrada.cantidad_recibida,
          obra_id: entrada.obra_id,
          material: entrada.material
        })),
        ...salidas.map(salida => ({
          fecha_movimiento: salida.fecha_salida,
          tipo_movimiento: 'SALIDA' as const,
          cantidad: salida.cantidad,
          obra_id: salida.obra_id,
          material: salida.material
        }))
      ]

      // Agrupar por fecha
      const reporteMap = new Map<string, ReporteMovimientos>()

      movimientos.forEach(mov => {
        if (!mov.fecha_movimiento) return

        const fecha = mov.fecha_movimiento.split('T')[0] // Solo la fecha
        const material = mov.material || { precio_referencial: 0 }
        const valor = mov.cantidad * (material.precio_referencial || 0)

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

      const resultado = Array.from(reporteMap.values()).sort((a, b) => b.fecha.localeCompare(a.fecha))
      return resultado
    } catch (error) {
      console.error('Error al generar reporte de movimientos:', error)
      throw error
    }
  }

  // Reporte de consumo por material y obra
  async getReporteConsumo(filtros: FiltrosReporte = {}): Promise<ReporteConsumo[]> {
    try {
      // Obtener salidas con relaciones
      let query = supabase
        .from('salidas')
        .select(`
          *,
          material:materiales (
            id,
            nombre,
            codigo,
            categoria,
            precio_referencial
          ),
          obra:obras (
            id,
            nombre
          )
        `)

      // Aplicar filtros
      if (filtros.fecha_desde) {
        query = query.gte('fecha_salida', filtros.fecha_desde)
      }
      if (filtros.fecha_hasta) {
        const fechaHasta = new Date(filtros.fecha_hasta)
        fechaHasta.setHours(23, 59, 59, 999)
        query = query.lte('fecha_salida', fechaHasta.toISOString())
      }
      if (filtros.obra_id) {
        query = query.eq('obra_id', filtros.obra_id)
      }

      const { data: salidas, error } = await query

      if (error) throw error

      let salidasFiltradas = salidas || []

      if (filtros.categoria) {
        salidasFiltradas = salidasFiltradas.filter(salida => salida.material?.categoria === filtros.categoria)
      }

      // Agrupar por material y obra
      const reporteMap = new Map<string, ReporteConsumo>()

      salidasFiltradas.forEach(salida => {
        const key = `${salida.material_id}-${salida.obra_id}`
        const material = salida.material || { nombre: 'Material desconocido', codigo: '', precio_referencial: 0 }
        const obra = salida.obra || { nombre: 'Obra desconocida' }
        const valor = salida.cantidad * (material.precio_referencial || 0)

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
        reporte.cantidad_consumida += salida.cantidad
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
      console.log('🔍 [ReportesService] Iniciando getEstadisticasGenerales con filtros:', filtros)

      const [requerimientos, stock, movimientos] = await Promise.all([
        this.getReporteRequerimientos(filtros),
        this.getReporteStock(filtros),
        this.getReporteMovimientos(filtros)
      ])

      console.log('📊 [ReportesService] Datos obtenidos para estadísticas:', {
        requerimientos: requerimientos.length,
        stock: stock.length,
        movimientos: movimientos.length
      })

      const totalRequerimientos = requerimientos.reduce((sum, r) => sum + r.total_requerimientos, 0)
      const valorTotalRequerimientos = requerimientos.reduce((sum, r) => sum + r.valor_total, 0)
      const totalMateriales = stock.length
      const valorTotalStock = stock.reduce((sum, s) => sum + s.valor_total, 0)
      const materialesBajoStock = stock.filter(s => s.estado === 'BAJO').length
      const materialesAgotados = stock.filter(s => s.estado === 'AGOTADO').length

      const estadisticas = {
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

      console.log('📈 [ReportesService] Estadísticas generales calculadas:', estadisticas)
      return estadisticas
    } catch (error) {
      console.error('❌ [ReportesService] Error al obtener estadísticas generales:', error)
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