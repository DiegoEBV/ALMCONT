import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { Eye, Edit, Trash2 } from 'lucide-react'
import { solicitudesCompraService, RqScService } from '../services/solicitudesCompra'
import { obrasService } from '../services/obras'
import { requerimientosService } from '../services/requerimientos'
import { useAuth } from '../hooks/useAuth'
import { SolicitudCompra, SolicitudCompraFormData, Obra, TableColumn, Requerimiento, Material } from '../types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Table } from '../components/ui/table'
import { CustomModal as Modal } from '../components/ui/modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toast } from 'sonner'


const ESTADOS_SOLICITUD_COMPRA = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'APROBADO', label: 'Aprobado' },
  { value: 'RECHAZADO', label: 'Rechazado' },
  { value: 'PROCESADO', label: 'Procesado' },
  { value: 'CANCELADO', label: 'Cancelado' }
]

export default function SolicitudesCompra() {
  const { user } = useAuth()
  const [solicitudesCompra, setSolicitudesCompra] = useState<SolicitudCompra[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([])
  const [selectedRequerimientos, setSelectedRequerimientos] = useState<string[]>([])
  const [materialesDisponibles, setMaterialesDisponibles] = useState<Material[]>([])
  const [selectedMateriales, setSelectedMateriales] = useState<{[key: string]: boolean}>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSolicitud, setEditingSolicitud] = useState<SolicitudCompra | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Estados de filtros
  const [filters, setFilters] = useState({
    busqueda: '',
    obra_id: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: ''
  })

  // Estados del formulario
  const [formData, setFormData] = useState<SolicitudCompraFormData>({
    obra_id: '',
    numero_sc: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    fecha_entrega: '',
    estado: 'PENDIENTE',
    observaciones: ''
  })

  // Definir columnas de la tabla
  const columns: TableColumn<SolicitudCompra>[] = [
    {
      key: 'numero_sc',
      title: 'N° SC',
      sortable: true,
      render: (value: string, item: SolicitudCompra) => (
        <span className="font-mono text-sm">{item.numero_sc}</span>
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
      key: 'requerimientos',
      title: 'Requerimientos',
      render: (value: unknown, item: SolicitudCompra) => (
        <div className="max-w-xs">
          {item.requerimientos && item.requerimientos.length > 0 ? (
            <div className="space-y-1">
              {item.requerimientos.slice(0, 2).map((req, index) => (
                <div key={req.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {req.codigo}
                </div>
              ))}
              {item.requerimientos.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{item.requerimientos.length - 2} más
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400">Sin requerimientos</span>
          )}
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
            onClick={() => {
              // Mostrar detalles para todos los usuarios
              console.log('Ver detalles:', item)
            }}
          >
            <Eye className="w-4 h-4 mr-1" />
            Ver
          </Button>
          {user?.rol === 'COORDINACION' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(item)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
            </>
          )}
        </div>
      )
    }
  ]

  const loadSolicitudesCompra = useCallback(async () => {
    try {
      console.log('🔍 Cargando solicitudes de compra...')
      console.log('👤 Usuario actual:', user)
      const data = await solicitudesCompraService.getAll()
      console.log('✅ Solicitudes obtenidas:', data.length, data)
      setSolicitudesCompra(data)
    } catch (error) {
      console.error('❌ Error al cargar solicitudes de compra:', error)
      toast.error('Error al cargar las solicitudes de compra')
    }
  }, [user])

  const loadObras = useCallback(async () => {
    try {
      const data = await obrasService.getAll()
      setObras(data)
    } catch (error) {
      console.error('Error al cargar obras:', error)
    }
  }, [])

  const loadRequerimientos = useCallback(async () => {
    try {
      const data = await requerimientosService.getAll({ estado: 'PENDIENTE' })
      setRequerimientos(data)
    } catch (error) {
      console.error('Error al cargar requerimientos:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        loadSolicitudesCompra(),
        loadObras(),
        loadRequerimientos()
      ])
      setLoading(false)
    }
    loadData()
  }, [loadSolicitudesCompra, loadObras, loadRequerimientos])

  // Actualizar materiales disponibles cuando se seleccionan requerimientos
  useEffect(() => {
    const materiales: Material[] = []
    selectedRequerimientos.forEach(reqId => {
      const requerimiento = requerimientos.find(r => r.id === reqId)
      if (requerimiento?.materiales) {
        materiales.push(...requerimiento.materiales)
      }
    })
    setMaterialesDisponibles(materiales)
  }, [selectedRequerimientos, requerimientos])



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSolicitud) {
        await solicitudesCompraService.update(editingSolicitud.id, formData)
        toast.success('Solicitud de compra actualizada correctamente')
      } else {
        const nuevaSolicitud = await solicitudesCompraService.create(formData)
        
        // Asociar requerimientos seleccionados si es una nueva solicitud
        if (selectedRequerimientos.length > 0) {
          await RqScService.asociarRequerimientos(nuevaSolicitud.id, selectedRequerimientos)
        }
        
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
    // Solo permitir edición a usuarios COORDINACION
    if (user?.rol !== 'COORDINACION') {
      toast.error('No tienes permisos para editar solicitudes de compra')
      return
    }
    
    setEditingSolicitud(solicitud)
    setFormData({
        obra_id: solicitud.obra_id,
        numero_sc: solicitud.numero_sc,
        fecha_solicitud: solicitud.fecha_solicitud,
        fecha_entrega: solicitud.fecha_entrega || '',
        estado: solicitud.estado,
        observaciones: solicitud.observaciones || ''
      })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    // Solo permitir eliminación a usuarios COORDINACION
    if (user?.rol !== 'COORDINACION') {
      toast.error('No tienes permisos para eliminar solicitudes de compra')
      return
    }
    
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
      obra_id: '',
      numero_sc: '',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      fecha_entrega: '',
      estado: 'PENDIENTE',
      observaciones: ''
    })
    setSelectedRequerimientos([])
    setMaterialesDisponibles([])
    setSelectedMateriales({})
    setEditingSolicitud(null)
  }

  const handleRequerimientoSelection = (requerimientoId: string, selected: boolean) => {
    if (selected) {
      setSelectedRequerimientos(prev => [...prev, requerimientoId])
    } else {
      setSelectedRequerimientos(prev => prev.filter(id => id !== requerimientoId))
      // Limpiar materiales seleccionados de este requerimiento
      const requerimiento = requerimientos.find(r => r.id === requerimientoId)
      if (requerimiento?.materiales) {
        const newSelectedMateriales = { ...selectedMateriales }
        requerimiento.materiales.forEach(material => {
          delete newSelectedMateriales[material.id]
        })
        setSelectedMateriales(newSelectedMateriales)
      }
    }
  }

  const handleMaterialSelection = (materialId: string, selected: boolean) => {
    setSelectedMateriales(prev => ({
      ...prev,
      [materialId]: selected
    }))
  }



  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      busqueda: '',
      obra_id: '',
      estado: '',
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
        {user?.rol === 'COORDINACION' && (
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
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por número SC..."
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección 1: Datos básicos */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Datos Básicos de la Solicitud</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Número SC"
                type="text"
                value={formData.numero_sc}
                onChange={(e) => setFormData({ ...formData, numero_sc: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'PROCESADO' | 'CANCELADO' })}
                options={ESTADOS_SOLICITUD_COMPRA.filter(e => e.value !== '')}
                required
              />
            </div>
            <div className="mt-4">
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
          </div>

          {/* Sección 2: Selección de requerimientos */}
          {!editingSolicitud && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Seleccionar Requerimientos</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {requerimientos.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay requerimientos pendientes disponibles</p>
                ) : (
                  requerimientos.map(requerimiento => (
                    <div key={requerimiento.id} className="flex items-center space-x-3 p-2 bg-white rounded border">
                      <input
                        type="checkbox"
                        id={`req-${requerimiento.id}`}
                        checked={selectedRequerimientos.includes(requerimiento.id)}
                        onChange={(e) => handleRequerimientoSelection(requerimiento.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`req-${requerimiento.id}`} className="flex-1 text-sm">
                        <div className="font-medium">{requerimiento.codigo}</div>
                        <div className="text-gray-500">{requerimiento.descripcion}</div>
                        <div className="text-xs text-gray-400">
                          {requerimiento.materiales?.length || 0} material(es)
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Sección 3: Selección de materiales */}
          {!editingSolicitud && materialesDisponibles.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Seleccionar Materiales</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {materialesDisponibles.map(material => (
                  <div key={material.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`mat-${material.id}`}
                        checked={selectedMateriales[material.id] || false}
                        onChange={(e) => handleMaterialSelection(material.id, e.target.checked)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`mat-${material.id}`} className="text-sm">
                        <div className="font-medium">{material.codigo}</div>
                        <div className="text-gray-500">{material.descripcion}</div>
                        <div className="text-xs text-gray-400">
                          Cantidad: {material.cantidad} {material.unidad}
                        </div>
                      </label>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">
                        S/ {material.precio_unitario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


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