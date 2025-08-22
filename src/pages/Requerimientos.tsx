import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ArrowDownTrayIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import { requerimientosService } from '../services/requerimientos'
import { obrasService } from '../services/obras'
import { materialesService } from '../services/materiales'
import { Requerimiento, Obra, Material, RequerimientoFormData, RequerimientoFilters, TableColumn } from '../types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { CustomModal as Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '../components/ui/modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ExcelImport from '../components/ExcelImport'
import { toast } from 'sonner'

const ESTADOS_REQUERIMIENTO = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'ASIGNADO', label: 'Asignado' },
  { value: 'ATENDIDO', label: 'Atendido' },
  { value: 'CANCELADO', label: 'Cancelado' }
]

const PRIORIDADES: { value: string; label: string }[] = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' }
]

export default function Requerimientos() {
  const { user } = useAuth()
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRequerimiento, setEditingRequerimiento] = useState<Requerimiento | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Estados de filtros
  const [filters, setFilters] = useState({
    busqueda: '',
    empresa: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: ''
  })

  // Estados del formulario
  const [formData, setFormData] = useState<RequerimientoFormData>({
    bloque: '',
    empresa: '',
    tipo: '',
    material_nombre: '',
    descripcion: '',
    numero_requerimiento: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    fecha_atencion: '',
    unidad: '',
    cantidad: 0,
    cantidad_atendida: 0,
    solicitante: '',
    numero_solicitud_compra: '',
    orden_compra: '',
    proveedor: '',
    estado: 'PENDIENTE',
    observaciones: '',
    precio_unitario: 0,
    subtotal: 0
  })

  // Definir columnas de la tabla
  const columns: TableColumn<Requerimiento>[] = [
    {
      key: 'numero_requerimiento',
      title: 'N° Requerimiento',
      sortable: true,
      render: (value: string, item: Requerimiento) => (
        <span className="font-mono text-sm">{item.numero_requerimiento || item.numero_rq}</span>
      )
    },
    {
      key: 'empresa',
      title: 'Empresa',
      sortable: true,
      render: (value: string, item: Requerimiento) => (
        <span className="text-sm">{item.empresa || '-'}</span>
      )
    },
    {
      key: 'material',
      title: 'Material',
      render: (value: string, item: Requerimiento) => (
        <div>
          <div className="font-medium">{item.material?.nombre || '-'}</div>
          <div className="text-sm text-gray-500">{item.descripcion || ''}</div>
        </div>
      )
    },
    {
      key: 'cantidad',
      title: 'Cantidad',
      sortable: true,
      render: (value: number, item: Requerimiento) => (
        <div className="text-right">
          <span className="font-medium">{item.cantidad || item.cantidad_solicitada || 0}</span>
          <span className="text-sm text-gray-500 ml-1">{item.unidad || ''}</span>
        </div>
      )
    },
    {
      key: 'cantidad_atendida',
      title: 'Cant. Atendida',
      sortable: true,
      render: (value: number, item: Requerimiento) => (
        <div className="text-right">
          <span className="font-medium">{item.cantidad_atendida || 0}</span>
          <span className="text-sm text-gray-500 ml-1">{item.unidad}</span>
        </div>
      )
    },
    {
      key: 'proveedor',
      title: 'Proveedor',
      sortable: true,
      render: (value: string, item: Requerimiento) => (
        <span className="text-sm">{item.proveedor || '-'}</span>
      )
    },
    {
      key: 'estado',
      title: 'Estado',
      sortable: true,
      render: (value: string, item: Requerimiento) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          item.estado === 'ATENDIDO' ? 'bg-green-100 text-green-800' :
          item.estado === 'ASIGNADO' ? 'bg-blue-100 text-blue-800' :
          item.estado === 'CANCELADO' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {item.estado}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Acciones',
      render: (value: unknown, item: Requerimiento) => (
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

  const loadRequerimientos = useCallback(async () => {
    try {
      console.log('Cargando requerimientos con filtros:', filters)
      const data = await requerimientosService.getAll(filters)
      console.log('Requerimientos cargados:', data.length, 'registros')
      console.log('Datos recibidos:', data)
      setRequerimientos(data)
    } catch (error) {
      console.error('Error detallado al cargar requerimientos:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(`Error al cargar requerimientos: ${errorMessage}`)
      setRequerimientos([])
    }
  }, [filters])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [obrasData, materialesData] = await Promise.all([
        obrasService.getAll(),
        materialesService.getAll()
      ])
      
      setObras(obrasData)
      setMateriales(materialesData)
      
      await loadRequerimientos()
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }, [loadRequerimientos])

  // Cargar datos iniciales
  useEffect(() => {
    loadData()
  }, [loadData])

  // Aplicar filtros cuando cambien
  useEffect(() => {
    loadRequerimientos()
  }, [loadRequerimientos])

  // Efecto para calcular subtotal automáticamente
  useEffect(() => {
    const cantidad = formData.cantidad || 0;
    const precioUnitario = formData.precio_unitario || 0;
    const subtotal = cantidad * precioUnitario;
    
    if (subtotal !== formData.subtotal) {
      setFormData(prev => ({ ...prev, subtotal }));
    }
  }, [formData.cantidad, formData.precio_unitario, formData.subtotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      console.log('Iniciando guardado de requerimiento:', formData)
      
      if (editingRequerimiento) {
        console.log('Actualizando requerimiento existente:', editingRequerimiento.id)
        await requerimientosService.update(editingRequerimiento.id, formData)
        toast.success('Requerimiento actualizado exitosamente')
      } else {
        console.log('Creando nuevo requerimiento')
        const result = await requerimientosService.create(formData)
        console.log('Requerimiento creado:', result)
        toast.success('Requerimiento creado exitosamente')
      }
      
      setShowModal(false)
      setEditingRequerimiento(null)
      resetForm()
      
      console.log('Recargando lista de requerimientos...')
      await loadRequerimientos()
      console.log('Lista de requerimientos recargada')
    } catch (error) {
      console.error('Error detallado al guardar requerimiento:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(`Error al guardar requerimiento: ${errorMessage}`)
    }
  }

  const handleEdit = (requerimiento: Requerimiento) => {
    setEditingRequerimiento(requerimiento)
    setFormData({
      bloque: requerimiento.bloque || '',
      empresa: requerimiento.empresa || '',
      tipo: requerimiento.tipo || '',
      material_nombre: requerimiento.material_nombre || '',
      descripcion: requerimiento.descripcion || '',
      numero_requerimiento: requerimiento.numero_requerimiento || '',
      fecha_solicitud: requerimiento.fecha_solicitud?.split('T')[0] || '',
      fecha_atencion: requerimiento.fecha_atencion?.split('T')[0] || '',
      unidad: requerimiento.unidad || '',
      cantidad: requerimiento.cantidad || 0,
      cantidad_atendida: requerimiento.cantidad_atendida || 0,
      solicitante: requerimiento.solicitante || '',
      numero_solicitud_compra: requerimiento.numero_solicitud_compra || '',
      orden_compra: requerimiento.orden_compra || '',
      proveedor: requerimiento.proveedor || '',
      estado: requerimiento.estado,
      observaciones: requerimiento.observaciones || '',
      precio_unitario: requerimiento.precio_unitario || 0,
      subtotal: requerimiento.subtotal || 0
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este requerimiento?')) {
      try {
        await requerimientosService.delete(id)
        await loadRequerimientos()
      } catch (error) {
        console.error('Error al eliminar requerimiento:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      bloque: '',
      empresa: '',
      tipo: '',
      material_nombre: '',
      descripcion: '',
      numero_requerimiento: '',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      fecha_atencion: '',
      unidad: '',
      cantidad: 0,
      cantidad_atendida: 0,
      solicitante: user?.email || '',
      numero_solicitud_compra: '',
      orden_compra: '',
      proveedor: '',
      estado: 'PENDIENTE',
      observaciones: '',
      precio_unitario: 0,
      subtotal: 0
    })
  }

  const handleFilterChange = (field: keyof RequerimientoFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const clearFilters = () => {
    setFilters({
      busqueda: '',
      empresa: '',
      estado: '',
      fecha_desde: '',
      fecha_hasta: ''
    })
  }

  const handleExcelImport = async (data: Array<{
    bloque?: string;
    empresa?: string;
    tipo?: string;
    material?: string;
    descripcion?: string;
    numero_requerimiento?: string;
    fecha_solicitud?: string;
    fecha_atencion?: string;
    unidad?: string;
    cantidad?: string | number;
    cantidad_atendida?: string | number;
    solicitante?: string;
    numero_solicitud_compra?: string;
    orden_compra?: string;
    proveedor?: string;
    estado?: string;
    observaciones?: string;
    precio_unitario?: string | number;
    subtotal?: string | number;
  }>) => {
    try {
      setLoading(true)
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (const item of data) {
        try {
          // Crear requerimiento con los campos correctos
          const requerimientoData: RequerimientoFormData = {
            bloque: item.bloque || '',
            empresa: item.empresa || '',
            tipo: item.tipo || '',
            material_nombre: item.material || '',
            descripcion: item.descripcion || 'Importado desde Excel',
            numero_requerimiento: item.numero_requerimiento || `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fecha_solicitud: item.fecha_solicitud || new Date().toISOString().split('T')[0],
            fecha_atencion: item.fecha_atencion || '',
            unidad: item.unidad || '',
            cantidad: typeof item.cantidad === 'string' ? parseInt(item.cantidad) || 0 : item.cantidad || 0,
            cantidad_atendida: typeof item.cantidad_atendida === 'string' ? parseFloat(item.cantidad_atendida) || 0 : item.cantidad_atendida || 0,
            solicitante: item.solicitante || user?.email || 'Sistema',
            numero_solicitud_compra: item.numero_solicitud_compra || '',
            orden_compra: item.orden_compra || '',
            proveedor: item.proveedor || '',
            estado: (item.estado as 'PENDIENTE' | 'ASIGNADO' | 'EN_PROCESO' | 'ATENDIDO' | 'CANCELADO') || 'PENDIENTE',
            observaciones: item.observaciones || '',
            precio_unitario: typeof item.precio_unitario === 'string' ? parseFloat(item.precio_unitario) || 0 : item.precio_unitario || 0,
            subtotal: typeof item.subtotal === 'string' ? parseFloat(item.subtotal) || 0 : item.subtotal || 0
          }

          await requerimientosService.create(requerimientoData)
          successCount++
        } catch (error) {
          console.error('Error al crear requerimiento:', error)
          errors.push(`Error al procesar fila: ${error instanceof Error ? error.message : 'Error desconocido'}`)
          errorCount++
        }
      }

      // Mostrar resultados
      if (successCount > 0) {
        toast.success(`Se importaron ${successCount} requerimientos exitosamente`)
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} registros no pudieron ser importados`)
        console.error('Errores de importación:', errors)
      }

      // Recargar datos
      await loadRequerimientos()
      setShowImportModal(false)
    } catch (error) {
      console.error('Error durante la importación:', error)
      toast.error('Error durante la importación de datos')
    } finally {
      setLoading(false)
    }
  }

  const handleImportError = (error: string) => {
    toast.error(`Error al importar: ${error}`)
  }

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Requerimientos</h1>
          <p className="text-gray-600">Gestión de requerimientos de materiales</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<DocumentArrowUpIcon className="h-4 w-4" />}
            onClick={() => setShowImportModal(true)}
          >
            Importar Excel
          </Button>
          <Button
            variant="outline"
            leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={() => {/* TODO: Implementar exportación */}}
          >
            Exportar
          </Button>
          <Button
            leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
          >
            Nuevo Requerimiento
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Filtros</h3>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FunnelIcon className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Input
            label="Búsqueda"
            placeholder="N° Requerimiento, descripción, solicitante..."
            value={filters.busqueda}
            onChange={(e) => handleFilterChange('busqueda', e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
          />
          
          <Input
            label="Empresa"
            placeholder="Filtrar por empresa"
            value={filters.empresa}
            onChange={(e) => handleFilterChange('empresa', e.target.value)}
          />
          
          <Select
            label="Estado"
            value={filters.estado}
            onChange={(e) => handleFilterChange('estado', e.target.value)}
            options={ESTADOS_REQUERIMIENTO}
          />
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Input
              label="Fecha Desde"
              type="date"
              value={filters.fecha_desde}
              onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
            />
            
            <Input
              label="Fecha Hasta"
              type="date"
              value={filters.fecha_hasta}
              onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
            />
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                fullWidth
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow">
        <Table<Requerimiento>
          columns={columns}
          data={requerimientos}
          loading={loading}
        />
      </div>

      {/* Modal de formulario */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingRequerimiento(null)
          resetForm()
        }}
        title={editingRequerimiento ? 'Editar Requerimiento' : 'Nuevo Requerimiento'}
        size="4xl"
      >
        <div className="max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-8 p-1">
            {/* Sección: Información General */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Información General
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Input
                  label="Bloque"
                  value={formData.bloque}
                  onChange={(e) => setFormData(prev => ({ ...prev, bloque: e.target.value }))}
                  placeholder="Bloque o área"
                />
                
                <Input
                  label="Empresa"
                  value={formData.empresa}
                  onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
                  placeholder="Empresa solicitante"
                />
                
                <Input
                  label="Tipo"
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                  placeholder="Tipo de requerimiento"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Input
                  label="N° Requerimiento"
                  value={formData.numero_requerimiento}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero_requerimiento: e.target.value }))}
                  placeholder="Ej: REQ-2024-001"
                  required
                />
                
                <Input
                  label="Fecha Solicitud"
                  type="date"
                  value={formData.fecha_solicitud}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_solicitud: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Solicitante <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.solicitante}
                  onChange={(e) => setFormData(prev => ({ ...prev, solicitante: e.target.value }))}
                  placeholder="Nombre del solicitante"
                  required
                />
              </div>
            </div>

            {/* Sección: Material y Cantidad */}
            <div className="bg-green-50 rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-green-200 pb-2">
                Material y Cantidad
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Input
                  label="Material"
                  value={formData.material_nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, material_nombre: e.target.value }))}
                  placeholder="Nombre del material"
                  required
                />
                
                <Input
                  label="Descripción"
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción del material"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Input
                  label="Cantidad"
                  type="number"
                  value={formData.cantidad}
                  onChange={(e) => setFormData(prev => ({ ...prev, cantidad: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
                
                <Input
                  label="Unidad"
                  value={formData.unidad}
                  onChange={(e) => setFormData(prev => ({ ...prev, unidad: e.target.value }))}
                  placeholder="Ej: UND, KG, M"
                  required
                />
                
                <Input
                  label="Cantidad Atendida"
                  type="number"
                  value={formData.cantidad_atendida}
                  onChange={(e) => setFormData(prev => ({ ...prev, cantidad_atendida: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Sección: Compras y Proveedores */}
            <div className="bg-blue-50 rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-blue-200 pb-2">
                Compras y Proveedores
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Input
                  label="Fecha Atención"
                  type="date"
                  value={formData.fecha_atencion}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_atencion: e.target.value }))}
                />
                
                <Input
                  label="Precio Unitario"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precio_unitario}
                  onChange={(e) => setFormData(prev => ({ ...prev, precio_unitario: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Input
                  label="N° Solicitud de Compra"
                  value={formData.numero_solicitud_compra}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero_solicitud_compra: e.target.value }))}
                  placeholder="Número de solicitud de compra"
                />
                
                <Input
                  label="Orden de Compra"
                  value={formData.orden_compra}
                  onChange={(e) => setFormData(prev => ({ ...prev, orden_compra: e.target.value }))}
                  placeholder="Número de orden de compra"
                />
                
                <Input
                  label="Proveedor"
                  value={formData.proveedor}
                  onChange={(e) => setFormData(prev => ({ ...prev, proveedor: e.target.value }))}
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Input
                  label="Subtotal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.subtotal}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtotal: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  readOnly
                  className="bg-gray-100"
                />
                
                <Select
                  label="Estado"
                  value={formData.estado}
                  onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value as 'PENDIENTE' | 'ASIGNADO' | 'EN_PROCESO' | 'ATENDIDO' | 'CANCELADO' }))}
                  options={[
                    { value: '', label: 'Seleccionar estado' },
                    { value: 'PENDIENTE', label: 'Pendiente' },
                    { value: 'EN_PROCESO', label: 'En Proceso' },
                    { value: 'ATENDIDO', label: 'Atendido' },
                    { value: 'CANCELADO', label: 'Cancelado' }
                  ]}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Observaciones adicionales"
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>



            {/* Botones de acción */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                  setEditingRequerimiento(null)
                  resetForm()
                }}
                className="px-6 py-2"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {editingRequerimiento ? 'Actualizar' : 'Crear'} Requerimiento
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal de importación Excel */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar Requerimientos desde Excel"
        size="xl"
      >
        <ExcelImport
          onDataImported={handleExcelImport}
          onError={handleImportError}
          showPreview={true}
          allowFileUpload={true}
          title="Importar requerimientos desde Excel"
        />
      </Modal>
    </div>
  )
}