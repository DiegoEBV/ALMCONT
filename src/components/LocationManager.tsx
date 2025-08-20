import React, { useState, useEffect } from 'react';
import { MapPin, Move, Search, Grid, List, Plus, Edit3, Navigation, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { LocationService, Location, WarehouseMap } from '../services/locationService';
import { Button } from './ui/button';
import { CustomModal as Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter, ModalDescription } from './ui/modal';
import LoadingSpinner from './ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

interface LocationManagerProps {
  className?: string;
}

// Funciones de utilidad fuera del componente
const getStatusColor = (status: string) => {
  switch (status) {
    case 'disponible': return 'border-green-200 bg-green-50 text-green-700';
    case 'ocupada': return 'border-yellow-200 bg-yellow-50 text-yellow-700';
    case 'llena': return 'border-red-200 bg-red-50 text-red-700';
    case 'mantenimiento': return 'border-gray-200 bg-gray-50 text-gray-700';
    default: return 'border-gray-200 bg-gray-50 text-gray-700';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'disponible': return <CheckCircle className="w-3 h-3" />;
    case 'ocupada': return <Clock className="w-3 h-3" />;
    case 'llena': return <AlertTriangle className="w-3 h-3" />;
    case 'mantenimiento': return <AlertTriangle className="w-3 h-3" />;
    default: return <Clock className="w-3 h-3" />;
  }
};

export const LocationManager: React.FC<LocationManagerProps> = ({ className }) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouseMap, setWarehouseMap] = useState<WarehouseMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'disponible' | 'ocupada' | 'llena'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [locationsData, mapData] = await Promise.all([
        LocationService.getLocations(),
        LocationService.getWarehouseMap()
      ]);
      setLocations(locationsData);
      setWarehouseMap(mapData);
    } catch (error) {
      console.error('Error loading location data:', error);
      toast.error('Error al cargar datos de ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocation = async (locationData: Partial<Location>) => {
    try {
      setProcessing(true);
      // Aquí iría la lógica para guardar/actualizar ubicación
      // Por ahora simulamos el éxito
      toast.success('Ubicación guardada exitosamente');
      await loadData();
      setShowLocationModal(false);
      setSelectedLocation(null);
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Error al guardar ubicación');
    } finally {
      setProcessing(false);
    }
  };

  const handleMoveStock = async (moveData: {
    materialId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    reason: string;
  }) => {
    try {
      setProcessing(true);
      const movement = {
        material_id: moveData.materialId,
        ubicacion_origen: moveData.fromLocationId,
        ubicacion_destino: moveData.toLocationId,
        cantidad: moveData.quantity,
        tipo_movimiento: 'transferencia' as const,
        usuario_id: user?.id || '',
        observaciones: moveData.reason
      };
      
      const result = await LocationService.executeStockMovement(movement);
      
      if (result.success) {
        toast.success('Movimiento de stock realizado exitosamente');
        await loadData();
        setShowMoveModal(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error moving stock:', error);
      toast.error('Error al mover stock');
    } finally {
      setProcessing(false);
    }
  };



  const zones = Array.from(new Set(locations.map(loc => loc.zona).filter(Boolean)));

  const filteredLocations = locations.filter(location => {
    const matchesSearch = location.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.zona?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = filterZone === 'all' || location.zona === filterZone;
    const matchesStatus = filterStatus === 'all' || (location.activa ? 'disponible' : 'inactiva') === filterStatus;
    return matchesSearch && matchesZone && matchesStatus;
  });

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Ubicaciones</h2>
          <p className="text-gray-600 mt-1">
            {locations.length} ubicaciones registradas en el almacén
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowMoveModal(true)}
            variant="outline"
            size="sm"
          >
            <Move className="w-4 h-4 mr-2" />
            Mover Stock
          </Button>
          
          <Button
            onClick={() => {
              setSelectedLocation(null);
              setShowLocationModal(true);
            }}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Ubicación
          </Button>
        </div>
      </div>

      {/* Controles de Vista y Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar ubicaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las zonas</option>
            {zones.map(zone => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'disponible' | 'ocupada' | 'llena')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="ocupada">Ocupada</option>
            <option value="llena">Llena</option>
          </select>
        </div>
        
        {/* Controles de Vista */}
        <div className="flex border border-gray-300 rounded-md">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm font-medium ${
              viewMode === 'grid'
                ? 'bg-blue-50 text-blue-700 border-r border-gray-300'
                : 'text-gray-500 hover:text-gray-700 border-r border-gray-300'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm font-medium ${
              viewMode === 'list'
                ? 'bg-blue-50 text-blue-700 border-r border-gray-300'
                : 'text-gray-500 hover:text-gray-700 border-r border-gray-300'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-2 text-sm font-medium ${
              viewMode === 'map'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido según modo de vista */}
      {viewMode === 'grid' && (
        <GridView
          locations={filteredLocations}
          onEdit={(location) => {
            setSelectedLocation(location);
            setShowLocationModal(true);
          }}
        />
      )}

      {viewMode === 'list' && (
        <ListView
          locations={filteredLocations}
          onEdit={(location) => {
            setSelectedLocation(location);
            setShowLocationModal(true);
          }}
        />
      )}

      {viewMode === 'map' && (
        <MapView
          warehouseMap={warehouseMap}
          locations={filteredLocations}
          onLocationClick={(location) => {
            setSelectedLocation(location);
            setShowLocationModal(true);
          }}
        />
      )}

      {/* Modal de Ubicación */}
      {showLocationModal && (
        <LocationModal
          location={selectedLocation}
          isOpen={showLocationModal}
          onClose={() => {
            setShowLocationModal(false);
            setSelectedLocation(null);
          }}
          onSave={handleSaveLocation}
          processing={processing}
        />
      )}

      {/* Modal de Movimiento */}
      {showMoveModal && (
        <MoveStockModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          onMove={handleMoveStock}
          processing={processing}
          locations={locations}
        />
      )}
    </div>
  );
};

// Vista de Cuadrícula
interface GridViewProps {
  locations: Location[];
  onEdit: (location: Location) => void;
}

const GridView: React.FC<GridViewProps> = ({ locations, onEdit }) => {
  if (locations.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron ubicaciones</h3>
        <p className="text-gray-600">Ajusta los filtros o crea una nueva ubicación.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {locations.map((location) => (
        <div key={location.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{location.codigo}</h3>
              <p className="text-sm text-gray-600">{location.zona}</p>
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(location.activa ? 'disponible' : 'inactiva')}`}>
                  {getStatusIcon(location.activa ? 'disponible' : 'inactiva')}
                  {(location.activa ? 'DISPONIBLE' : 'INACTIVA')}
                </span>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <div className="flex justify-between">
              <span>Capacidad:</span>
              <span className="font-medium">{location.capacidad_maxima || 0} unidades</span>
            </div>
          </div>
          
          
          
          <div className="flex gap-2">
            <Button
              onClick={() => onEdit(location)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Editar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Vista de Lista
interface ListViewProps {
  locations: Location[];
  onEdit: (location: Location) => void;
}

const ListView: React.FC<ListViewProps> = ({ locations, onEdit }) => {
  if (locations.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron ubicaciones</h3>
        <p className="text-gray-600">Ajusta los filtros o crea una nueva ubicación.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ubicación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Zona
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ocupación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {locations.map((location) => {
              const occupancyPercentage = 0; // Sin información de stock actual
              
              return (
                <tr key={location.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{location.codigo}</div>

                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.zona}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(location.activa ? 'disponible' : 'inactiva')}`}>
                  {getStatusIcon(location.activa ? 'disponible' : 'inactiva')}
                  {(location.activa ? 'DISPONIBLE' : 'INACTIVA')}
                </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.capacidad_maxima} unidades
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>0 / {location.capacidad_maxima}</span>
                          <span>{occupancyPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              occupancyPercentage >= 90 ? 'bg-red-500' :
                              occupancyPercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      onClick={() => onEdit(location)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Vista de Mapa
interface MapViewProps {
  warehouseMap: WarehouseMap | null;
  locations: Location[];
  onLocationClick: (location: Location) => void;
}

const MapView: React.FC<MapViewProps> = ({ warehouseMap, locations, onLocationClick }) => {
  if (!warehouseMap) {
    return (
      <div className="text-center py-12">
        <Navigation className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Mapa no disponible</h3>
        <p className="text-gray-600">El mapa del almacén se está generando.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Mapa del Almacén</h3>
      
      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-600">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-sm text-gray-600">Ocupada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm text-gray-600">Llena</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-500 rounded"></div>
          <span className="text-sm text-gray-600">Mantenimiento</span>
        </div>
      </div>
      
      {/* Mapa por Zonas */}
      <div className="space-y-6">
        {warehouseMap.zonas.map((zona) => {
          const zoneLocations = locations.filter(loc => loc.zona === zona.nombre);
          
          return (
            <div key={zona.nombre} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">{zona.nombre}</h4>
              <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-1">
                {zoneLocations.map((location) => {
                  const occupancyPercentage = 0; // Sin información de stock actual
                  
                  let bgColor = 'bg-green-500'; // disponible
                  if (!location.activa) bgColor = 'bg-gray-500';
                  else if (occupancyPercentage >= 90) bgColor = 'bg-red-500'; // llena
                  else if (occupancyPercentage > 0) bgColor = 'bg-yellow-500'; // ocupada
                  
                  return (
                    <button
                      key={location.id}
                      onClick={() => onLocationClick(location)}
                      className={`w-8 h-8 ${bgColor} rounded text-white text-xs font-medium hover:opacity-80 transition-opacity flex items-center justify-center`}
                      title={`${location.codigo} - ${location.activa ? 'Disponible' : 'Inactiva'} (${occupancyPercentage.toFixed(0)}%)`}
                    >
                      {location.codigo?.slice(-2) || '??'}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Modal de Ubicación
interface LocationModalProps {
  location: Location | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: Partial<Location>) => void;
  processing: boolean;
}

const LocationModal: React.FC<LocationModalProps> = ({
  location,
  isOpen,
  onClose,
  onSave,
  processing
}) => {
  const [formData, setFormData] = useState<Partial<Location>>({
    codigo: location?.codigo || '',
    zona: location?.zona || '',
    capacidad_maxima: location?.capacidad_maxima || 0,
    tipo: location?.tipo || 'flotante',
    activa: location?.activa ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.codigo || !formData.zona || !formData.capacidad_maxima) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }
    
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={location ? 'Editar Ubicación' : 'Nueva Ubicación'}>
      <ModalDescription>
        {location ? 'Modifica los datos de la ubicación seleccionada' : 'Crea una nueva ubicación en el almacén'}
      </ModalDescription>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código *
            </label>
            <input
              type="text"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: A01-01"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zona *
            </label>
            <input
              type="text"
              value={formData.zona}
              onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Zona A"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capacidad Máxima *
            </label>
            <input
              type="number"
              min="1"
              value={formData.capacidad_maxima}
              onChange={(e) => setFormData({ ...formData, capacidad_maxima: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Ubicación
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'fija' | 'flotante' | 'picking' | 'reserva' | 'cuarentena' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fija">Fija</option>
              <option value="flotante">Flotante</option>
              <option value="picking">Picking</option>
              <option value="reserva">Reserva</option>
              <option value="cuarentena">Cuarentena</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.activa}
                onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                className="mr-2"
              />
              <span>Ubicación activa</span>
            </div>
          </div>
          

        </div>
        

        

        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={processing}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            disabled={processing}
          >
            {processing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Modal de Movimiento de Stock
interface MoveStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (data: {
    materialId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    reason: string;
  }) => void;
  processing: boolean;
  locations: Location[];
}

const MoveStockModal: React.FC<MoveStockModalProps> = ({
  isOpen,
  onClose,
  onMove,
  processing,
  locations
}) => {
  const [formData, setFormData] = useState({
    materialId: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: 0,
    reason: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.materialId || !formData.fromLocationId || !formData.toLocationId || !formData.quantity || !formData.reason) {
      toast.error('Por favor complete todos los campos');
      return;
    }
    
    if (formData.fromLocationId === formData.toLocationId) {
      toast.error('La ubicación de origen y destino no pueden ser la misma');
      return;
    }
    
    onMove(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mover Stock">
      <ModalDescription>
        Transfiere materiales entre diferentes ubicaciones del almacén
      </ModalDescription>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Material ID *
          </label>
          <input
            type="text"
            value={formData.materialId}
            onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ID del material a mover"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación Origen *
            </label>
            <select
              value={formData.fromLocationId}
              onChange={(e) => setFormData({ ...formData, fromLocationId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar origen</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.codigo} - {location.zona}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación Destino *
            </label>
            <select
              value={formData.toLocationId}
              onChange={(e) => setFormData({ ...formData, toLocationId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar destino</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.codigo} - {location.zona}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cantidad *
          </label>
          <input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo *
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Especifique el motivo del movimiento..."
            required
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={processing}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            disabled={processing}
          >
            {processing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Move className="w-4 h-4 mr-2" />
                Mover Stock
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};