import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ArrowDownTrayIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import { requerimientosService } from '../services/requerimientos'
import { obrasService } from '../services/obras'
import { materialesService } from '../services/materiales'
import { Requerimiento, Obra, Material, RequerimientoFormData, TableColumn } from '../types'
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
    obra_id: '',
    estado: '',
    prioridad: '',
    fecha_desde: '',
    fecha_hasta: '',
    material_id: ''
  })

  // Estados del formulario
  const [formData, setFormData] = useState<RequerimientoFormData>({
    obra_id: '',
    numero_rq: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    fecha_requerimiento: new Date().toISOString().split('T')[0],
    descripcion_actividad: '',
    solicitante: '',
    area_solicitante: '',
    material_id: '',
    cantidad_solicitada: 0,
    unidad: '',
    especificaciones_tecnicas: '',
    justificacion: '',
    fecha_necesidad: '',
    prioridad: 'MEDIA',
    presupuesto_referencial: 0,
    codigo_presupuesto: '',
    observaciones: '',
    archivo_adjunto: '',
    estado: 'PENDIENTE',
    aprobado_por: '',
    fecha_aprobacion: ''
  })

  // Definir columnas de la tabla
  const columns: TableColumn<Requerimiento>[] = [
    {
      key: 'numero_rq',
      title: 'N° RQ',
      sortable: true,
      render: (value: string, item: Requerimiento) => (
        <span className="font-mono text-sm">{item.numero_rq}</span>
      )
    },
    {
      key: 'fecha_requerimiento',
      title: 'Fecha',
      sortable: true,
      render: (value: string, item: Requerimiento) => {
        if (!item.fecha_requerimiento) return '-'
        const date = new Date(item.fecha_requerimiento)
        if (isNaN(date.getTime())) return '-'
        return format(date, 'dd/MM/yyyy', { locale: es })
      }
    },
    {
      key: 'descripcion_actividad',
      title: 'Actividad',
      render: (value: string, item: Requerimiento) => (
        <div className="max-w-xs truncate" title={item.descripcion_actividad}>
          {item.descripcion_actividad}
        </div>
      )
    },
    {
      key: 'solicitante',
      title: 'Solicitante',
      sortable: true
    },
    {
      key: 'material',
      title: 'Material',
      render: (value: string, item: Requerimiento) => (
        <div>
          <div className="font-medium">{item.material?.descripcion}</div>
          <div className="text-sm text-gray-500">{item.material?.codigo}</div>
        </div>
      )
    },
    {
      key: 'cantidad_solicitada',
      title: 'Cantidad',
      sortable: true,
      render: (value: number, item: Requerimiento) => (
        <div className="text-right">
          <span className="font-medium">{item.cantidad_solicitada}</span>
          <span className="text-sm text-gray-500 ml-1">{item.unidad}</span>
        </div>
      )
    },
    {
      key: 'prioridad',
      title: 'Prioridad',
      sortable: true,
      render: (value: string, item: Requerimiento) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          item.prioridad === 'URGENTE' ? 'bg-red-100 text-red-800' :
          item.prioridad === 'ALTA' ? 'bg-orange-100 text-orange-800' :
          item.prioridad === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {item.prioridad}
        </span>
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
      obra_id: requerimiento.obra_id,
      numero_rq: requerimiento.numero_rq,
      fecha_solicitud: requerimiento.fecha_solicitud?.split('T')[0] || '',
      fecha_requerimiento: requerimiento.fecha_requerimiento.split('T')[0],
      descripcion_actividad: requerimiento.descripcion_actividad,
      solicitante: requerimiento.solicitante,
      area_solicitante: requerimiento.area_solicitante || '',
      material_id: requerimiento.material_id,
      cantidad_solicitada: requerimiento.cantidad_solicitada,
      unidad: requerimiento.unidad,
      especificaciones_tecnicas: requerimiento.especificaciones_tecnicas || '',
      justificacion: requerimiento.justificacion || '',
      fecha_necesidad: requerimiento.fecha_necesidad?.split('T')[0] || '',
      prioridad: requerimiento.prioridad,
      presupuesto_referencial: requerimiento.presupuesto_referencial || 0,
      codigo_presupuesto: requerimiento.codigo_presupuesto || '',
      observaciones: requerimiento.observaciones || '',
      archivo_adjunto: requerimiento.archivo_adjunto || '',
      estado: requerimiento.estado,
      aprobado_por: requerimiento.aprobado_por || '',
      fecha_aprobacion: requerimiento.fecha_aprobacion?.split('T')[0] || ''
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
      obra_id: user?.obra_id || '',
      numero_rq: '',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      fecha_requerimiento: new Date().toISOString().split('T')[0],
      descripcion_actividad: '',
      solicitante: '',
      area_solicitante: '',
      material_id: '',
      cantidad_solicitada: 0,
      unidad: '',
      especificaciones_tecnicas: '',
      justificacion: '',
      fecha_necesidad: '',
      prioridad: 'MEDIA',
      presupuesto_referencial: 0,
      codigo_presupuesto: '',
      observaciones: '',
      archivo_adjunto: '',
      estado: 'PENDIENTE',
      aprobado_por: '',
      fecha_aprobacion: ''
    })
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      busqueda: '',
      obra_id: '',
      estado: '',
      prioridad: '',
      fecha_desde: '',
      fecha_hasta: '',
      material_id: ''
    })
  }

  const handleExcelImport = async (data: Array<{
    codigo?: string;
    numero_rq?: string;
    descripcion?: string;
    actividad_descripcion?: string;
    solicitante?: string;
    area_solicitante?: string;
    cantidad?: string | number;
    especificaciones_tecnicas?: string;
    justificacion?: string;
    fecha_necesidad?: string;
    prioridad?: string;
    presupuesto_referencial?: string | number;
    codigo_presupuesto?: string;
    observaciones?: string;
  }>) => {
    try {
      setLoading(true)
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (const item of data) {
        try {
          // Buscar material por código
          const material = materiales.find(m => 
            m.codigo.toLowerCase() === item.codigo?.toLowerCase()
          )

          if (!material) {
            errors.push(`Material con código '${item.codigo}' no encontrado`)
            errorCount++
            continue
          }

          // Buscar obra por defecto o usar la primera disponible
          const obra = obras.length > 0 ? obras[0] : null
          if (!obra) {
            errors.push('No hay obras disponibles para asignar')
            errorCount++
            continue
          }

          // Crear requerimiento
          const requerimientoData: RequerimientoFormData = {
            obra_id: obra.id,
            numero_rq: item.numero_rq || `RQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fecha_solicitud: new Date().toISOString().split('T')[0],
            fecha_requerimiento: new Date().toISOString().split('T')[0],
            descripcion_actividad: item.descripcion || item.actividad_descripcion || 'Importado desde Excel',
            solicitante: item.solicitante || user?.email || 'Sistema',
            area_solicitante: item.area_solicitante || 'Importación',
            material_id: material.id,
            cantidad_solicitada: typeof item.cantidad === 'string' ? parseFloat(item.cantidad) || 1 : item.cantidad || 1,
            unidad: material.unidad,
            especificaciones_tecnicas: item.especificaciones_tecnicas || '',
            justificacion: item.justificacion || 'Importado desde archivo Excel',
            fecha_necesidad: item.fecha_necesidad || '',
            prioridad: (item.prioridad?.toUpperCase() as 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE') || 'MEDIA',
            presupuesto_referencial: typeof item.presupuesto_referencial === 'string' ? parseFloat(item.presupuesto_referencial) || 0 : item.presupuesto_referencial || 0,
            codigo_presupuesto: item.codigo_presupuesto || '',
            observaciones: item.observaciones || '',
            archivo_adjunto: '',
            estado: 'PENDIENTE',
            aprobado_por: '',
            fecha_aprobacion: ''
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
            placeholder="N° RQ, actividad, solicitante..."
            value={filters.busqueda}
            onChange={(e) => handleFilterChange('busqueda', e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
          />
          
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
            options={ESTADOS_REQUERIMIENTO}
          />
          
          <Select
            label="Prioridad"
            value={filters.prioridad}
            onChange={(e) => handleFilterChange('prioridad', e.target.value)}
            options={PRIORIDADES}
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
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Select
                  label="Obra"
                  value={formData.obra_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, obra_id: e.target.value }))}
                  options={[
                    { value: '', label: 'Seleccionar obra' },
                    ...obras.map(obra => ({ value: obra.id, label: obra.nombre }))
                  ]}
                  required
                />
                
                <Input
                  label="N° RQ"
                  value={formData.numero_rq}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero_rq: e.target.value }))}
                  placeholder="Ej: RQ-2024-001"
                  required
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Input
                  label="Fecha Requerimiento"
                  type="date"
                  value={formData.fecha_requerimiento}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_requerimiento: e.target.value }))}
                  required
                />
                
                <Input
                  label="Fecha Necesidad"
                  type="date"
                  value={formData.fecha_necesidad}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_necesidad: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Descripción de Actividad <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.descripcion_actividad}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion_actividad: e.target.value }))}
                  placeholder="Descripción detallada de la actividad"
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>
            </div>

            {/* Sección: Información del Solicitante */}
            <div className="bg-blue-50 rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-blue-200 pb-2">
                Información del Solicitante
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Input
                  label="Solicitante"
                  value={formData.solicitante}
                  onChange={(e) => setFormData(prev => ({ ...prev, solicitante: e.target.value }))}
                  placeholder="Nombre del solicitante"
                  required
                />
                
                <Input
                  label="Área Solicitante"
                  value={formData.area_solicitante}
                  onChange={(e) => setFormData(prev => ({ ...prev, area_solicitante: e.target.value }))}
                  placeholder="Área o departamento"
                />
              </div>
            </div>

            {/* Sección: Material y Cantidad */}
            <div className="bg-green-50 rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-green-200 pb-2">
                Material y Cantidad
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <Select
                    label="Material"
                    value={formData.material_id}
                    onChange={(e) => {
                      const material = materiales.find(m => m.id === e.target.value)
                      setFormData(prev => ({ 
                        ...prev, 
                        material_id: e.target.value,
                        unidad: material?.unidad || ''
                      }))
                    }}
                    options={[
                      { value: '', label: 'Seleccionar material' },
                      ...materiales.map(material => ({ 
                        value: material.id, 
                        label: `${material.codigo} - ${material.descripcion}` 
                      }))
                    ]}
                    required
                  />
                </div>
                
                <Input
                  label="Cantidad Solicitada"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cantidad_solicitada}
                  onChange={(e) => setFormData(prev => ({ ...prev, cantidad_solicitada: parseFloat(e.target.value) || 0 }))}
                  required
                />
                
                <Input
                  label="Unidad"
                  value={formData.unidad}
                  onChange={(e) => setFormData(prev => ({ ...prev, unidad: e.target.value }))}
                  placeholder="Unidad de medida"
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Select
                  label="Prioridad"
                  value={formData.prioridad}
                  onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value as 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE' }))}
                  options={PRIORIDADES.filter(p => p.value !== '')}
                  required
                />
                
                <Input
                  label="Presupuesto Referencial"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.presupuesto_referencial}
                  onChange={(e) => setFormData(prev => ({ ...prev, presupuesto_referencial: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Sección: Detalles Adicionales */}
            <div className="bg-yellow-50 rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-yellow-200 pb-2">
                Detalles Adicionales
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Especificaciones Técnicas
                  </label>
                  <textarea
                    value={formData.especificaciones_tecnicas}
                    onChange={(e) => setFormData(prev => ({ ...prev, especificaciones_tecnicas: e.target.value }))}
                    placeholder="Especificaciones técnicas del material"
                    className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Justificación
                  </label>
                  <textarea
                    value={formData.justificacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, justificacion: e.target.value }))}
                    placeholder="Justificación del requerimiento"
                    className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
                    className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
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