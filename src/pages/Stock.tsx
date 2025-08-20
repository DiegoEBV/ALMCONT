import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MagnifyingGlassIcon, FunnelIcon, ArrowDownTrayIcon, ClockIcon, CubeIcon } from '@heroicons/react/24/outline'
import { stockService, StockItem, KardexMovimiento } from '../services/stockService'
import { obrasService } from '../services/obras'
import { Obra, TableColumn } from '../types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function Stock() {
  const [activeTab, setActiveTab] = useState<'stock' | 'kardex'>('stock')
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [kardexMovimientos, setKardexMovimientos] = useState<KardexMovimiento[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [stockSummary, setStockSummary] = useState({
    total_materiales: 0,
    stock_bajo: 0,
    sin_stock: 0,
    valor_total: 0
  })

  // Filtros para stock
  const [stockFilters, setStockFilters] = useState({
    busqueda: '',
    obra_id: '',
    categoria: '',
    stock_bajo: false
  })

  // Filtros para kardex
  const [kardexFilters, setKardexFilters] = useState({
    material_id: '',
    obra_id: '',
    fecha_desde: '',
    fecha_hasta: '',
    tipo_movimiento: ''
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (activeTab === 'stock') {
      loadStock()
    } else {
      loadKardex()
    }
  }, [activeTab, stockFilters, kardexFilters])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      console.log('🔄 Cargando datos iniciales...')
      
      const [obrasData, summaryData] = await Promise.all([
        obrasService.getAll(),
        stockService.getStockSummary()
      ])
      
      console.log('📊 Obras cargadas:', obrasData?.length || 0)
      console.log('📈 Resumen de stock:', summaryData)
      
      setObras(obrasData || [])
      setStockSummary(summaryData || {
        total_materiales: 0,
        stock_bajo: 0,
        sin_stock: 0,
        valor_total: 0
      })
    } catch (error) {
      console.error('❌ Error al cargar datos iniciales:', error)
      // Mostrar toast de error
      alert('Error al cargar datos iniciales: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const loadStock = async () => {
    try {
      setLoading(true)
      console.log('🔄 Cargando stock con filtros:', stockFilters)
      
      const data = await stockService.getStockWithFilters(stockFilters)
      
      console.log('📦 Stock cargado:', data?.length || 0, 'items')
      console.log('📦 Datos de stock:', data)
      
      setStockItems(data || [])
    } catch (error) {
      console.error('❌ Error al cargar stock:', error)
      alert('Error al cargar stock: ' + (error as Error).message)
      setStockItems([])
    } finally {
      setLoading(false)
    }
  }

  const loadKardex = async () => {
    try {
      setLoading(true)
      console.log('🔄 Cargando kardex con filtros:', kardexFilters)
      
      const data = await stockService.getKardexMovimientos({
        ...kardexFilters,
        limit: 100
      })
      
      console.log('📋 Kardex cargado:', data?.length || 0, 'movimientos')
      console.log('📋 Datos de kardex:', data)
      
      setKardexMovimientos(data || [])
    } catch (error) {
      console.error('❌ Error al cargar kardex:', error)
      alert('Error al cargar kardex: ' + (error as Error).message)
      setKardexMovimientos([])
    } finally {
      setLoading(false)
    }
  }

  const handleStockFilterChange = (key: string, value: string | boolean) => {
    setStockFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleKardexFilterChange = (key: string, value: string) => {
    setKardexFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearStockFilters = () => {
    setStockFilters({
      busqueda: '',
      obra_id: '',
      categoria: '',
      stock_bajo: false
    })
  }

  const clearKardexFilters = () => {
    setKardexFilters({
      material_id: '',
      obra_id: '',
      fecha_desde: '',
      fecha_hasta: '',
      tipo_movimiento: ''
    })
  }

  const stockColumns: TableColumn<StockItem>[] = [
    {
      key: 'material.codigo',
      title: 'Código',
      sortable: true,
      render: (value: string, item: StockItem) => (
        <span className="font-mono text-sm">{item.material?.codigo}</span>
      )
    },
    {
      key: 'material.nombre',
      title: 'Material',
      sortable: true,
      render: (value: string, item: StockItem) => (
        <div>
          <div className="font-medium">{item.material?.descripcion}</div>
          <div className="text-sm text-gray-500">{item.material?.descripcion}</div>
        </div>
      )
    },
    {
      key: 'obra.nombre',
      title: 'Obra',
      sortable: true,
      render: (value: string, item: StockItem) => (
        <span className="text-sm">{item.obra?.nombre}</span>
      )
    },
    {
      key: 'cantidad_actual',
      title: 'Stock Actual',
      sortable: true,
      render: (value: number, item: StockItem) => (
        <span className={`font-semibold ${
          item.cantidad_actual <= item.cantidad_minima ? 'text-red-600' : 'text-green-600'
        }`}>
          {item.cantidad_actual as number} {item.material?.unidad}
        </span>
      )
    },
    {
      key: 'cantidad_minima',
      title: 'Stock Mínimo',
      sortable: true,
      render: (value: number, item: StockItem) => (
        <span className="text-gray-600">{item.cantidad_minima as number} {item.material?.unidad}</span>
      )
    },
    {
      key: 'ubicacion',
      title: 'Ubicación',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm">{value || 'No especificada'}</span>
      )
    },
    {
      key: 'estado',
      title: 'Estado',
      sortable: false,
      render: (value: string, item: StockItem) => {
        const isLow = item.cantidad_actual <= item.cantidad_minima
        const isEmpty = item.cantidad_actual === 0
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            isEmpty ? 'bg-red-100 text-red-800' :
            isLow ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {isEmpty ? 'Sin Stock' : isLow ? 'Stock Bajo' : 'Normal'}
          </span>
        )
      }
    }
  ]

  const kardexColumns: TableColumn<KardexMovimiento>[] = [
    {
      key: 'fecha_movimiento',
      title: 'Fecha',
      dataIndex: 'fecha_movimiento',
      render: (value: string) => {
        if (!value) return '-'
        const date = new Date(value)
        if (isNaN(date.getTime())) return '-'
        return format(date, 'dd/MM/yyyy HH:mm', { locale: es })
      },
      sortable: true
    },
    {
      key: 'tipo_movimiento',
      title: 'Tipo',
      dataIndex: 'tipo_movimiento',
      render: (value: 'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA' | string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'ENTRADA' ? 'bg-green-100 text-green-800' :
          value === 'SALIDA' ? 'bg-red-100 text-red-800' :
          value === 'TRANSFERENCIA' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'cantidad',
      title: 'Cantidad',
      dataIndex: 'cantidad'
    },
    {
      key: 'cantidad_nueva',
      title: 'Saldo Actual',
      dataIndex: 'cantidad_nueva'
    },
    {
      key: 'referencia',
      title: 'Referencia',
      dataIndex: 'referencia'
    },
    {
      key: 'observaciones',
      title: 'Observaciones',
      dataIndex: 'observaciones'
    }
  ]

  if (loading && stockItems.length === 0 && kardexMovimientos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock y Kardex</h1>
          <p className="text-gray-600">Consulta de stock actual y historial de movimientos</p>
        </div>
      </div>

      {/* Resumen de Stock */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CubeIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Materiales</p>
              <p className="text-2xl font-bold text-gray-900">{stockSummary.total_materiales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CubeIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-bold text-yellow-600">{stockSummary.stock_bajo}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <CubeIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sin Stock</p>
              <p className="text-2xl font-bold text-red-600">{stockSummary.sin_stock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 font-bold text-lg">S/</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Valor Total</p>
              <p className="text-2xl font-bold text-green-600">
                {stockSummary.valor_total.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('stock')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stock'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CubeIcon className="h-5 w-5 inline mr-2" />
              Stock Actual
            </button>
            <button
              onClick={() => setActiveTab('kardex')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'kardex'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ClockIcon className="h-5 w-5 inline mr-2" />
              Kardex de Movimientos
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'stock' ? (
            <div className="space-y-6">
              {/* Filtros de Stock */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <FunnelIcon className="h-5 w-5 mr-2" />
                    Filtros
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearStockFilters}
                  >
                    Limpiar
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    placeholder="Buscar material..."
                    value={stockFilters.busqueda}
                    onChange={(e) => handleStockFilterChange('busqueda', e.target.value)}
                    leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
                  />
                  
                  <Select
                    value={stockFilters.obra_id}
                    onChange={(e) => handleStockFilterChange('obra_id', e.target.value)}
                    options={[
                      { value: '', label: 'Todas las obras' },
                      ...obras.map(obra => ({ value: obra.id, label: obra.nombre }))
                    ]}
                  />
                  
                  <Select
                    value={stockFilters.categoria}
                    onChange={(e) => handleStockFilterChange('categoria', e.target.value)}
                    options={[
                      { value: '', label: 'Todas las categorías' },
                      { value: 'HERRAMIENTAS', label: 'Herramientas' },
                      { value: 'MATERIALES', label: 'Materiales' },
                      { value: 'EQUIPOS', label: 'Equipos' },
                      { value: 'CONSUMIBLES', label: 'Consumibles' }
                    ]}
                  />
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="stock_bajo"
                      checked={stockFilters.stock_bajo}
                      onChange={(e) => handleStockFilterChange('stock_bajo', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="stock_bajo" className="ml-2 text-sm text-gray-700">
                      Solo stock bajo
                    </label>
                  </div>
                </div>
              </div>

              {/* Tabla de Stock */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Stock Actual ({stockItems.length} materiales)
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {}}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <Table
                    columns={stockColumns}
                    data={stockItems}
                    emptyText="No se encontraron materiales en stock"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filtros de Kardex */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <FunnelIcon className="h-5 w-5 mr-2" />
                    Filtros
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearKardexFilters}
                  >
                    Limpiar
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Select
                    value={kardexFilters.obra_id}
                    onChange={(e) => handleKardexFilterChange('obra_id', e.target.value)}
                    options={[
                      { value: '', label: 'Todas las obras' },
                      ...obras.map(obra => ({ value: obra.id, label: obra.nombre }))
                    ]}
                  />
                  
                  <Select
                    value={kardexFilters.tipo_movimiento}
                    onChange={(e) => handleKardexFilterChange('tipo_movimiento', e.target.value)}
                    options={[
                      { value: '', label: 'Todos los movimientos' },
                      { value: 'ENTRADA', label: 'Entradas' },
                      { value: 'SALIDA', label: 'Salidas' },
                      { value: 'TRANSFERENCIA', label: 'Transferencias' },
                      { value: 'AJUSTE', label: 'Ajustes' }
                    ]}
                  />
                  
                  <Input
                    type="date"
                    placeholder="Fecha desde"
                    value={kardexFilters.fecha_desde}
                    onChange={(e) => handleKardexFilterChange('fecha_desde', e.target.value)}
                  />
                  
                  <Input
                    type="date"
                    placeholder="Fecha hasta"
                    value={kardexFilters.fecha_hasta}
                    onChange={(e) => handleKardexFilterChange('fecha_hasta', e.target.value)}
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {}}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>

              {/* Tabla de Kardex */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Historial de Movimientos ({kardexMovimientos.length} registros)
                </h3>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <Table
                    columns={kardexColumns}
                    data={kardexMovimientos}
                    emptyText="No se encontraron movimientos"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}