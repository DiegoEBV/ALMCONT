import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { ordenesCompraService } from '../services/ordenesCompra'
import { solicitudesCompraService } from '../services/solicitudesCompra'
import { obrasService } from '../services/obras'
import { OrdenCompra, OrdenCompraFormData, Obra, SolicitudCompra, TableColumn } from '../types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Table } from '../components/ui/table'
import { CustomModal as Modal } from '../components/ui/modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toast } from 'sonner'

const ESTADOS_ORDEN_COMPRA = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'APROBADA', label: 'Aprobada' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'RECIBIDA', label: 'Recibida' },
  { value: 'CANCELADA', label: 'Cancelada' }
]

const MONEDAS = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' }
]

export default function OrdenesCompra() {
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [solicitudesCompra, setSolicitudesCompra] = useState<SolicitudCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOrden, setEditingOrden] = useState<OrdenCompra | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Estados de filtros
  const [filters, setFilters] = useState({
    busqueda: '',
    obra_id: '',
    estado: '',
    proveedor: '',
    fecha_desde: '',
    fecha_hasta: ''
  })

  // Estados del formulario
  const [formData, setFormData] = useState<OrdenCompraFormData>({
    oc_numero: '',
    sc_id: '',
    obra_id: '',
    proveedor: '',
    fecha_orden: new Date().toISOString().split('T')[0],
    fecha_entrega_estimada: '',
    estado: 'PENDIENTE',
    subtotal: 0,
    igv: 0,
    total: 0,
    moneda: 'PEN',
    condiciones_pago: '',
    observaciones: ''
  })

  // Definir columnas de la tabla
  const columns: TableColumn<OrdenCompra>[] = [
    {
      key: 'oc_numero',
      title: 'N° OC',
      sortable: true,
      render: (value: string, item: OrdenCompra) => (
        <span className="font-mono text-sm">{item.oc_numero}</span>
      )
    },
    {
      key: 'fecha_orden',
      title: 'Fecha Orden',
      sortable: true,
      render: (value: string, item: OrdenCompra) => {
        if (!item.fecha_orden) return '-'
        const date = new Date(item.fecha_orden)
        if (isNaN(date.getTime())) return '-'
        return format(date, 'dd/MM/yyyy', { locale: es })
      }
    },
    {
      key: 'proveedor',
      title: 'Proveedor',
      sortable: true,
      render: (value: string, item: OrdenCompra) => (
        <div className="max-w-xs truncate" title={item.proveedor}>
          {item.proveedor}
        </div>
      )
    },
    {
      key: 'total',
      title: 'Total',
      sortable: true,
      render: (value: number, item: OrdenCompra) => (
        <div className="text-right">
          <span className="font-medium">
            {item.moneda} {item.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )
    },
    {
      key: 'estado',
      title: 'Estado',
      sortable: true,
      render: (value: string, item: OrdenCompra) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          item.estado === 'RECIBIDA' ? 'bg-green-100 text-green-800' :
          item.estado === 'ENVIADA' ? 'bg-blue-100 text-blue-800' :
          item.estado === 'APROBADA' ? 'bg-yellow-100 text-yellow-800' :
          item.estado === 'CANCELADA' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {item.estado}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Acciones',
      render: (value: unknown, item: OrdenCompra) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(item)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(item.id)}
          >
            Eliminar
          </Button>
        </div>
      )
    }
  ]

  const loadOrdenesCompra = useCallback(async () => {
    try {
      const data = await ordenesCompraService.getAll()
      setOrdenesCompra(data)
    } catch (error) {
      console.error('Error al cargar órdenes de compra:', error)
    }
  }, [])

  const loadObras = useCallback(async () => {
    try {
      const data = await obrasService.getAll()
      setObras(data)
    } catch (error) {
      console.error('Error al cargar obras:', error)
    }
  }, [])

  const loadSolicitudesCompra = useCallback(async () => {
    try {
      const data = await solicitudesCompraService.getAll()
      setSolicitudesCompra(data)
    } catch (error) {
      console.error('Error al cargar solicitudes de compra:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        loadOrdenesCompra(),
        loadObras(),
        loadSolicitudesCompra()
      ])
      setLoading(false)
    }
    loadData()
  }, [loadOrdenesCompra, loadObras, loadSolicitudesCompra])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingOrden) {
        await ordenesCompraService.update(editingOrden.id, formData)
        toast.success('Orden de compra actualizada correctamente')
      } else {
        await ordenesCompraService.create(formData)
        toast.success('Orden de compra creada correctamente')
      }
      setShowModal(false)
      resetForm()
      loadOrdenesCompra()
    } catch (error) {
      console.error('Error al guardar orden de compra:', error)
      toast.error('Error al guardar la orden de compra')
    }
  }

  const handleEdit = (orden: OrdenCompra) => {
    setEditingOrden(orden)
    setFormData({
      oc_numero: orden.oc_numero,
      sc_id: orden.sc_id,
      obra_id: orden.obra_id,
      proveedor: orden.proveedor,
      fecha_orden: orden.fecha_orden,
      fecha_entrega_estimada: orden.fecha_entrega_estimada || '',
      estado: orden.estado,
      subtotal: orden.subtotal,
      igv: orden.igv,
      total: orden.total,
      moneda: orden.moneda,
      condiciones_pago: orden.condiciones_pago || '',
      observaciones: orden.observaciones || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta orden de compra?')) {
      try {
        await ordenesCompraService.delete(id)
        toast.success('Orden de compra eliminada correctamente')
        loadOrdenesCompra()
      } catch (error) {
        console.error('Error al eliminar orden de compra:', error)
        toast.error('Error al eliminar la orden de compra')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      oc_numero: '',
      sc_id: '',
      obra_id: '',
      proveedor: '',
      fecha_orden: new Date().toISOString().split('T')[0],
      fecha_entrega_estimada: '',
      estado: 'PENDIENTE',
      subtotal: 0,
      igv: 0,
      total: 0,
      moneda: 'PEN',
      condiciones_pago: '',
      observaciones: ''
    })
    setEditingOrden(null)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      busqueda: '',
      obra_id: '',
      estado: '',
      proveedor: '',
      fecha_desde: '',
      fecha_hasta: ''
    })
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h1>
          <p className="text-gray-600">Gestión de órdenes de compra formales con proveedores</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nueva Orden</span>
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por número OC o proveedor..."
                value={filters.busqueda}
                onChange={(e) => handleFilterChange('busqueda', e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filtros</span>
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            {ordenesCompra.length} orden(es) de compra
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t">
            <Select
              label="Obra"
              value={filters.obra_id}
              onChange={(e) => handleFilterChange('obra_id', e.target.value)}
              options={[
                { value: '', label: 'Todas las obras' },
                ...obras.map(obra => ({ value: obra.id, label: obra.nombre }))
              ]}
            />
            <Select
              label="Estado"
              value={filters.estado}
              onChange={(e) => handleFilterChange('estado', e.target.value)}
              options={ESTADOS_ORDEN_COMPRA}
            />
            <Input
              label="Proveedor"
              type="text"
              value={filters.proveedor}
              onChange={(e) => handleFilterChange('proveedor', e.target.value)}
              placeholder="Filtrar por proveedor"
            />
            <Input
              label="Fecha desde"
              type="date"
              value={filters.fecha_desde}
              onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
            />
            <Input
              label="Fecha hasta"
              type="date"
              value={filters.fecha_hasta}
              onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
            />
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow">
        <Table
          columns={columns}
          data={ordenesCompra}
          loading={loading}
        />
      </div>

      {/* Modal de formulario */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        title={editingOrden ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Número OC"
              type="text"
              value={formData.oc_numero}
              onChange={(e) => setFormData({ ...formData, oc_numero: e.target.value })}
              required
            />
            <Select
              label="Solicitud de Compra"
              value={formData.sc_id}
              onChange={(e) => setFormData({ ...formData, sc_id: e.target.value })}
              options={[
                { value: '', label: 'Seleccionar SC' },
                ...solicitudesCompra.map(sc => ({ value: sc.id, label: `${sc.sc_numero} - ${sc.proveedor}` }))
              ]}
              required
            />
            <Select
              label="Obra"
              value={formData.obra_id}
              onChange={(e) => setFormData({ ...formData, obra_id: e.target.value })}
              options={[
                { value: '', label: 'Seleccionar obra' },
                ...obras.map(obra => ({ value: obra.id, label: obra.nombre }))
              ]}
              required
            />
            <Input
              label="Proveedor"
              type="text"
              value={formData.proveedor}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              required
            />
            <Input
              label="Fecha Orden"
              type="date"
              value={formData.fecha_orden}
              onChange={(e) => setFormData({ ...formData, fecha_orden: e.target.value })}
              required
            />
            <Input
              label="Fecha Entrega Estimada"
              type="date"
              value={formData.fecha_entrega_estimada}
              onChange={(e) => setFormData({ ...formData, fecha_entrega_estimada: e.target.value })}
            />
            <Select
              label="Estado"
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'PENDIENTE' | 'APROBADA' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA' })}
              options={ESTADOS_ORDEN_COMPRA.filter(e => e.value !== '')}
              required
            />
            <Select
              label="Moneda"
              value={formData.moneda}
              onChange={(e) => setFormData({ ...formData, moneda: e.target.value as 'PEN' | 'USD' })}
              options={MONEDAS}
              required
            />
            <Input
              label="Subtotal"
              type="number"
              step="0.01"
              value={formData.subtotal}
              onChange={(e) => {
                const subtotal = parseFloat(e.target.value) || 0
                const igv = subtotal * 0.18
                const total = subtotal + igv
                setFormData({ 
                  ...formData, 
                  subtotal,
                  igv,
                  total
                })
              }}
              required
            />
            <Input
              label="IGV (18%)"
              type="number"
              step="0.01"
              value={formData.igv}
              readOnly
            />
            <Input
              label="Total"
              type="number"
              step="0.01"
              value={formData.total}
              readOnly
            />
          </div>
          <Input
            label="Condiciones de Pago"
            type="text"
            value={formData.condiciones_pago}
            onChange={(e) => setFormData({ ...formData, condiciones_pago: e.target.value })}
            placeholder="Ej: 30 días, Contado, etc."
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Observaciones adicionales..."
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingOrden ? 'Actualizar' : 'Crear'} Orden
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}