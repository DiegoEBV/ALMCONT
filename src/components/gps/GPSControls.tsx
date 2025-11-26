import React, { useState } from 'react';
import { MapFilter, VehicleStatus } from '../../types/gps';
import { 
  Filter, 
  Search, 
  RefreshCw, 
  Settings, 
  Eye, 
  EyeOff,
  Layers,
  Navigation,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/Button';

interface GPSControlsProps {
  filter: MapFilter;
  onFilterChange: (filter: MapFilter) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  showGeofences: boolean;
  onToggleGeofences: (show: boolean) => void;
  showTrails: boolean;
  onToggleTrails: (show: boolean) => void;
  onCenterMap?: () => void;
  onShowAlerts?: () => void;
  className?: string;
}

const GPSControls: React.FC<GPSControlsProps> = ({
  filter,
  onFilterChange,
  onRefresh,
  isRefreshing = false,
  showGeofences,
  onToggleGeofences,
  showTrails,
  onToggleTrails,
  onCenterMap,
  onShowAlerts,
  className = ''
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const handleStatusFilter = (status: VehicleStatus | 'all') => {
    onFilterChange({
      ...filter,
      status: status === 'all' ? undefined : (status as unknown as string)
    });
  };

  const handleSearchChange = (search: string) => {
    onFilterChange({
      ...filter,
      search: search || undefined
    });
  };

  const getStatusCount = (status: string) => {
    // This would be calculated from actual vehicle data
    // For now, returning placeholder values
    switch (status) {
      case 'moving': return 5;
      case 'idle': return 3;
      case 'offline': return 2;
      default: return 0;
    }
  };

  const statusOptions = [
    { value: 'all', label: 'Todos', count: 10, color: 'bg-gray-500' },
    { value: 'moving', label: 'En movimiento', count: getStatusCount('moving'), color: 'bg-green-500' },
    { value: 'idle', label: 'Detenidos', count: getStatusCount('idle'), color: 'bg-yellow-500' },
    { value: 'offline', label: 'Desconectados', count: getStatusCount('offline'), color: 'bg-red-500' }
  ];

  return (
    <Card className={`p-4 ${className}`}>
      {/* Main Controls Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Control GPS
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar vehículo por placa, modelo o conductor..."
          value={filter.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleStatusFilter(option.value as VehicleStatus | 'all')}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              (option.value === 'all' && !filter.status) || filter.status === option.value
                ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${option.color}`}></div>
            <span>{option.label}</span>
            <span className="bg-white px-1.5 py-0.5 rounded-full text-xs">
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* Map Layer Controls */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700">Capas del mapa</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleGeofences(!showGeofences)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              showGeofences
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showGeofences ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Geocercas
          </button>
          
          <button
            onClick={() => onToggleTrails(!showTrails)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              showTrails
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showTrails ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Rutas
          </button>
        </div>
      </div>

      {/* Advanced Filters (Collapsible) */}
      {showFilters && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de vehículo
              </label>
              <select
                value={filter.vehicleType || ''}
                onChange={(e) => onFilterChange({
                  ...filter,
                  vehicleType: e.target.value || undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los tipos</option>
                <option value="truck">Camión</option>
                <option value="van">Camioneta</option>
                <option value="car">Automóvil</option>
                <option value="motorcycle">Motocicleta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Obra asignada
              </label>
              <select
                value={filter.assignedWork || ''}
                onChange={(e) => onFilterChange({
                  ...filter,
                  assignedWork: e.target.value || undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las obras</option>
                <option value="obra-1">Obra Centro Comercial</option>
                <option value="obra-2">Obra Residencial Norte</option>
                <option value="obra-3">Obra Industrial Sur</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Velocidad mínima (km/h)
              </label>
              <input
                type="number"
                min="0"
                max="200"
                value={filter.minSpeed || ''}
                onChange={(e) => onFilterChange({
                  ...filter,
                  minSpeed: e.target.value ? parseInt(e.target.value) : undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batería mínima (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={filter.minBattery || ''}
                onChange={(e) => onFilterChange({
                  ...filter,
                  minBattery: e.target.value ? parseInt(e.target.value) : undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => onFilterChange({
                search: undefined,
                status: undefined,
                vehicleType: undefined,
                assignedWork: undefined,
                minSpeed: undefined,
                minBattery: undefined
              })}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Limpiar filtros
            </button>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Layers className="w-4 h-4" />
              <span>Vista satelital disponible</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={onCenterMap}
        >
          <Navigation className="w-4 h-4" />
          Centrar mapa
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={onShowAlerts}
        >
          <AlertTriangle className="w-4 h-4" />
          Ver alertas
        </Button>
        
        <div className="ml-auto text-xs text-gray-500">
          Última actualización: {new Date().toLocaleTimeString('es-PE')}
        </div>
      </div>
    </Card>
  );
};

export default GPSControls;