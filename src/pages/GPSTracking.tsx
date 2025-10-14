import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Card } from '../components/ui/card';
import { useGPSData } from '../hooks/useGPSData';
import { useWebSocket } from '../hooks/useWebSocket';
import { LocationUpdateEvent, GeofenceAlertEvent, SpeedAlertEvent, Vehicle } from '../types/gps';
import { Loader2, Wifi, WifiOff, AlertTriangle, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

// Lazy load heavy GPS components
const GPSMap = lazy(() => import('../components/gps/GPSMap'));
const VehicleList = lazy(() => import('../components/gps/VehicleList'));
const GPSControls = lazy(() => import('../components/gps/GPSControls'));

const GPSTracking: React.FC = () => {
  const [showGeofences, setShowGeofences] = useState(true);
  const [showTrails, setShowTrails] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    vehicles,
    geofences,
    alerts,
    loading,
    error,
    selectedVehicle,
    filter,
    refreshData,
    setSelectedVehicle,
    setFilter,
    filteredVehicles
  } = useGPSData();

  // WebSocket event handlers
  const handleLocationUpdate = useCallback((event: LocationUpdateEvent) => {
    // Refresh data to get updated vehicle locations
    refreshData();
  }, [refreshData]);

  const handleGeofenceAlert = useCallback((event: GeofenceAlertEvent) => {
    // Refresh alerts to show new geofence alerts
    refreshData();
  }, [refreshData]);

  const handleSpeedAlert = useCallback((event: SpeedAlertEvent) => {
    // Refresh alerts to show new speed alerts
    refreshData();
  }, [refreshData]);

  const { isConnected, connectionError, reconnect } = useWebSocket({
    onLocationUpdate: handleLocationUpdate,
    onGeofenceAlert: handleGeofenceAlert,
    onSpeedAlert: handleSpeedAlert,
    autoConnect: true
  });

  const handleVehicleSelect = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  }, [setSelectedVehicle]);

  const handleRefresh = useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  // Calculate map center based on vehicles
  const getMapCenter = (): [number, number] => {
    if (selectedVehicle?.current_location) {
      return [selectedVehicle.current_location.latitude, selectedVehicle.current_location.longitude];
    }

    if (filteredVehicles.length > 0) {
      const vehiclesWithLocation = filteredVehicles.filter(v => v.current_location);
      if (vehiclesWithLocation.length > 0) {
        const avgLat = vehiclesWithLocation.reduce((sum, v) => sum + v.current_location!.latitude, 0) / vehiclesWithLocation.length;
        const avgLng = vehiclesWithLocation.reduce((sum, v) => sum + v.current_location!.longitude, 0) / vehiclesWithLocation.length;
        return [avgLat, avgLng];
      }
    }

    // Default to Lima, Peru coordinates
    return [-12.0464, -77.0428];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Cargando sistema GPS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error del Sistema GPS</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Navigation className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sistema GPS</h1>
              <p className="text-sm text-gray-600">
                Seguimiento en tiempo real de {vehicles.length} vehículos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium">Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm font-medium">Desconectado</span>
                </>
              )}
            </div>

            {/* Reconnect Button */}
            {!isConnected && (
              <button
                onClick={reconnect}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Reconectar
              </button>
            )}

            {/* Alerts Count */}
            {alerts.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{alerts.length} alertas</span>
              </div>
            )}
          </div>
        </div>

        {/* Connection Error */}
        {connectionError && (
          <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Advertencia:</strong> {connectionError}
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarCollapsed ? 'w-0' : 'w-96'
        } overflow-hidden`}>
          <div className="h-full flex flex-col">
            {/* Controls */}
            <div className="p-4 border-b border-gray-200">
              <Suspense fallback={<LoadingSpinner />}>
                <GPSControls
                  filter={filter}
                  onFilterChange={setFilter}
                  onRefresh={handleRefresh}
                  showGeofences={showGeofences}
                  onToggleGeofences={setShowGeofences}
                  showTrails={showTrails}
                  onToggleTrails={setShowTrails}
                />
              </Suspense>
            </div>

            {/* Vehicle List */}
            <div className="flex-1 overflow-y-auto p-4">
              <Suspense fallback={<LoadingSpinner />}>
                <VehicleList
                  vehicles={filteredVehicles}
                  selectedVehicle={selectedVehicle}
                  onVehicleSelect={handleVehicleSelect}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-6 bg-white border-r border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center"
        >
          <div className={`w-1 h-8 bg-gray-400 rounded-full transition-transform ${
            sidebarCollapsed ? 'rotate-180' : ''
          }`}></div>
        </button>

        {/* Map Container */}
        <div className="flex-1 relative">
          <Suspense fallback={<LoadingSpinner />}>
            <GPSMap
              vehicles={filteredVehicles}
              geofences={showGeofences ? geofences : []}
              selectedVehicle={selectedVehicle}
              onVehicleSelect={handleVehicleSelect}
              center={getMapCenter()}
              zoom={selectedVehicle ? 15 : 12}
              showTrails={showTrails}
              className="h-full w-full"
            />
          </Suspense>

          {/* Map Overlay Info */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Vehículos totales:</span>
                <span className="font-medium">{vehicles.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">En movimiento:</span>
                <span className="font-medium text-green-600">
                  {vehicles.filter(v => {
                    if (!v.current_location) return false;
                    return v.current_location.speed > 5;
                  }).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Detenidos:</span>
                <span className="font-medium text-yellow-600">
                  {vehicles.filter(v => {
                    if (!v.current_location) return false;
                    const lastUpdate = new Date(v.current_location.recorded_at);
                    const now = new Date();
                    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
                    return minutesSinceUpdate <= 10 && v.current_location.speed <= 5;
                  }).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Desconectados:</span>
                <span className="font-medium text-red-600">
                  {vehicles.filter(v => {
                    if (!v.current_location) return true;
                    const lastUpdate = new Date(v.current_location.recorded_at);
                    const now = new Date();
                    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
                    return minutesSinceUpdate > 10;
                  }).length}
                </span>
              </div>
              {showGeofences && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Geocercas:</span>
                  <span className="font-medium">{geofences.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Selected Vehicle Info */}
          {selectedVehicle && (
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                {selectedVehicle.plate_number}
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Modelo:</span>
                  <span>{selectedVehicle.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Conductor:</span>
                  <span>{selectedVehicle.driver_name || 'No asignado'}</span>
                </div>
                {selectedVehicle.current_location && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Velocidad:</span>
                      <span>{Math.round(selectedVehicle.current_location.speed)} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Batería:</span>
                      <span>{Math.round(selectedVehicle.current_location.battery_level)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Última actualización:</span>
                      <span>{new Date(selectedVehicle.current_location.recorded_at).toLocaleTimeString('es-PE')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GPSTracking;