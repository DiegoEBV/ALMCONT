import React, { useState, useEffect } from 'react';
import { Geofence, GPSAlert, Vehicle } from '../../types/gps';
import { GPSService } from '../../services/gpsService';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  MapPin,
  Shield,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Circle,
  Square,
  Pentagon as PolygonIcon
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import GeofenceForm from './GeofenceForm';
import GeofenceAlertSystem from './GeofenceAlertSystem';

interface GeofenceManagementProps {
  className?: string;
}

const GeofenceManagement: React.FC<GeofenceManagementProps> = ({ className = '' }) => {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [alerts, setAlerts] = useState<GPSAlert[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entry' | 'exit' | 'both'>('all');
  const [activeTab, setActiveTab] = useState<'geofences' | 'alerts'>('geofences');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);

  // Load geofences and alerts
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [geofencesData, alertsData, vehiclesData] = await Promise.all([
        GPSService.getGeofences(),
        GPSService.getGPSAlerts(),
        GPSService.getVehicles()
      ]);
      setGeofences(geofencesData);
      setAlerts(alertsData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar geocercas y alertas');
    } finally {
      setLoading(false);
    }
  };

  // Filter geofences
  const filteredGeofences = geofences.filter(geofence => {
    const matchesSearch = 
      geofence.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (geofence.description && geofence.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || geofence.trigger_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Filter alerts (recent alerts from last 24 hours)
  const recentAlerts = alerts
    .filter(alert => {
      const alertDate = new Date(alert.created_at);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return alertDate >= yesterday;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getGeofenceTypeIcon = (type: string) => {
    switch (type) {
      case 'circle':
        return <Circle className="w-4 h-4" />;
      case 'rectangle':
        return <Square className="w-4 h-4" />;
      case 'polygon':
        return <PolygonIcon className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getTriggerTypeColor = (type: string) => {
    switch (type) {
      case 'entry':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'exit':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'both':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTriggerTypeText = (type: string) => {
    switch (type) {
      case 'entry':
        return 'Entrada';
      case 'exit':
        return 'Salida';
      case 'both':
        return 'Entrada/Salida';
      default:
        return 'Desconocido';
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'geofence_entry':
        return 'bg-green-100 text-green-800';
      case 'geofence_exit':
        return 'bg-red-100 text-red-800';
      case 'speed_limit':
        return 'bg-yellow-100 text-yellow-800';
      case 'panic_button':
        return 'bg-red-100 text-red-800';
      case 'low_battery':
        return 'bg-orange-100 text-orange-800';
      case 'device_offline':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'geofence_entry':
        return 'Entrada a Geocerca';
      case 'geofence_exit':
        return 'Salida de Geocerca';
      case 'speed_limit':
        return 'Límite de Velocidad';
      case 'panic_button':
        return 'Botón de Pánico';
      case 'low_battery':
        return 'Batería Baja';
      case 'device_offline':
        return 'Dispositivo Desconectado';
      default:
        return 'Alerta General';
    }
  };

  const handleDeleteGeofence = async (geofenceId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta geocerca?')) {
      return;
    }

    try {
      await GPSService.deleteGeofence(geofenceId);
      toast.success('Geocerca eliminada correctamente');
      loadData();
    } catch (error) {
      console.error('Error deleting geofence:', error);
      toast.error('Error al eliminar geocerca');
    }
  };

  const toggleGeofenceActive = async (geofence: Geofence) => {
    try {
      await GPSService.updateGeofence(geofence.id, {
        ...geofence,
        is_active: !geofence.is_active
      });
      toast.success(`Geocerca ${geofence.is_active ? 'desactivada' : 'activada'} correctamente`);
      loadData();
    } catch (error) {
      console.error('Error updating geofence:', error);
      toast.error('Error al actualizar geocerca');
    }
  };

  const handleEditGeofence = (geofence: Geofence) => {
    setEditingGeofence(geofence);
    setShowAddModal(true);
  };

  const handleSaveGeofence = (geofence: Geofence) => {
    setShowAddModal(false);
    setEditingGeofence(null);
    loadData(); // Reload data to show updated geofence
  };

  const handleCancelGeofence = () => {
    setShowAddModal(false);
    setEditingGeofence(null);
  };

  const formatCoordinates = (coordinates: any) => {
    if (Array.isArray(coordinates) && coordinates.length > 0) {
      // Handle coordinate objects with lat/lng properties
      if (coordinates[0] && typeof coordinates[0] === 'object' && 'lat' in coordinates[0] && 'lng' in coordinates[0]) {
        const firstCoord = coordinates[0];
        return `${firstCoord.lat.toFixed(6)}, ${firstCoord.lng.toFixed(6)}`;
      }
      // Handle legacy coordinate arrays [lng, lat]
      if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
        return `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`;
      }
    }
    return 'Coordenadas no válidas';
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Ahora';
    if (diffMinutes < 60) return `Hace ${diffMinutes}m`;
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)}h`;
    return date.toLocaleDateString('es-PE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando geocercas y alertas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Geocercas y Alertas</h2>
          <p className="text-gray-600">Configura zonas de control y monitorea alertas del sistema</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Geocerca
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('geofences')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'geofences'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Geocercas ({geofences.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Sistema de Alertas ({recentAlerts.length})
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'geofences' && (
        <>
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar geocercas por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="entry">Solo entrada</option>
                  <option value="exit">Solo salida</option>
                  <option value="both">Entrada y salida</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Geocercas</p>
                  <p className="text-2xl font-bold text-gray-900">{geofences.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Eye className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Activas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {geofences.filter(g => g.is_active).length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <EyeOff className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Inactivas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {geofences.filter(g => !g.is_active).length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Alertas Hoy</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {recentAlerts.filter(a => 
                      new Date(a.created_at).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Geofences List */}
          <div className="space-y-4">
            {filteredGeofences.length === 0 ? (
              <Card className="p-8 text-center">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No se encontraron geocercas
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || typeFilter !== 'all' 
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Comienza creando tu primera geocerca'
                  }
                </p>
                {!searchTerm && typeFilter === 'all' && (
                  <Button onClick={() => setShowAddModal(true)}>
                    Crear Primera Geocerca
                  </Button>
                )}
              </Card>
            ) : (
              filteredGeofences.map((geofence) => (
                <Card key={geofence.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        {getGeofenceTypeIcon(geofence.geometry_type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {geofence.name}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getTriggerTypeColor(geofence.trigger_type)}`}>
                            {getTriggerTypeText(geofence.trigger_type)}
                          </span>
                          <div className="flex items-center gap-1">
                            {geofence.is_active ? (
                              <Eye className="w-4 h-4 text-green-600" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            )}
                            <span className={`text-sm ${geofence.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                              {geofence.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                        </div>

                        {geofence.description && (
                          <p className="text-gray-600 mb-3">{geofence.description}</p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Tipo de Geometría</p>
                            <p className="font-medium capitalize">{geofence.geometry_type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Centro/Coordenadas</p>
                            <p className="font-medium text-sm">
                              {formatCoordinates(geofence.coordinates)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Radio/Área</p>
                            <p className="font-medium">
                              {geofence.radius ? `${geofence.radius}m` : 'Polígono'}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Creado: {new Date(geofence.created_at).toLocaleDateString('es-PE')} • 
                          Actualizado: {new Date(geofence.updated_at).toLocaleDateString('es-PE')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleGeofenceActive(geofence)}
                        className={`flex items-center gap-2 ${
                          geofence.is_active 
                            ? 'text-gray-600 hover:text-gray-700' 
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {geofence.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {geofence.is_active ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingGeofence(geofence)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteGeofence(geofence.id)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'alerts' && (
        <GeofenceAlertSystem 
          vehicles={vehicles}
          geofences={geofences}
          onAlertClick={(alert) => {
            // Handle alert click - could show details or navigate to map
            console.log('Alert clicked:', alert);
          }}
        />
      )}

      {/* Add/Edit Geofence Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <GeofenceForm
              geofence={editingGeofence}
              vehicles={vehicles}
              onSave={handleSaveGeofence}
              onCancel={handleCancelGeofence}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GeofenceManagement;