import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '../components/ui/Button';
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Trash2, 
  Search, 
  Package, 
  ArrowLeft,
  Save,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuthHook'
import { useNavigate } from 'react-router-dom'
import { materialesService } from '@/services/materiales'
import { obrasService } from '@/services/obras'
import { requerimientosMaterialesService } from '@/services/requerimientosMateriales'
import type { Material, Obra, RequerimientoMaterialFormData } from '@/types'

interface MaterialSelection {
  material_id: string
  cantidad: number
  comentarios?: string
  material: Material
}

const CreateRequirement: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [materiales, setMateriales] = useState<Material[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [filteredMateriales, setFilteredMateriales] = useState<Material[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [formData, setFormData] = useState<RequerimientoMaterialFormData>({
    obra_id: '',
    comentarios: '',
    prioridad: 'MEDIA'
  })
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialSelection[]>([])
  const [showMaterialSelector, setShowMaterialSelector] = useState(false)

  // Obtener categorías únicas
  const categories = Array.from(new Set(materiales.map(m => m.categoria).filter(Boolean)))

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching initial data...')
      const [materialesData, obrasData] = await Promise.all([
        materialesService.getAllLegacy(), // Usar método legacy que retorna Material[]
        obrasService.getAll()
      ])
      console.log('✅ Materiales loaded:', materialesData.length, materialesData)
      console.log('✅ Obras loaded:', obrasData.length, obrasData)
      setMateriales(materialesData)
      setFilteredMateriales(materialesData)
      setObras(obrasData)
    } catch (error) {
      console.error('❌ Error fetching initial data:', error)
      toast.error('Error al cargar los datos iniciales')
    } finally {
      setLoading(false)
    }
  }



  const handleAddMaterial = (material: Material) => {
    const existingIndex = selectedMaterials.findIndex(sm => sm.material_id === material.id)
    
    if (existingIndex >= 0) {
      // Si ya existe, incrementar cantidad
      const updated = [...selectedMaterials]
      updated[existingIndex].cantidad += 1
      setSelectedMaterials(updated)
    } else {
      // Si no existe, agregar nuevo
      const newSelection: MaterialSelection = {
        material_id: material.id,
        cantidad: 1,
        comentarios: '',
        material: material
      }
      setSelectedMaterials([...selectedMaterials, newSelection])
    }
    toast.success(`${material.nombre} agregado al requerimiento`)
  }

  const handleUpdateMaterial = (index: number, field: keyof MaterialSelection, value: any) => {
    const updated = [...selectedMaterials]
    updated[index] = { ...updated[index], [field]: value }
    setSelectedMaterials(updated)
  }

  const handleRemoveMaterial = (index: number) => {
    const updated = selectedMaterials.filter((_, i) => i !== index)
    setSelectedMaterials(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) {
      toast.error('Usuario no autenticado')
      return
    }

    if (!formData.obra_id) {
      toast.error('Debe seleccionar una obra')
      return
    }

    if (selectedMaterials.length === 0) {
      toast.error('Debe agregar al menos un material')
      return
    }

    // Validar cantidades
    const invalidMaterials = selectedMaterials.filter(sm => sm.cantidad <= 0)
    if (invalidMaterials.length > 0) {
      toast.error('Todas las cantidades deben ser mayores a 0')
      return
    }

    try {
      setLoading(true)
      
      // Verificar alertas de stock máximo antes de crear el requerimiento
      const { stockAlertsService } = await import('@/services/stockAlerts')
      const stockAlerts = []
      
      for (const material of selectedMaterials) {
        const stockCheck = await stockAlertsService.wouldExceedMaxStock(
          material.material_id, 
          material.cantidad
        )
        
        if (stockCheck.wouldExceed) {
          stockAlerts.push({
            material: material.material,
            ...stockCheck
          })
        } else if (stockCheck.usagePercentage >= 80) {
          // Mostrar advertencia si se acerca al límite
          toast.warning(
            `Advertencia: El material "${material.material.nombre}" alcanzará ${stockCheck.usagePercentage.toFixed(1)}% de su stock máximo (${stockCheck.maxStock})`
          )
        }
      }
      
      // Si hay materiales que excederían el stock máximo, mostrar error
      if (stockAlerts.length > 0) {
        const alertMessages = stockAlerts.map(alert => 
          `${alert.material.nombre}: ${alert.newUsage}/${alert.maxStock} (${alert.usagePercentage.toFixed(1)}%)`
        ).join('\n')
        
        toast.error(
          `Los siguientes materiales excederían su stock máximo:\n${alertMessages}`,
          { duration: 8000 }
        )
        setLoading(false)
        return
      }
      
      const requirementData = {
        ...formData,
        detalles: selectedMaterials.map(sm => ({
          material_id: sm.material_id,
          cantidad: sm.cantidad,
          comentarios: sm.comentarios || ''
        }))
      }

      await requerimientosMaterialesService.create(requirementData, user.id)
      toast.success('Requerimiento creado exitosamente')
      navigate('/production/requirements')
    } catch (error) {
      console.error('Error creating requirement:', error)
      toast.error('Error al crear el requerimiento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🔍 CreateRequirement mounted, user:', user)
    fetchInitialData()
  }, [])

  useEffect(() => {
    console.log('👤 User changed:', user)
    console.log('📊 Current state - obras:', obras.length, 'materiales:', materiales.length)
  }, [user, obras, materiales])

  const filterMateriales = React.useCallback(() => {
    let filtered = materiales

    if (searchTerm) {
      filtered = filtered.filter(material => 
        material.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter(material => material.categoria === selectedCategory)
    }

    setFilteredMateriales(filtered)
  }, [materiales, searchTerm, selectedCategory])

  useEffect(() => {
    filterMateriales()
  }, [filterMateriales])

  if (loading && materiales.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/production')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Requerimiento de Materiales</h1>
          <p className="text-gray-600 mt-1">Crear solicitud de materiales para obra</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información General */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
            <CardDescription>
              Datos básicos del requerimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="obra">Obra *</Label>
                <div className="relative" style={{ zIndex: 1002 }}>
                  <Select 
                    value={formData.obra_id} 
                    onValueChange={(value) => {
                      console.log('🏗️ Obra selected:', value)
                      setFormData(prev => ({ ...prev, obra_id: value }))
                    }}
                  >
                    <SelectTrigger className="w-full" data-testid="obra-select">
                      <SelectValue placeholder="Seleccionar obra" />
                    </SelectTrigger>
                    <SelectContent 
                      className="z-[9999] bg-white border shadow-lg"
                      style={{
                        position: 'fixed',
                        zIndex: 9999,
                        minWidth: '200px'
                      }}
                      sideOffset={4}
                    >
                      {obras.map((obra) => (
                        <SelectItem key={obra.id} value={obra.id}>
                          {obra.codigo} - {obra.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prioridad">Prioridad</Label>
                <Select 
                  value={formData.prioridad} 
                  onValueChange={(value: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE') => 
                    setFormData(prev => ({ ...prev, prioridad: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[1001] bg-white border shadow-lg">
                    <SelectItem value="BAJA">Baja</SelectItem>
                    <SelectItem value="MEDIA">Media</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comentarios">Comentarios</Label>
              <Textarea
                id="comentarios"
                placeholder="Comentarios generales del requerimiento..."
                value={formData.comentarios}
                onChange={(e) => setFormData(prev => ({ ...prev, comentarios: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Materiales Seleccionados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Materiales Solicitados</CardTitle>
              <CardDescription>
                Lista de materiales incluidos en el requerimiento
              </CardDescription>
            </div>
            <Button 
              type="button" 
              onClick={() => setShowMaterialSelector(!showMaterialSelector)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Material
            </Button>
          </CardHeader>
          <CardContent>
            {selectedMaterials.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay materiales seleccionados</p>
                <p className="text-sm text-gray-400">Haga clic en "Agregar Material" para comenzar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedMaterials.map((selection, index) => (
                  <div key={`${selection.material_id}-${index}`} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium">{selection.material.nombre}</h4>
                        <p className="text-sm text-gray-600">
                          Código: {selection.material.codigo}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary">
                            {selection.material.categoria}
                          </Badge>
                          <Badge variant="outline">
                            {selection.material.unidad_medida}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMaterial(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cantidad *</Label>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          value={selection.cantidad}
                          onChange={(e) => handleUpdateMaterial(index, 'cantidad', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Comentarios</Label>
                        <Input
                          value={selection.comentarios || ''}
                          onChange={(e) => handleUpdateMaterial(index, 'comentarios', e.target.value)}
                          placeholder="Comentarios específicos..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selector de Materiales */}
        {showMaterialSelector && (
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Materiales</CardTitle>
              <CardDescription>
                Busque y seleccione los materiales necesarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nombre, código o descripción..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent className="z-[1001] bg-white border shadow-lg">
                      <SelectItem value="">Todas las categorías</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Lista de Materiales */}
              <div className="max-h-96 overflow-y-auto overflow-x-visible">
                {filteredMateriales.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No se encontraron materiales</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredMateriales.map((material) => {
                      const isSelected = selectedMaterials.some(sm => sm.material_id === material.id)
                      return (
                        <div 
                          key={material.id} 
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                          }`}
                          onClick={() => handleAddMaterial(material)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm">{material.nombre}</h4>
                            {isSelected && (
                              <Badge className="text-xs">Seleccionado</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            Código: {material.codigo}
                          </p>
                          <div className="flex gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {material.categoria}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {material.unidad_medida}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botones de Acción */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/produccion/dashboard')}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={loading || selectedMaterials.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : 'Crear Requerimiento'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateRequirement