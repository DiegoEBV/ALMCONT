import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChartBarSquareIcon, ArrowDownTrayIcon, FunnelIcon, DocumentTextIcon, ArchiveBoxIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { reportesService, ReporteRequerimientos, ReporteStock, ReporteMovimientos, ReporteConsumo, FiltrosReporte } from '../services/reportesService'
import { obrasService } from '../services/obras'
import { Obra } from '../types'

import { Select } from '../components/ui/select'


// Eliminadas las variables stockColumns, movimientosColumns, consumoColumns ya que no se utilizan

type TipoReporte = 'requerimientos' | 'stock' | 'movimientos' | 'consumo'

const Reportes: React.FC = () => {
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('requerimientos')
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    fecha_desde: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    fecha_hasta: format(new Date(), 'yyyy-MM-dd')
  })
  const [obras, setObras] = useState<Obra[]>([])
  const [reporteRequerimientos, setReporteRequerimientos] = useState<ReporteRequerimientos[]>([])
  const [reporteStock, setReporteStock] = useState<ReporteStock[]>([])
  const [reporteMovimientos, setReporteMovimientos] = useState<ReporteMovimientos[]>([])
  const [reporteConsumo, setReporteConsumo] = useState<ReporteConsumo[]>([])
  const [estadisticas, setEstadisticas] = useState<{
    requerimientos: { total: number };
    stock: { total_materiales: number; bajo_stock: number; agotados: number };
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const cargarObras = useCallback(async () => {
    try {
      const data = await obrasService.getAll()
      setObras(data)
    } catch (error) {
      console.error('Error al cargar obras:', error)
    }
  }, [])

  const cargarEstadisticas = useCallback(async () => {
    try {
      const stats = await reportesService.getEstadisticasGenerales(filtros)
      setEstadisticas(stats)
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    }
  }, [filtros])

  const cargarReporte = useCallback(async () => {
    setLoading(true)
    try {
      switch (tipoReporte) {
        case 'requerimientos': {
          const reqData: ReporteRequerimientos[] = await reportesService.getReporteRequerimientos(filtros)
          setReporteRequerimientos(reqData)
          break
        }
        case 'stock': {
          const stockData = await reportesService.getReporteStock(filtros)
          setReporteStock(stockData)
          break
        }
        case 'movimientos': {
          const movData = await reportesService.getReporteMovimientos(filtros)
          setReporteMovimientos(movData)
          break
        }
        case 'consumo': {
          const consData = await reportesService.getReporteConsumo(filtros)
          setReporteConsumo(consData)
          break
        }
      }
    } catch (error) {
      console.error('Error al cargar reporte:', error)
    } finally {
      setLoading(false)
    }
  }, [tipoReporte, filtros])

  useEffect(() => {
    cargarObras()
    cargarEstadisticas()
  }, [cargarObras, cargarEstadisticas])

  useEffect(() => {
    cargarReporte()
  }, [cargarReporte])

  const exportarReporte = async () => {
    try {
      let datos: (ReporteRequerimientos | ReporteStock | ReporteMovimientos | ReporteConsumo)[] = []
      let nombreArchivo = ''

      switch (tipoReporte) {
        case 'requerimientos':
          datos = reporteRequerimientos
          nombreArchivo = 'reporte_requerimientos'
          break
        case 'stock':
          datos = reporteStock
          nombreArchivo = 'reporte_stock'
          break
        case 'movimientos':
          datos = reporteMovimientos
          nombreArchivo = 'reporte_movimientos'
          break
        case 'consumo':
          datos = reporteConsumo
          nombreArchivo = 'reporte_consumo'
          break
      }

      await reportesService.exportarCSV(tipoReporte, datos, nombreArchivo)
    } catch (error) {
      console.error('Error al exportar reporte:', error)
      alert('Error al exportar el reporte')
    }
  }

  const handleFiltroChange = (campo: keyof FiltrosReporte, valor: string) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor || undefined
    }))
  }

  const renderEstadisticas = () => {
    if (!estadisticas) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Requerimientos</p>
              <p className="text-2xl font-bold text-blue-900">{estadisticas.requerimientos.total}</p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total Materiales</p>
              <p className="text-2xl font-bold text-green-900">{estadisticas.stock.total_materiales}</p>
            </div>
            <ArchiveBoxIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Bajo Stock</p>
              <p className="text-2xl font-bold text-yellow-900">{estadisticas.stock.bajo_stock}</p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium">Agotados</p>
              <p className="text-2xl font-bold text-red-900">{estadisticas.stock.agotados}</p>
            </div>
            <ChartBarSquareIcon className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>
    )
  }

  const renderFiltros = () => (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex items-center gap-2 mb-4">
        <FunnelIcon className="h-5 w-5 text-gray-500" />
        <h3 className="font-medium text-gray-900">Filtros</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Desde
          </label>
          <input
            type="date"
            value={filtros.fecha_desde || ''}
            onChange={(e) => handleFiltroChange('fecha_desde', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Hasta
          </label>
          <input
            type="date"
            value={filtros.fecha_hasta || ''}
            onChange={(e) => handleFiltroChange('fecha_hasta', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Obra
          </label>
          <Select
            value={filtros.obra_id}
            onChange={(e) => setFiltros({ ...filtros, obra_id: e.target.value })}
            options={[
              { value: '', label: 'Todas las obras' },
              ...obras.map(obra => ({ value: obra.id, label: obra.nombre }))
            ]}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={exportarReporte}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>
    </div>
  )

  const renderTablaRequerimientos = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Reporte de Requerimientos por Obra</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obra</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendientes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aprobados</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rechazados</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reporteRequerimientos.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.obra_nombre}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.total_requerimientos}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                  {item.pendientes}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  {item.aprobados}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                  {item.rechazados}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  S/ {item.valor_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderTablaStock = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Reporte de Stock Actual</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mínimo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reporteStock.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.material_nombre}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.material_codigo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.categoria}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.stock_total}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.stock_minimo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    item.estado === 'NORMAL' ? 'bg-green-100 text-green-800' :
                    item.estado === 'BAJO' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.estado}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  S/ {item.valor_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderTablaMovimientos = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Reporte de Movimientos por Fecha</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entradas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salidas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transferencias</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ajustes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Entradas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Salidas</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reporteMovimientos.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(() => {
                    if (!item.fecha) return '-'
                    const date = new Date(item.fecha)
                    if (isNaN(date.getTime())) return '-'
                    return format(date, 'dd/MM/yyyy', { locale: es })
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                  {item.entradas}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                  {item.salidas}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                  {item.transferencias}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                  {item.ajustes}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  S/ {item.valor_entradas.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  S/ {item.valor_salidas.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderTablaConsumo = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Reporte de Consumo por Material y Obra</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obra</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad Consumida</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Consumido</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reporteConsumo.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.material_nombre}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.material_codigo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.obra_nombre}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.cantidad_consumida}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  S/ {item.valor_consumido.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.periodo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-600">Generación de reportes y estadísticas del sistema</p>
      </div>

      {renderEstadisticas()}
      {renderFiltros()}

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTipoReporte('requerimientos')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tipoReporte === 'requerimientos'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DocumentTextIcon className="h-4 w-4 inline mr-2" />
            Requerimientos
          </button>
          <button
            onClick={() => setTipoReporte('stock')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tipoReporte === 'stock'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArchiveBoxIcon className="h-4 w-4 inline mr-2" />
            Stock
          </button>
          <button
            onClick={() => setTipoReporte('movimientos')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tipoReporte === 'movimientos'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowTrendingUpIcon className="h-4 w-4 inline mr-2" />
            Movimientos
          </button>
          <button
            onClick={() => setTipoReporte('consumo')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tipoReporte === 'consumo'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ChartBarSquareIcon className="h-4 w-4 inline mr-2" />
            Consumo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Cargando reporte...</p>
        </div>
      ) : (
        <>
          {tipoReporte === 'requerimientos' && renderTablaRequerimientos()}
          {tipoReporte === 'stock' && renderTablaStock()}
          {tipoReporte === 'movimientos' && renderTablaMovimientos()}
          {tipoReporte === 'consumo' && renderTablaConsumo()}
        </>
      )}
    </div>
  )
}

export default Reportes