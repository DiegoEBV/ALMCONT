import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { CustomModal } from '../components/ui/modal'
import { toast } from 'sonner'
import { materialesService } from '../services/materiales'
import type { Material } from '../types'

const Materiales: React.FC = () => {
  const [materiales, setMateriales] = useState<Material[]>([])
  const [filteredMateriales, setFilteredMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    unidad: '',
    categoria: '',
    precio_unitario: 0,
    stock_minimo: 0,
    stock_maximo: 0,
    activo: true
  })

  useEffect(() => {
    loadMateriales()
  }, [])

  useEffect(() => {
    const filtered = materiales.filter(material =>
      material.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredMateriales(filtered)
  }, [materiales, searchTerm])

  const loadMateriales = async () => {
    try {
      setLoading(true)
      const data = await materialesService.getAll()
      setMateriales(data)
    } catch (error) {
      console.error('Error loading materials:', error)
      toast.error('Error al cargar los materiales')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      await materialesService.create(formData)
      toast.success('Material creado exitosamente')
      setShowCreateModal(false)
      resetForm()
      loadMateriales()
    } catch (error) {
      console.error('Error creating material:', error)
      toast.error('Error al crear el material')
    }
  }

  const handleEdit = async () => {
    if (!selectedMaterial) return
    
    try {
      await materialesService.update(selectedMaterial.id, formData)
      toast.success('Material actualizado exitosamente')
      setShowEditModal(false)
      resetForm()
      loadMateriales()
    } catch (error) {
      console.error('Error updating material:', error)
      toast.error('Error al actualizar el material')
    }
  }

  const handleDelete = async (material: Material) => {
    if (window.confirm(`¿Está seguro de eliminar el material "${material.nombre}"?`)) {
      try {
        await materialesService.delete(material.id)
        toast.success('Material eliminado exitosamente')
        loadMateriales()
      } catch (error) {
        console.error('Error deleting material:', error)
        toast.error('Error al eliminar el material')
      }
    }
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (material: Material) => {
    setSelectedMaterial(material)
    setFormData({
      codigo: material.codigo,
      nombre: material.nombre,
      descripcion: material.descripcion || '',
      unidad: material.unidad,
      categoria: material.categoria,
      precio_unitario: material.precio_unitario,
      stock_minimo: material.stock_minimo || 0,
      stock_maximo: material.stock_maximo || 0,
      activo: material.activo
    })
    setShowEditModal(true)
  }

  const openViewModal = (material: Material) => {
    setSelectedMaterial(material)
    setShowViewModal(true)
  }

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      unidad: '',
      categoria: '',
      precio_unitario: 0,
      stock_minimo: 0,
      stock_maximo: 0,
      activo: true
    })
    setSelectedMaterial(null)
  }

  const handleInputChange = async (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Generar código automáticamente cuando se selecciona una categoría en modo crear
    if (field === 'categoria' && value && showCreateModal) {
      try {
        const nextCode = await materialesService.getNextCode(value)
        setFormData(prev => ({
          ...prev,
          codigo: nextCode
        }))
      } catch (error) {
        console.error('Error generating code:', error)
        toast.error('Error al generar el código automático')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Materiales</h1>
          <p className="text-gray-600 mt-1">Administra los materiales utilizados en los requerimientos</p>
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Material
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, código o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Materiales ({filteredMateriales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-700">Código</th>
                  <th className="text-left p-3 font-medium text-gray-700">Nombre</th>
                  <th className="text-left p-3 font-medium text-gray-700">Categoría</th>
                  <th className="text-left p-3 font-medium text-gray-700">Unidad</th>
                  <th className="text-left p-3 font-medium text-gray-700">Precio Unitario</th>
                  <th className="text-left p-3 font-medium text-gray-700">Stock Máximo</th>
                  <th className="text-left p-3 font-medium text-gray-700">Estado</th>
                  <th className="text-left p-3 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMateriales.map((material) => (
                  <tr key={material.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{material.codigo}</td>
                    <td className="p-3 font-medium">{material.nombre}</td>
                    <td className="p-3">{material.categoria}</td>
                    <td className="p-3">{material.unidad}</td>
                    <td className="p-3">S/ {(material.precio_unitario || 0).toFixed(2)}</td>
                    <td className="p-3">{material.stock_maximo || 0}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                          variant="outline"
                          size="sm"
                          onClick={() => openViewModal(material)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(material)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(material)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMateriales.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No se encontraron materiales
              </div>
            )}
          </div>
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
            {formData.codigo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código (Generado automáticamente)
                </label>
                <Input
                  value={formData.codigo}
                  readOnly
                  className="bg-gray-50"
                  placeholder="Se generará automáticamente"
                />
              </div>
            )}
            <div className={formData.codigo ? '' : 'col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <Input
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
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
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
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
                value={formData.unidad}
                onChange={(e) => handleInputChange('unidad', e.target.value)}
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
                value={formData.categoria}
                onChange={(e) => handleInputChange('categoria', e.target.value)}
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
                value={formData.precio_unitario}
                onChange={(e) => handleInputChange('precio_unitario', parseFloat(e.target.value) || 0)}
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
                value={formData.stock_minimo}
                onChange={(e) => handleInputChange('stock_minimo', parseInt(e.target.value) || 0)}
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
                value={formData.stock_maximo}
                onChange={(e) => handleInputChange('stock_maximo', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo}
              onChange={(e) => handleInputChange('activo', e.target.checked)}
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
                value={formData.codigo}
                onChange={(e) => handleInputChange('codigo', e.target.value)}
                placeholder="Ej: MAT001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <Input
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
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
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
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
                value={formData.unidad}
                onChange={(e) => handleInputChange('unidad', e.target.value)}
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
                value={formData.categoria}
                onChange={(e) => handleInputChange('categoria', e.target.value)}
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
                value={formData.precio_unitario}
                onChange={(e) => handleInputChange('precio_unitario', parseFloat(e.target.value) || 0)}
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
                value={formData.stock_minimo}
                onChange={(e) => handleInputChange('stock_minimo', parseInt(e.target.value) || 0)}
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
                value={formData.stock_maximo}
                onChange={(e) => handleInputChange('stock_maximo', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="activo-edit"
              checked={formData.activo}
              onChange={(e) => handleInputChange('activo', e.target.checked)}
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Unitario
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  S/ {(selectedMaterial.precio_unitario || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Mínimo
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {selectedMaterial.stock_minimo || 0}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Máximo
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {selectedMaterial.stock_maximo || 0}
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