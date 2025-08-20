import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import { solicitudesCompraService } from '../services/solicitudesCompra'
import { obrasService } from '../services/obras'
import { SolicitudCompra, SolicitudCompraFormData, Obra, TableColumn } from '../types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { CustomModal as Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '../components/ui/modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toast } from 'sonner'

const ESTADOS_SOLICITUD_COMPRA = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'APROBADA', label: 'Aprobada' },
  { value: 'RECHAZADA', label: 'Rechazada' },
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'COMPLETADA', label: 'Completada' }
]

export default function SolicitudesCompra() {
  const { user } = useAuth()
  const [solicitudesCompra, setSolicitudesCompra] = useState<SolicitudCompra[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSolicitud, setEditingSolicitud] = useState<SolicitudCompra | null>(null)
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
  const [formData, setFormData] = useState<SolicitudCompraFormData>({
    sc_numero: '',
    obra_id: '',
    proveedor: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    fecha_entrega: '',
    estado: 'PENDIENTE',
    total: 0,
    observaciones: ''
  })

  // Definir columnas de la tabla
  const columns: TableColumn<SolicitudCompra>[] = [
    {
      key: 'sc_numero',
      title: 'N° SC',
      sortable: true,
      render: (value: string, item: SolicitudCompra) => (
        <span className="font-mono text-sm">{item.sc_numero}</span>
      )
    },
    {
      key: 'fecha_solicitud',
      title: 'Fecha Solicitud',
      sortable: true,
      render: (value: string, item: SolicitudCompra) => {
        if (!item.fecha_solicitud) return '-'
        const date = new Date(item.fecha_solicitud)
        if (isNaN(date.getTime())) return '-'
        return format(date, 'dd/MM/yyyy', { locale: es })
      }
    },
    {
      key: 'proveedor',
      title: 'Proveedor',
      sortable: true,
      render: (value: string, item: SolicitudCompra) => (
        <div className="max-w-xs truncate" title={item.proveedor}>
          {item.proveedor}
        </div>
      )
    },
    {
      key: 'fecha_entrega',
      title: 'Fecha Entrega',
      sortable: true,
      render: (value: string, item: SolicitudCompra) => {
        if (!item.fecha_entrega) return '-'
        const date = new Date(item.fecha_entrega)
        if (isNaN(date.getTime())) return '-'
        return format(date, 'dd/MM/yyyy', { locale: es })
      }
    },
    {
      key: 'total',
      title: 'Total',
      sortable: true,
      render: (value: number, item: SolicitudCompra) => (
        <div className="text-right">
          <span className="font-medium">
            S/ {item.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )
    },
    {
      key: 'estado',
      title: 'Estado',
      sortable: true,
      render: (value: string, item: SolicitudCompra) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          item.estado === 'PROCESADO' ? 'bg-green-100 text-green-800' :
          item.estado === 'APROBADO' ? 'bg-blue-100 text-blue-800' :
          item.estado === 'RECHAZADO' ? 'bg-red-100 text-red-800' :
          item.estado === 'CANCELADO' ? 'bg-gray-100 text-gray-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {item.estado}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Acciones',
      render: (value: unknown, item: SolicitudCompra) => (
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

  const loadSolicitudesCompra = useCallback(async () => {
    try {
      const data = await solicitudesCompraService.getAll()
      setSolicitudesCompra(data)
    } catch (error) {
      console.error('Error al cargar solicitudes de compra:', error)
    }
  }, [filters])

  const loadObras = useCallback(async () => {
    try {
      const data = await obrasService.getAll()
      setObras(data)
    } catch (error) {
      console.error('Error al cargar obras:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        loadSolicitudesCompra(),
        loadObras()
      ])
      setLoading(false)
    }
    loadData()
  }, [loadSolicitudesCompra, loadObras])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSolicitud) {
        await solicitudesCompraService.update(editingSolicitud.id, formData)
        toast.success('Solicitud de compra actualizada correctamente')
      } else {
        await solicitudesCompraService.create(formData)
        toast.success('Solicitud de compra creada correctamente')
      }
      setShowModal(false)
      resetForm()
      loadSolicitudesCompra()
    } catch (error) {
      console.error('Error al guardar solicitud de compra:', error)
      toast.error('Error al guardar la solicitud de compra')
    }
  }

  const handleEdit = (solicitud: SolicitudCompra) => {
    setEditingSolicitud(solicitud)
    setFormData({
      sc_numero: solicitud.sc_numero,
      obra_id: solicitud.obra_id,
      proveedor: solicitud.proveedor,
      fecha_solicitud: solicitud.fecha_solicitud,
      fecha_entrega: solicitud.fecha_entrega || '',
      estado: solicitud.estado,
      total: solicitud.total,
      observaciones: solicitud.observaciones || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta solicitud de compra?')) {
      try {
        await solicitudesCompraService.delete(id)
        toast.success('Solicitud de compra eliminada correctamente')
        loadSolicitudesCompra()
      } catch (error) {
        console.error('Error al eliminar solicitud de compra:', error)
        toast.error('Error al eliminar la solicitud de compra')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      sc_numero: '',
      obra_id: '',
      proveedor: '',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      fecha_entrega: '',
      estado: 'PENDIENTE',
      total: 0,
      observaciones: ''
    })
    setEditingSolicitud(null)
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
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Compra</h1>
          <p className="text-gray-600">Gestión de solicitudes de compra (SC) - Módulo de Logística</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nueva Solicitud</span>
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
                placeholder="Buscar por número SC o proveedor..."
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
            {solicitudesCompra.length} solicitud(es) de compra
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
              options={ESTADOS_SOLICITUD_COMPRA}
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
          data={solicitudesCompra}
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
        title={editingSolicitud ? 'Editar Solicitud de Compra' : 'Nueva Solicitud de Compra'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Número SC"
              type="text"
              value={formData.sc_numero}
              onChange={(e) => setFormData({ ...formData, sc_numero: e.target.value })}
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
              label="Fecha Solicitud"
              type="date"
              value={formData.fecha_solicitud}
              onChange={(e) => setFormData({ ...formData, fecha_solicitud: e.target.value })}
              required
            />
            <Input
              label="Fecha Entrega"
              type="date"
              value={formData.fecha_entrega}
              onChange={(e) => setFormData({ ...formData, fecha_entrega: e.target.value })}
            />
            <Select
              label="Estado"
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
              options={ESTADOS_SOLICITUD_COMPRA.filter(e => e.value !== '')}
              required
            />
            <Input
              label="Total"
              type="number"
              step="0.01"
              value={formData.total}
              onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
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
              {editingSolicitud ? 'Actualizar' : 'Crear'} Solicitud
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}