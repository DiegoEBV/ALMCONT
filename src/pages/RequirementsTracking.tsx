import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { 
  Search, 
  Filter, 
  Eye, 
  Plus, 
  ArrowLeft,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from "@/hooks/useAuthHook";
import { useNavigate } from 'react-router-dom'
import { requerimientosMaterialesService } from '@/services/requerimientosMateriales'
import type { RequerimientoMaterial } from '@/types'

const RequirementsTracking: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requirements, setRequirements] = useState<RequerimientoMaterial[]>([])
  const [filteredRequirements, setFilteredRequirements] = useState<RequerimientoMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [selectedRequirement, setSelectedRequirement] = useState<RequerimientoMaterial | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const fetchRequirements = async () => {
    if (!user?.id) return

    try {
      setRefreshing(true)
      const data = await requerimientosMaterialesService.getByUsuario(user.id)
      setRequirements(data)
      setFilteredRequirements(data)
    } catch (error) {
      console.error('Error fetching requirements:', error)
      toast.error('Error al cargar requerimientos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filterRequirements = () => {
    let filtered = requirements

    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.numero_requerimiento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.obra?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.observaciones?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter) {
      filtered = filtered.filter(req => req.estado === statusFilter)
    }

    if (priorityFilter) {
      filtered = filtered.filter(req => req.prioridad === priorityFilter)
    }

    setFilteredRequirements(filtered)
  }

  const getStatusColor = (estado: RequerimientoMaterial['estado']) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'EN_REVISION':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'APROBADO':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'RECHAZADO':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'ATENDIDO':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (prioridad: RequerimientoMaterial['prioridad']) => {
    switch (prioridad) {
      case 'BAJA':
        return 'bg-gray-100 text-gray-800'
      case 'MEDIA':
        return 'bg-blue-100 text-blue-800'
      case 'ALTA':
        return 'bg-orange-100 text-orange-800'
      case 'URGENTE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (estado: RequerimientoMaterial['estado']) => {
    switch (estado) {
      case 'PENDIENTE':
        return <Clock className="h-4 w-4" />
      case 'EN_REVISION':
        return <AlertCircle className="h-4 w-4" />
      case 'APROBADO':
        return <CheckCircle className="h-4 w-4" />
      case 'RECHAZADO':
        return <XCircle className="h-4 w-4" />
      case 'ATENDIDO':
        return <Package className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const handleViewDetails = (requirement: RequerimientoMaterial) => {
    setSelectedRequirement(requirement)
    setShowDetails(true)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setPriorityFilter('')
  }

  useEffect(() => {
    fetchRequirements()
  }, [user?.id])

  useEffect(() => {
    filterRequirements()
  }, [searchTerm, statusFilter, priorityFilter, requirements])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-3xl font-bold text-gray-900">Mis Requerimientos</h1>
            <p className="text-gray-600 mt-1">Seguimiento de solicitudes de materiales</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchRequirements}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={() => navigate('/production/requirements/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Requerimiento
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Número, obra, observaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="EN_REVISION">En Revisión</SelectItem>
                  <SelectItem value="APROBADO">Aprobado</SelectItem>
                  <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                  <SelectItem value="ATENDIDO">Atendido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridad</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las prioridades</SelectItem>
                  <SelectItem value="BAJA">Baja</SelectItem>
                  <SelectItem value="MEDIA">Media</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Requerimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Requerimientos ({filteredRequirements.length})</CardTitle>
          <CardDescription>
            Lista de todos sus requerimientos de materiales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequirements.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {requirements.length === 0 ? 'No hay requerimientos' : 'No se encontraron requerimientos'}
              </h3>
              <p className="text-gray-500 mb-4">
                {requirements.length === 0 
                  ? 'Aún no ha creado ningún requerimiento de materiales'
                  : 'Intente ajustar los filtros de búsqueda'
                }
              </p>
              {requirements.length === 0 && (
                <Button onClick={() => navigate('/production/requirements/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Requerimiento
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequirements.map((requirement) => (
                <div key={requirement.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{requirement.numero_requerimiento}</h3>
                        <Badge className={getStatusColor(requirement.estado)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(requirement.estado)}
                            {requirement.estado}
                          </div>
                        </Badge>
                        <Badge className={getPriorityColor(requirement.prioridad)}>
                          {requirement.prioridad}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>Obra: {requirement.obra?.nombre || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Fecha: {new Date(requirement.fecha_solicitud).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>Materiales: {requirement.detalles?.length || 0}</span>
                        </div>
                      </div>
                      
                      {requirement.observaciones && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          "{requirement.observaciones}"
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(requirement)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalles
                    </Button>
                  </div>
                  
                  {requirement.fecha_revision && (
                    <div className="text-xs text-gray-500 border-t pt-2">
                      Última actualización: {new Date(requirement.fecha_revision).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalles */}
      {showDetails && selectedRequirement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Detalles del Requerimiento</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDetails(false)}
                >
                  Cerrar
                </Button>
              </div>
              
              {/* Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-3">Información General</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Número:</strong> {selectedRequirement.numero_requerimiento}</div>
                    <div><strong>Obra:</strong> {selectedRequirement.obra?.nombre || 'N/A'}</div>
                    <div><strong>Estado:</strong> 
                      <Badge className={`ml-2 ${getStatusColor(selectedRequirement.estado)}`}>
                        {selectedRequirement.estado}
                      </Badge>
                    </div>
                    <div><strong>Prioridad:</strong> 
                      <Badge className={`ml-2 ${getPriorityColor(selectedRequirement.prioridad)}`}>
                        {selectedRequirement.prioridad}
                      </Badge>
                    </div>
                    <div><strong>Fecha de Solicitud:</strong> {new Date(selectedRequirement.fecha_solicitud).toLocaleString()}</div>
                    {selectedRequirement.fecha_revision && (
                      <div><strong>Última Revisión:</strong> {new Date(selectedRequirement.fecha_revision).toLocaleString()}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Observaciones</h3>
                  <p className="text-sm text-gray-600">
                    {selectedRequirement.observaciones || 'Sin observaciones'}
                  </p>
                </div>
              </div>
              
              {/* Materiales Solicitados */}
              <div>
                <h3 className="font-semibold mb-3">Materiales Solicitados</h3>
                <div className="space-y-3">
                  {selectedRequirement.detalles?.map((detalle, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{detalle.material?.nombre || 'Material no encontrado'}</h4>
                          <p className="text-sm text-gray-600">
                            Código: {detalle.material?.codigo || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {detalle.cantidad} {detalle.material?.unidad_medida || ''}
                          </div>
                        </div>
                      </div>
                      {detalle.observaciones && (
                        <p className="text-sm text-gray-600 italic">
                          Observaciones: {detalle.observaciones}
                        </p>
                      )}
                    </div>
                  )) || (
                    <p className="text-gray-500">No hay detalles de materiales</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RequirementsTracking