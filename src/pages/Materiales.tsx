import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Search, Edit, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui'
import { Input } from '../components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui'
import { CustomModal } from '../components/ui'
import { toast } from 'sonner'
import { materialesService, type MaterialesQuery, type MaterialesResponse } from '../services/materiales'
import { cacheService } from '../services/cacheService'
import type { Material } from '../types'

const Materiales: React.FC = () => {
  // Estados principales
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(20) // Reducido para mejor rendimiento

  // Estados de modales
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)

  // Estado del formulario
  const [formData, setFormData] = useState<Partial<Material>>({
    codigo: '',
    nombre: '',
    descripcion: '',
    unidad: '',
    categoria: '',
    precio_referencial: 0,
    activo: true
  })

  // Inicializar cache al montar el componente
  useEffect(() => {
    const initializeCache = async () => {
      try {
        await cacheService.init()
        console.log('Cache inicializado correctamente')
      } catch (error) {
        console.error('Error al inicializar cache:', error)
      }
    }
    
    initializeCache()
  }, [])

  // Cargar categorías
  const loadCategorias = useCallback(async () => {
    try {
      const categoriasData = await materialesService.getCategorias()
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Error al cargar categorías:', error)
      toast.error('Error al cargar categorías')
    }
  }, [])

  // Cargar materiales con paginación y filtros
  const loadMateriales = useCallback(async (page: number = 1) => {
    setLoading(true)
    try {
      const query: MaterialesQuery = {
        page,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        categoria: selectedCategoria || undefined,
        activo: true
      }

      const response: MaterialesResponse = await materialesService.getAll(query)
      
      setMateriales(response.data)
      setTotalPages(response.totalPages)
      setTotalItems(response.total)
      setCurrentPage(response.page)
      
    } catch (error) {
      console.error('Error al cargar materiales:', error)
      toast.error('Error al cargar materiales')
      setMateriales([])
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedCategoria, itemsPerPage])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1) // Reset to first page on search
      loadMateriales(1)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedCategoria, loadMateriales])

  // Cargar datos iniciales
  useEffect(() => {
    loadCategorias()
    loadMateriales(1)
  }, [loadCategorias, loadMateriales])

  // Memoized filtered data para optimización
  const displayedMateriales = useMemo(() => {
    return materiales
  }, [materiales])

  // Handlers optimizados con useCallback
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'precio_referencial' || name === 'precio_unitario' || name === 'stock_minimo' || name === 'stock_maximo'
        ? parseFloat(value) || 0
        : value
    }))
  }, [])

  const handleFieldChange = useCallback(async (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'precio_referencial' || field === 'precio_unitario' || field === 'stock_minimo' || field === 'stock_maximo'
        ? (typeof value === 'string' ? parseFloat(value) || 0 : value)
        : value
    }))

    // Generar código automáticamente cuando se selecciona una categoría
    if (field === 'categoria' && typeof value === 'string' && value) {
      try {
        const generatedCode = await materialesService.generateMaterialCode(value)
        setFormData(prev => ({
          ...prev,
          codigo: generatedCode
        }))
      } catch (error) {
        console.error('Error generando código:', error)
        toast.error('Error al generar código automático')
      }
    }
  }, [])

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }))
  }, [])

  const handleCreate = useCallback(async () => {
    try {
      if (!formData.codigo || !formData.nombre || !formData.unidad || !formData.categoria) {
        toast.error('Por favor complete todos los campos obligatorios')
        return
      }

      await materialesService.create(formData as Omit<Material, 'id' | 'created_at' | 'updated_at'>)
      toast.success('Material creado exitosamente')
      setShowCreateModal(false)
      setFormData({
        codigo: '',
        nombre: '',
        descripcion: '',
        unidad: '',
        categoria: '',
        precio_referencial: 0,
        activo: true
      })
      loadMateriales(currentPage)
    } catch (error) {
      console.error('Error al crear material:', error)
      toast.error('Error al crear material')
    }
  }, [formData, currentPage, loadMateriales])

  const handleEdit = useCallback(async () => {
    try {
      if (!selectedMaterial?.id) return

      await materialesService.update(selectedMaterial.id, formData)
      toast.success('Material actualizado exitosamente')
      setShowEditModal(false)
      setSelectedMaterial(null)
      loadMateriales(currentPage)
    } catch (error) {
      console.error('Error al actualizar material:', error)
      toast.error('Error al actualizar material')
    }
  }, [selectedMaterial, formData, currentPage, loadMateriales])

  const handleDelete = useCallback(async (material: Material) => {
    if (!confirm(`¿Está seguro de eliminar el material "${material.nombre}"?`)) return

    try {
      await materialesService.delete(material.id)
      toast.success('Material eliminado exitosamente')
      loadMateriales(currentPage)
    } catch (error) {
      console.error('Error al eliminar material:', error)
      
      // Mostrar mensaje de error específico basado en el tipo de error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al eliminar material'
      
      if (errorMessage.includes('requerimientos existentes')) {
        toast.error('No se puede eliminar: El material está siendo usado en requerimientos existentes')
      } else if (errorMessage.includes('stock disponible')) {
        toast.error('No se puede eliminar: El material tiene stock disponible en una o más obras')
      } else if (errorMessage.includes('verificar dependencias') || errorMessage.includes('verificar stock')) {
        toast.error('Error al verificar dependencias del material. Intente nuevamente.')
      } else {
        toast.error(`Error al eliminar material: ${errorMessage}`)
      }
    }
  }, [currentPage, loadMateriales])

  const openEditModal = useCallback((material: Material) => {
    setSelectedMaterial(material)
    setFormData({
      codigo: material.codigo,
      nombre: material.nombre,
      descripcion: material.descripcion,
      unidad: material.unidad,
      categoria: material.categoria,
      precio_referencial: material.precio_referencial,
      activo: material.activo
    })
    setShowEditModal(true)
  }, [])

  const openViewModal = useCallback((material: Material) => {
    setSelectedMaterial(material)
    setShowViewModal(true)
  }, [])

  // Paginación
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      loadMateriales(page)
    }
  }, [totalPages, loadMateriales])

  // Limpiar cache cuando sea necesario
  const clearCache = useCallback(async () => {
    try {
      await cacheService.clearAllCache()
      toast.success('Cache limpiado exitosamente')
      loadMateriales(1)
    } catch (error) {
      console.error('Error al limpiar cache:', error)
      toast.error('Error al limpiar cache')
    }
  }, [loadMateriales])

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Materiales</h1>
        <div className="flex gap-2">
          <Button
            onClick={clearCache}
            variant="outline"
            size="sm"
          >
            Limpiar Cache
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Material
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por código, nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(categoria => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-600 flex items-center">
              Total: {totalItems} materiales
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de materiales */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Materiales</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Cargando materiales...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-700">Código</th>
                      <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                      <th className="text-left p-3 font-medium text-gray-700">Categoría</th>
                      <th className="text-left p-3 font-medium text-gray-700">Unidad</th>
                      <th className="text-left p-3 font-medium text-gray-700">Precio Ref.</th>
                      <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                      <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedMateriales.map((material) => (
                      <tr key={material.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-sm">{material.codigo}</td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{material.nombre}</div>
                            {material.descripcion && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {material.descripcion}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {material.categoria}
                          </span>
                        </td>
                        <td className="p-3">{material.unidad}</td>
                        <td className="p-3">S/ {material.precio_referencial?.toFixed(2) || '0.00'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            material.activo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {material.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openViewModal(material)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(material)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(material)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages} ({totalItems} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    
                    {/* Números de página */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                      if (pageNum <= totalPages) {
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      }
                      return null
                    })}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Material Modal */}
      <CustomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Material"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código (Generado automáticamente)
              </label>
              <Input
                name="codigo"
                value={formData.codigo}
                readOnly
                className="bg-gray-50"
                placeholder="Se generará al seleccionar categoría"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={(e) => handleFieldChange('nombre', e.target.value)}
                placeholder="Nombre del material"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              name="descripcion"
              value={formData.descripcion}
              onChange={(e) => handleFieldChange('descripcion', e.target.value)}
              placeholder="Descripción del material"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                name="unidad"
                value={formData.unidad}
                onChange={(e) => handleFieldChange('unidad', e.target.value)}
                required
              >
                <option value="">Seleccionar unidad</option>
                <option value="kg">Kilogramo (kg)</option>
                <option value="m">Metro (m)</option>
                <option value="m2">Metro cuadrado (m²)</option>
                <option value="m3">Metro cúbico (m³)</option>
                <option value="und">Unidad (und)</option>
                <option value="lt">Litro (lt)</option>
                <option value="gl">Galón (gl)</option>
                <option value="tn">Tonelada (tn)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                name="categoria"
                value={formData.categoria}
                onChange={(e) => handleFieldChange('categoria', e.target.value)}
                required
              >
                <option value="">Seleccionar categoría</option>
                <option value="Acero">Acero</option>
                <option value="Madera">Madera</option>
                <option value="Consumible">Consumible</option>
                <option value="Alambre">Alambre</option>
                <option value="Aditivos">Aditivos</option>
                <option value="Cemento">Cemento</option>
                <option value="Agregados">Agregados</option>
                <option value="Herramientas">Herramientas</option>
                <option value="Equipos">Equipos</option>
                <option value="Pinturas">Pinturas</option>
                <option value="Electricidad">Electricidad</option>
                <option value="Plomería">Plomería</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Unitario (S/)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                name="precio_unitario"
                value={formData.precio_unitario || 0}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Mínimo
              </label>
              <Input
                type="number"
                min="0"
                name="stock_minimo"
                value={formData.stock_minimo || 0}
                onChange={handleInputChange}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Máximo
              </label>
              <Input
                type="number"
                min="0"
                name="stock_maximo"
                value={formData.stock_maximo || 0}
                onChange={handleInputChange}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            <label htmlFor="activo" className="text-sm font-medium text-gray-700">
              Material activo
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Crear Material
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* Edit Material Modal */}
      <CustomModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Material"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <Input
                name="codigo"
                value={formData.codigo}
                onChange={handleInputChange}
                placeholder="Ej: MAT001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Nombre del material"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              name="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Descripción del material"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                name="unidad"
                value={formData.unidad}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccionar unidad</option>
                <option value="UND">Unidad (UND)</option>
                <option value="KG">Kilogramo (KG)</option>
                <option value="M">Metro (M)</option>
                <option value="M2">Metro cuadrado (M²)</option>
                <option value="M3">Metro cúbico (M³)</option>
                <option value="LT">Litro (LT)</option>
                <option value="GL">Galón (GL)</option>
                <option value="TN">Tonelada (TN)</option>
                <option value="BOLSA">Bolsa</option>
                <option value="CAJA">Caja</option>
                <option value="DOC">Docena</option>
                <option value="VARILLA">Varilla</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                name="categoria"
                value={formData.categoria}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map(categoria => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Referencial (S/)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                name="precio_referencial"
                value={formData.precio_referencial}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="activo-edit"
              name="activo"
              checked={formData.activo}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            <label htmlFor="activo-edit" className="text-sm font-medium text-gray-700">
              Material activo
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Actualizar Material
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* View Material Modal */}
      <CustomModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Detalles del Material"
        size="lg"
      >
        {selectedMaterial && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                  {selectedMaterial.codigo}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {selectedMaterial.nombre}
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded min-h-[60px]">
                {selectedMaterial.descripcion || 'Sin descripción'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {selectedMaterial.unidad}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {selectedMaterial.categoria}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Referencial
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  S/ {(selectedMaterial.precio_referencial || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                selectedMaterial.activo 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {selectedMaterial.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowViewModal(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </CustomModal>
    </div>
  )
}

export default Materiales