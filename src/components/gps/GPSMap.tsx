import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Vehicle, GPSLocation, Geofence } from '../../types/gps';
import { Truck, Navigation, Battery, Signal } from 'lucide-react';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom vehicle icons
const createVehicleIcon = (vehicleType: string, isOnline: boolean) => {
  const color = isOnline ? '#10b981' : '#ef4444';
  const iconHtml = `
    <div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M20 8h-3l-1.5-1.5h-7L7 8H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2zM8.5 15.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-vehicle-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

interface GPSMapProps {
  vehicles: Vehicle[];
  selectedVehicle?: Vehicle | null;
  onVehicleSelect: (vehicle: Vehicle) => void;
  geofences?: Geofence[];
  showTrails?: boolean;
  trails?: { [vehicleId: string]: GPSLocation[] };
  center?: [number, number];
  zoom?: number;
  className?: string;
}

// Component to fit map bounds to vehicles
const MapBoundsController: React.FC<{ vehicles: Vehicle[] }> = ({ vehicles }) => {
  const map = useMap();

  useEffect(() => {
    if (vehicles.length > 0) {
      const validVehicles = vehicles.filter(v => v.current_location);
      if (validVehicles.length > 0) {
        const bounds = L.latLngBounds(
          validVehicles.map(v => [
            v.current_location!.latitude,
            v.current_location!.longitude
          ])
        );
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [vehicles, map]);

  return null;
};

// Component to render geofences
const GeofenceLayer: React.FC<{ geofences: Geofence[] }> = ({ geofences }) => {
  return (
    <>
      {geofences.map((geofence) => {
        if (!geofence.is_active) return null;
        
        const color = geofence.alert_type === 'entry' ? '#3b82f6' : 
                     geofence.alert_type === 'exit' ? '#ef4444' : '#8b5cf6';

        // Handle circular geofences
        if (geofence.geometry_type === 'circle' && geofence.center_lat && geofence.center_lng && geofence.radius) {
          const center: [number, number] = [geofence.center_lat, geofence.center_lng];
          
          return (
            <Circle
              key={geofence.id}
              center={center}
              radius={geofence.radius}
              pathOptions={{
                color: color,
                weight: 2,
                opacity: 0.8,
                fillColor: color,
                fillOpacity: 0.1,
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-sm">{geofence.name}</h3>
                  <p className="text-xs text-gray-600">
                    Tipo: {geofence.alert_type === 'entry' ? 'Entrada' : 
                           geofence.alert_type === 'exit' ? 'Salida' : 'Ambos'}
                  </p>
                  <p className="text-xs text-gray-600">
                    Radio: {geofence.radius}m
                  </p>
                  <p className="text-xs text-gray-600">
                    Horario: {geofence.active_hours.start} - {geofence.active_hours.end}
                  </p>
                </div>
              </Popup>
            </Circle>
          );
        }

        // Handle polygon geofences
        const positions: [number, number][] = geofence.coordinates.map(coord => [
          coord.lat,
          coord.lng
        ]);

        return (
          <Polygon
            key={geofence.id}
            positions={positions}
            pathOptions={{
              color: color,
              weight: 2,
              opacity: 0.8,
              fillColor: color,
              fillOpacity: 0.1,
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm">{geofence.name}</h3>
                <p className="text-xs text-gray-600">
                  Tipo: {geofence.alert_type === 'entry' ? 'Entrada' : 
                         geofence.alert_type === 'exit' ? 'Salida' : 'Ambos'}
                </p>
                <p className="text-xs text-gray-600">
                  Horario: {geofence.active_hours.start} - {geofence.active_hours.end}
                </p>
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
};

const GPSMap: React.FC<GPSMapProps> = ({
  vehicles,
  selectedVehicle,
  onVehicleSelect,
  geofences = [],
  showTrails = false,
  trails = {},
  center = [-12.0464, -77.0428], // Lima, Peru default
  zoom = 13,
  className = ''
}) => {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  const vehiclesWithLocation = vehicles.filter(v => v.current_location);

  const formatSpeed = (speed: number) => {
    return `${Math.round(speed)} km/h`;
  };

  const formatBattery = (battery: number) => {
    return `${Math.round(battery)}%`;
  };

  const getVehicleStatus = (vehicle: Vehicle) => {
    if (!vehicle.current_location) return 'offline';
    
    const lastUpdate = new Date(vehicle.current_location.recorded_at);
    const now = new Date();
    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    if (minutesSinceUpdate > 10) return 'offline';
    if (vehicle.current_location.speed > 5) return 'moving';
    return 'idle';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'moving': return 'text-green-600';
      case 'idle': return 'text-yellow-600';
      case 'offline': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'moving': return 'En movimiento';
      case 'idle': return 'Detenido';
      case 'offline': return 'Desconectado';
      default: return 'Desconocido';
    }
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full rounded-lg"
        whenReady={() => setMapReady(true)}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit bounds to vehicles */}
        {mapReady && vehiclesWithLocation.length > 0 && (
          <MapBoundsController vehicles={vehiclesWithLocation} />
        )}

        {/* Render geofences */}
        {geofences.length > 0 && <GeofenceLayer geofences={geofences} />}

        {/* Render vehicle trails */}
        {showTrails && Object.entries(trails).map(([vehicleId, locations]) => {
          if (locations.length < 2) return null;
          
          const positions: [number, number][] = locations.map(loc => [
            loc.latitude,
            loc.longitude
          ]);

          return (
            <Polyline
              key={`trail-${vehicleId}`}
              positions={positions}
              pathOptions={{
                color: '#6366f1',
                weight: 3,
                opacity: 0.7,
              }}
            />
          );
        })}

        {/* Render vehicle markers */}
        {vehiclesWithLocation.map((vehicle) => {
          const location = vehicle.current_location!;
          const status = getVehicleStatus(vehicle);
          const isSelected = selectedVehicle?.id === vehicle.id;

          return (
            <Marker
              key={vehicle.id}
              position={[location.latitude, location.longitude]}
              icon={createVehicleIcon(vehicle.vehicle_type, status !== 'offline')}
              eventHandlers={{
                click: () => onVehicleSelect(vehicle),
              }}
            >
              <Popup>
                <div className="p-3 min-w-[250px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-sm">{vehicle.plate_number}</h3>
                    <span className={`text-xs font-medium ${getStatusColor(status)}`}>
                      {getStatusText(status)}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <p><strong>Modelo:</strong> {vehicle.model}</p>
                    <p><strong>Tipo:</strong> {vehicle.vehicle_type}</p>
                    
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        <span>{formatSpeed(location.speed)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Battery className="w-3 h-3" />
                        <span>{formatBattery(location.battery_level)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Signal className="w-3 h-3" />
                        <span>{location.satellites} sat</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-500 mt-2">
                      <strong>Última actualización:</strong><br />
                      {new Date(location.recorded_at).toLocaleString('es-PE')}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
        <h4 className="font-semibold mb-2">Leyenda</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>En línea</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Desconectado</span>
          </div>
          {geofences.length > 0 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
              <div className="w-3 h-1 bg-blue-500"></div>
              <span>Geocercas</span>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle count indicator */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 text-xs">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600" />
          <span className="font-medium">
            {vehiclesWithLocation.length} de {vehicles.length} vehículos
          </span>
        </div>
      </div>
    </div>
  );
};

export default GPSMap;