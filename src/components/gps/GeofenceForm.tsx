import React, { useState, useEffect } from 'react';
import { Geofence, Vehicle } from '../../types/gps';
import { GPSService } from '../../services/gpsService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import GeofenceMapDrawer from './GeofenceMapDrawer';
import { 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Circle, 
  Square, 
  Pentagon as PolygonIcon,
  Plus,
  Minus,
  Map
} from 'lucide-react';

interface GeofenceFormProps {
  geofence?: Geofence | null;
  vehicles: Vehicle[];
  onSave: (geofence: Geofence) => void;
  onCancel: () => void;
}

interface CoordinatePoint {
  lat: number;
  lng: number;
}

const GeofenceForm: React.FC<GeofenceFormProps> = ({
  geofence,
  vehicles,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    geometry_type: 'circle' as 'circle' | 'polygon',
    coordinates: [] as CoordinatePoint[],
    radius: 100,
    center_lat: -12.0464,
    center_lng: -77.0428,
    alert_type: 'both' as 'entry' | 'exit' | 'both',
    active_hours: {
      start: '00:00',
      end: '23:59'
    },
    is_active: true,
    trigger_type: 'both' as 'entry' | 'exit' | 'both',
    assigned_vehicles: [] as string[]
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMapDrawer, setShowMapDrawer] = useState(false);

  useEffect(() => {
    if (geofence) {
      setFormData({
        name: geofence.name,
        description: geofence.description || '',
        geometry_type: geofence.geometry_type || 'circle',
        coordinates: geofence.coordinates || [],
        radius: geofence.radius || 100,
        center_lat: geofence.center_lat || -12.0464,
        center_lng: geofence.center_lng || -77.0428,
        alert_type: geofence.alert_type,
        active_hours: geofence.active_hours,
        is_active: geofence.is_active,
        trigger_type: geofence.trigger_type || geofence.alert_type,
        assigned_vehicles: []
      });
    }
  }, [geofence]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (formData.name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    if (formData.geometry_type === 'circle') {
      if (!formData.center_lat || !formData.center_lng) {
        newErrors.coordinates = 'Las coordenadas del centro son requeridas';
      }
      if (isNaN(formData.center_lat) || isNaN(formData.center_lng)) {
        newErrors.coordinates = 'Las coordenadas deben ser números válidos';
      }
      if (Math.abs(formData.center_lat) > 90 || Math.abs(formData.center_lng) > 180) {
        newErrors.coordinates = 'Las coordenadas están fuera del rango válido';
      }
      if (!formData.radius || formData.radius <= 0) {
        newErrors.radius = 'El radio debe ser mayor a 0';
      }
      if (formData.radius > 50000) {
        newErrors.radius = 'El radio no puede ser mayor a 50 km';
      }
    } else if (formData.geometry_type === 'polygon') {
      if (formData.coordinates.length < 3) {
        newErrors.coordinates = 'Un polígono debe tener al menos 3 puntos';
      }
      // Validate polygon coordinates
      for (const coord of formData.coordinates) {
        if (isNaN(coord.lat) || isNaN(coord.lng)) {
          newErrors.coordinates = 'Todas las coordenadas deben ser números válidos';
          break;
        }
        if (Math.abs(coord.lat) > 90 || Math.abs(coord.lng) > 180) {
          newErrors.coordinates = 'Las coordenadas están fuera del rango válido';
          break;
        }
      }
    }

    if (!formData.active_hours.start || !formData.active_hours.end) {
      newErrors.active_hours = 'Las horas activas son requeridas';
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.active_hours.start)) {
      newErrors.active_hours = 'Formato de hora de inicio inválido (HH:MM)';
    }
    if (!timeRegex.test(formData.active_hours.end)) {
      newErrors.active_hours = 'Formato de hora de fin inválido (HH:MM)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof typeof prev] as any,
        [field]: value
      }
    }));
  };

  const addCoordinate = () => {
    setFormData(prev => ({
      ...prev,
      coordinates: [
        ...prev.coordinates,
        { lat: -12.0464, lng: -77.0428 }
      ]
    }));
  };

  const removeCoordinate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      coordinates: prev.coordinates.filter((_, i) => i !== index)
    }));
  };

  const updateCoordinate = (index: number, field: 'lat' | 'lng', value: number) => {
    setFormData(prev => ({
      ...prev,
      coordinates: prev.coordinates.map((coord, i) => 
        i === index ? { ...coord, [field]: value } : coord
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let coordinates: CoordinatePoint[] = [];
      
      if (formData.geometry_type === 'circle') {
        // Generate circle coordinates
        const centerLat = formData.center_lat;
        const centerLng = formData.center_lng;
        const radius = formData.radius;
        
        // Convert radius from meters to degrees (approximate)
        const radiusInDegrees = radius / 111320;
        
        coordinates = [];
        for (let i = 0; i < 32; i++) {
          const angle = (i * 360 / 32) * (Math.PI / 180);
          const lat = centerLat + radiusInDegrees * Math.cos(angle);
          const lng = centerLng + radiusInDegrees * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
          coordinates.push({ lat, lng });
        }
      } else {
        coordinates = formData.coordinates;
      }

      const geofenceData = {
        name: formData.name,
        description: formData.description,
        geometry_type: formData.geometry_type,
        coordinates,
        radius: formData.geometry_type === 'circle' ? formData.radius : undefined,
        center_lat: formData.geometry_type === 'circle' ? formData.center_lat : undefined,
        center_lng: formData.geometry_type === 'circle' ? formData.center_lng : undefined,
        alert_type: formData.alert_type,
        active_hours: formData.active_hours,
        is_active: formData.is_active,
        trigger_type: formData.trigger_type
      };

      let savedGeofence: Geofence;
      
      if (geofence) {
        savedGeofence = await GPSService.updateGeofence(geofence.id, geofenceData);
        toast.success('Geocerca actualizada correctamente');
      } else {
        savedGeofence = await GPSService.createGeofence(geofenceData);
        toast.success('Geocerca creada correctamente');
      }

      onSave(savedGeofence);
    } catch (error: any) {
      console.error('Error saving geofence:', error);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Error al guardar la geocerca';
      
      if (error?.message) {
        if (error.message.includes('duplicate key')) {
          errorMessage = 'Ya existe una geocerca con ese nombre';
        } else if (error.message.includes('invalid input')) {
          errorMessage = 'Los datos ingresados no son válidos';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'No tiene permisos para realizar esta acción';
        } else if (error.message.includes('network')) {
          errorMessage = 'Error de conexión. Verifique su internet';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
      
      // Set form-level error for display
      setErrors(prev => ({
        ...prev,
        submit: errorMessage
      }));
    } finally {
      setLoading(false);
    }
  };

  const getGeometryIcon = (type: string) => {
    switch (type) {
      case 'circle':
        return <Circle className="w-4 h-4" />;
      case 'polygon':
        return <PolygonIcon className="w-4 h-4" />;
      default:
        return <Square className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {geofence ? 'Editar Geocerca' : 'Nueva Geocerca'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ej: Zona Centro, Almacén Principal"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Alerta *
              </label>
              <select
                value={formData.alert_type}
                onChange={(e) => handleInputChange('alert_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="entry">Solo Entrada</option>
                <option value="exit">Solo Salida</option>
                <option value="both">Entrada y Salida</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descripción opcional de la geocerca"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Geometry Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Geometría *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleInputChange('geometry_type', 'circle')}
                className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-colors ${
                  formData.geometry_type === 'circle'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Circle className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Circular</div>
                  <div className="text-sm text-gray-600">Área circular con radio fijo</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleInputChange('geometry_type', 'polygon')}
                className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-colors ${
                  formData.geometry_type === 'polygon'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <PolygonIcon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Polígono</div>
                  <div className="text-sm text-gray-600">Área personalizada con múltiples puntos</div>
                </div>
              </button>
            </div>
          </div>

          {/* Map Drawing Button */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Configuración de Área</h3>
                <p className="text-sm text-gray-600">
                  {formData.geometry_type === 'circle' 
                    ? 'Configure las coordenadas del centro y radio, o use el mapa interactivo'
                    : 'Defina los puntos del polígono manualmente o use el mapa interactivo'
                  }
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setShowMapDrawer(true)}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Map className="w-4 h-4" />
                Dibujar en Mapa
              </Button>
            </div>
          </div>

          {/* Coordinates Configuration */}
          {formData.geometry_type === 'circle' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitud del Centro *
                </label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formData.center_lat}
                  onChange={(e) => handleInputChange('center_lat', parseFloat(e.target.value))}
                  placeholder="-12.0464"
                  className={errors.coordinates ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitud del Centro *
                </label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formData.center_lng}
                  onChange={(e) => handleInputChange('center_lng', parseFloat(e.target.value))}
                  placeholder="-77.0428"
                  className={errors.coordinates ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Radio (metros) *
                </label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formData.radius}
                  onChange={(e) => handleInputChange('radius', parseFloat(e.target.value) || 0)}
                  placeholder="100"
                  className={errors.radius ? 'border-red-500' : ''}
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Coordenadas del Polígono *
                </label>
                <Button
                  type="button"
                  onClick={addCoordinate}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Punto
                </Button>
              </div>
              
              {formData.coordinates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PolygonIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No hay puntos definidos</p>
                  <p className="text-sm">Haga clic en "Agregar Punto" para comenzar</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {formData.coordinates.map((coord, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600 w-8">
                        {index + 1}
                      </span>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          step="0.000001"
                          value={coord.lat}
                          onChange={(e) => updateCoordinate(index, 'lat', parseFloat(e.target.value))}
                          placeholder="Latitud"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          step="0.000001"
                          value={coord.lng}
                          onChange={(e) => updateCoordinate(index, 'lng', parseFloat(e.target.value))}
                          placeholder="Longitud"
                          className="text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeCoordinate(index)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {errors.coordinates && (
                <p className="text-red-500 text-sm mt-2">{errors.coordinates}</p>
              )}
            </div>
          )}

          {/* Active Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horario Activo *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hora de Inicio</label>
                <Input
                  type="time"
                  value={formData.active_hours.start}
                  onChange={(e) => handleNestedInputChange('active_hours', 'start', e.target.value)}
                  className={errors.active_hours ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hora de Fin</label>
                <Input
                  type="time"
                  value={formData.active_hours.end}
                  onChange={(e) => handleNestedInputChange('active_hours', 'end', e.target.value)}
                  className={errors.active_hours ? 'border-red-500' : ''}
                />
              </div>
            </div>
            {errors.active_hours && (
              <p className="text-red-500 text-sm mt-1">{errors.active_hours}</p>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Geocerca activa
            </label>
          </div>

          {/* Form-level error display */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">{errors.submit}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  {getGeometryIcon(formData.geometry_type)}
                  {geofence ? 'Actualizar' : 'Crear'} Geocerca
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Map Drawer Modal */}
      {showMapDrawer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full h-full max-w-6xl max-h-[90vh] m-4 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Dibujar Geocerca en Mapa
              </h3>
            </div>
            <div className="flex-1 relative">
              <GeofenceMapDrawer
                center={[formData.center_lat, formData.center_lng]}
                onGeofenceCreated={(geofenceData) => {
                  setFormData(prev => ({
                    ...prev,
                    geometry_type: geofenceData.geometry_type,
                    coordinates: geofenceData.coordinates,
                    radius: geofenceData.radius || prev.radius,
                    center_lat: geofenceData.center_lat || prev.center_lat,
                    center_lng: geofenceData.center_lng || prev.center_lng
                  }));
                  setShowMapDrawer(false);
                  toast.success('Área configurada desde el mapa');
                }}
                onCancel={() => setShowMapDrawer(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeofenceForm;