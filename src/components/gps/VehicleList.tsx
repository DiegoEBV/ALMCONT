import React from 'react';
import { Vehicle } from '../../types/gps';
import { Truck, Navigation, Battery, Signal, MapPin, Clock } from 'lucide-react';
import { Card } from '../ui/card';

interface VehicleListProps {
  vehicles: Vehicle[];
  selectedVehicle?: Vehicle | null;
  onVehicleSelect: (vehicle: Vehicle) => void;
  className?: string;
}

const VehicleList: React.FC<VehicleListProps> = ({
  vehicles,
  selectedVehicle,
  onVehicleSelect,
  className = ''
}) => {
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
      case 'moving': return 'bg-green-100 text-green-800 border-green-200';
      case 'idle': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'offline': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const formatSpeed = (speed: number) => {
    return `${Math.round(speed)} km/h`;
  };

  const formatBattery = (battery: number) => {
    return `${Math.round(battery)}%`;
  };

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Ahora';
    if (diffMinutes < 60) return `Hace ${diffMinutes}m`;
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)}h`;
    return date.toLocaleDateString('es-PE');
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600';
    if (level > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Vehículos ({vehicles.length})
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>En línea</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Detenido</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Desconectado</span>
          </div>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <Card className="p-6 text-center">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No hay vehículos registrados</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {vehicles.map((vehicle) => {
            const status = getVehicleStatus(vehicle);
            const isSelected = selectedVehicle?.id === vehicle.id;
            const location = vehicle.current_location;

            return (
              <Card
                key={vehicle.id}
                className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onVehicleSelect(vehicle)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {vehicle.plate_number}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {vehicle.model} • {vehicle.vehicle_type}
                      </p>

                      {location ? (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-gray-400" />
                            <span>{formatSpeed(location.speed)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Battery className={`w-3 h-3 ${getBatteryColor(location.battery_level)}`} />
                            <span>{formatBattery(location.battery_level)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Signal className="w-3 h-3 text-gray-400" />
                            <span>{location.satellites} sat</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{formatLastUpdate(location.recorded_at)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <span>Sin ubicación</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {location && (
                    <div className="text-right text-xs text-gray-500">
                      <div className="font-mono">
                        {location.latitude.toFixed(4)}°
                      </div>
                      <div className="font-mono">
                        {location.longitude.toFixed(4)}°
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional info when selected */}
                {isSelected && location && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">Rumbo:</span>
                        <span className="ml-1 font-medium">{Math.round(location.heading)}°</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Capacidad:</span>
                        <span className="ml-1 font-medium">{vehicle.fuel_capacity}L</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Última actualización:</span>
                        <div className="font-medium">
                          {new Date(location.recorded_at).toLocaleString('es-PE')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VehicleList;