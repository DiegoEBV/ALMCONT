import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, Circle, Polygon, Marker, Popup } from 'react-leaflet';
import { LatLng, Map as LeafletMap } from 'leaflet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { 
  MapPin, 
  Circle as CircleIcon, 
  Pentagon as PolygonIcon,
  Save,
  X,
  Trash2,
  Edit3,
  Plus
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface GeofenceMapDrawerProps {
  center?: [number, number];
  zoom?: number;
  onGeofenceCreated: (geofence: {
    name: string;
    geometry_type: 'circle' | 'polygon';
    coordinates: Array<{lat: number; lng: number}>;
    radius?: number;
    center_lat?: number;
    center_lng?: number;
  }) => void;
  onCancel: () => void;
  existingGeofences?: Array<{
    id: string;
    name: string;
    geometry_type?: 'circle' | 'polygon';
    coordinates: Array<{lat: number; lng: number}>;
    radius?: number;
    center_lat?: number;
    center_lng?: number;
    is_active: boolean;
  }>;
}

interface DrawingState {
  mode: 'none' | 'circle' | 'polygon';
  isDrawing: boolean;
  circleCenter?: LatLng;
  circleRadius?: number;
  polygonPoints: LatLng[];
  tempGeofence?: {
    name: string;
    geometry_type: 'circle' | 'polygon';
    coordinates: Array<{lat: number; lng: number}>;
    radius?: number;
    center_lat?: number;
    center_lng?: number;
  };
}

// Drawing component that handles map events
const MapDrawingHandler: React.FC<{
  drawingState: DrawingState;
  onDrawingStateChange: (state: Partial<DrawingState>) => void;
}> = ({ drawingState, onDrawingStateChange }) => {
  const map = useMapEvents({
    click: (e) => {
      if (drawingState.mode === 'circle' && !drawingState.isDrawing) {
        // Start drawing circle
        onDrawingStateChange({
          isDrawing: true,
          circleCenter: e.latlng,
          circleRadius: 100 // Default radius in meters
        });
      } else if (drawingState.mode === 'circle' && drawingState.isDrawing && drawingState.circleCenter) {
        // Second click - finalize circle
        const radius = drawingState.circleCenter.distanceTo(e.latlng);
        onDrawingStateChange({
          circleRadius: radius,
          isDrawing: false
        });
        // Auto-trigger finish circle drawing
        setTimeout(() => {
          if (drawingState.circleCenter && radius > 0) {
            const coordinates = Array.from({ length: 32 }, (_, i) => {
              const angle = (i / 32) * 2 * Math.PI;
              const lat = drawingState.circleCenter!.lat + (radius / 111320) * Math.cos(angle);
              const lng = drawingState.circleCenter!.lng + (radius / (111320 * Math.cos(drawingState.circleCenter!.lat * Math.PI / 180))) * Math.sin(angle);
              return { lat, lng };
            });
            
            onDrawingStateChange({
              tempGeofence: {
                name: '',
                geometry_type: 'circle',
                coordinates,
                radius: radius,
                center_lat: drawingState.circleCenter.lat,
                center_lng: drawingState.circleCenter.lng
              }
            });
            
            // Show name input - this will be handled in the parent component
          }
        }, 100);
      } else if (drawingState.mode === 'polygon') {
        // Add point to polygon
        const newPoints = [...drawingState.polygonPoints, e.latlng];
        onDrawingStateChange({
          polygonPoints: newPoints
        });
      }
    },
    mousemove: (e) => {
      if (drawingState.mode === 'circle' && drawingState.isDrawing && drawingState.circleCenter) {
        // Update circle radius based on mouse position
        const radius = drawingState.circleCenter.distanceTo(e.latlng);
        onDrawingStateChange({
          circleRadius: radius
        });
      }
    },
    dblclick: (e) => {
      if (drawingState.mode === 'polygon' && drawingState.polygonPoints.length >= 3) {
        // Finish polygon drawing
        onDrawingStateChange({
          mode: 'none',
          isDrawing: false
        });
      }
    }
  });

  return null;
};

const GeofenceMapDrawer: React.FC<GeofenceMapDrawerProps> = ({
  center = [-12.0464, -77.0428],
  zoom = 13,
  onGeofenceCreated,
  onCancel,
  existingGeofences = []
}) => {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    mode: 'none',
    isDrawing: false,
    polygonPoints: []
  });
  
  const [geofenceName, setGeofenceName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const mapRef = useRef<LeafletMap>(null);

  const updateDrawingState = (updates: Partial<DrawingState>) => {
    setDrawingState(prev => ({ ...prev, ...updates }));
  };



  const startCircleDrawing = () => {
    setDrawingState({
      mode: 'circle',
      isDrawing: false,
      polygonPoints: [],
      circleCenter: undefined,
      circleRadius: undefined
    });
    toast.info('Haga clic para colocar el centro, luego haga clic nuevamente para definir el radio');
  };

  const startPolygonDrawing = () => {
    setDrawingState({
      mode: 'polygon',
      isDrawing: false,
      polygonPoints: [],
      circleCenter: undefined,
      circleRadius: undefined
    });
    toast.info('Haga clic en el mapa para agregar puntos. Doble clic para finalizar.');
  };

  const finishCircleDrawing = () => {
    if (drawingState.circleCenter && drawingState.circleRadius) {
      setShowNameInput(true);
      const coordinates = generateCircleCoordinates(
        drawingState.circleCenter.lat,
        drawingState.circleCenter.lng,
        drawingState.circleRadius
      );
      
      setDrawingState(prev => ({
        ...prev,
        tempGeofence: {
          name: '',
          geometry_type: 'circle',
          coordinates,
          radius: drawingState.circleRadius,
          center_lat: drawingState.circleCenter!.lat,
          center_lng: drawingState.circleCenter!.lng
        }
      }));
    }
  };

  const finishPolygonDrawing = () => {
    if (drawingState.polygonPoints.length >= 3) {
      setShowNameInput(true);
      const coordinates = drawingState.polygonPoints.map(point => ({
        lat: point.lat,
        lng: point.lng
      }));
      
      setDrawingState(prev => ({
        ...prev,
        tempGeofence: {
          name: '',
          geometry_type: 'polygon',
          coordinates
        }
      }));
    }
  };

  const generateCircleCoordinates = (centerLat: number, centerLng: number, radius: number) => {
    const coordinates = [];
    const radiusInDegrees = radius / 111320; // Approximate conversion from meters to degrees
    
    for (let i = 0; i < 32; i++) {
      const angle = (i * 360 / 32) * (Math.PI / 180);
      const lat = centerLat + radiusInDegrees * Math.cos(angle);
      const lng = centerLng + radiusInDegrees * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
      coordinates.push({ lat, lng });
    }
    
    return coordinates;
  };

  const saveGeofence = () => {
    if (!geofenceName.trim()) {
      toast.error('Por favor ingrese un nombre para la geocerca');
      return;
    }

    if (drawingState.tempGeofence) {
      onGeofenceCreated({
        ...drawingState.tempGeofence,
        name: geofenceName
      });
      
      // Reset state
      setDrawingState({
        mode: 'none',
        isDrawing: false,
        polygonPoints: []
      });
      setGeofenceName('');
      setShowNameInput(false);
      
      toast.success('Geocerca creada correctamente');
    }
  };

  const cancelDrawing = () => {
    setDrawingState({
      mode: 'none',
      isDrawing: false,
      polygonPoints: []
    });
    setGeofenceName('');
    setShowNameInput(false);
  };

  const clearPolygon = () => {
    setDrawingState(prev => ({
      ...prev,
      polygonPoints: []
    }));
  };

  const removeLastPoint = () => {
    setDrawingState(prev => ({
      ...prev,
      polygonPoints: prev.polygonPoints.slice(0, -1)
    }));
  };

  return (
    <div className="relative w-full h-full">
      {/* Drawing Controls */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Dibujar Geocerca
        </h3>
        
        <div className="flex flex-col gap-2">
          <Button
            onClick={startCircleDrawing}
            variant={drawingState.mode === 'circle' ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            <CircleIcon className="w-4 h-4" />
            Círculo
          </Button>
          
          <Button
            onClick={startPolygonDrawing}
            variant={drawingState.mode === 'polygon' ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            <PolygonIcon className="w-4 h-4" />
            Polígono
          </Button>
        </div>

        {/* Circle Drawing Controls */}
        {drawingState.mode === 'circle' && drawingState.circleCenter && (
          <div className="border-t pt-3 space-y-2">
            <div className="text-sm text-gray-600">
              Radio: {Math.round(drawingState.circleRadius || 0)}m
            </div>
            <div className="flex gap-2">
              <Button
                onClick={finishCircleDrawing}
                size="sm"
                className="flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                Confirmar
              </Button>
              <Button
                onClick={cancelDrawing}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Polygon Drawing Controls */}
        {drawingState.mode === 'polygon' && (
          <div className="border-t pt-3 space-y-2">
            <div className="text-sm text-gray-600">
              Puntos: {drawingState.polygonPoints.length}
            </div>
            {drawingState.polygonPoints.length > 0 && (
              <div className="flex gap-2">
                {drawingState.polygonPoints.length >= 3 && (
                  <Button
                    onClick={finishPolygonDrawing}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    Finalizar
                  </Button>
                )}
                <Button
                  onClick={removeLastPoint}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  Deshacer
                </Button>
                <Button
                  onClick={clearPolygon}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpiar
                </Button>
              </div>
            )}
            <Button
              onClick={cancelDrawing}
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Cancelar
            </Button>
          </div>
        )}

        {/* General Cancel Button */}
        {drawingState.mode === 'none' && (
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Cerrar
          </Button>
        )}
      </div>

      {/* Name Input Modal */}
      {showNameInput && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Nombre de la Geocerca</h3>
            <Input
              type="text"
              value={geofenceName}
              onChange={(e) => setGeofenceName(e.target.value)}
              placeholder="Ingrese el nombre de la geocerca"
              className="mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowNameInput(false)}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={saveGeofence}
                disabled={!geofenceName.trim()}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Map Drawing Handler */}
        <MapDrawingHandler
          drawingState={drawingState}
          onDrawingStateChange={updateDrawingState}
        />

        {/* Existing Geofences */}
        {existingGeofences.map((geofence) => {
          if (!geofence.is_active) return null;
          
          const positions: [number, number][] = geofence.coordinates.map(coord => [
            coord.lat,
            coord.lng
          ]);

          return (
            <Polygon
              key={geofence.id}
              positions={positions}
              pathOptions={{
                color: '#6b7280',
                weight: 2,
                opacity: 0.6,
                fillColor: '#6b7280',
                fillOpacity: 0.1,
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-sm">{geofence.name}</h3>
                  <p className="text-xs text-gray-600">Geocerca existente</p>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Current Drawing - Circle */}
        {drawingState.mode === 'circle' && drawingState.circleCenter && drawingState.circleRadius && (
          <Circle
            center={[drawingState.circleCenter.lat, drawingState.circleCenter.lng]}
            radius={drawingState.circleRadius}
            pathOptions={{
              color: '#3b82f6',
              weight: 2,
              opacity: 0.8,
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
            }}
          />
        )}

        {/* Current Drawing - Polygon */}
        {drawingState.mode === 'polygon' && drawingState.polygonPoints.length > 0 && (
          <>
            {/* Polygon points as markers */}
            {drawingState.polygonPoints.map((point, index) => (
              <Marker
                key={index}
                position={[point.lat, point.lng]}
              >
                <Popup>
                  <div className="text-xs">
                    Punto {index + 1}
                  </div>
                </Popup>
              </Marker>
            ))}
            
            {/* Polygon shape (if at least 3 points) */}
            {drawingState.polygonPoints.length >= 3 && (
              <Polygon
                positions={drawingState.polygonPoints.map(p => [p.lat, p.lng])}
                pathOptions={{
                  color: '#3b82f6',
                  weight: 2,
                  opacity: 0.8,
                  fillColor: '#3b82f6',
                  fillOpacity: 0.2,
                }}
              />
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default GeofenceMapDrawer;