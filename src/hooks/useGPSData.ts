import { useState, useEffect, useCallback } from 'react';
import { Vehicle, GPSDevice, GPSLocation, Geofence, GPSAlert, MapFilter } from '../types/gps';
import { GPSService } from '../services/gpsService';
import { toast } from 'sonner';

interface UseGPSDataReturn {
  vehicles: Vehicle[];
  devices: GPSDevice[];
  geofences: Geofence[];
  alerts: GPSAlert[];
  loading: boolean;
  error: string | null;
  selectedVehicle: Vehicle | null;
  filter: MapFilter;
  refreshData: () => Promise<void>;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  setFilter: (filter: MapFilter) => void;
  filteredVehicles: Vehicle[];
}

export const useGPSData = (): UseGPSDataReturn => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [devices, setDevices] = useState<GPSDevice[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [alerts, setAlerts] = useState<GPSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [filter, setFilter] = useState<MapFilter>({});

  // Filter vehicles based on current filter settings
  const filteredVehicles = vehicles.filter(vehicle => {
    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const matchesSearch = 
        vehicle.plate_number.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        vehicle.driver_name?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filter.status) {
      const vehicleStatus = getVehicleStatus(vehicle);
      if (vehicleStatus !== filter.status) return false;
    }

    // Vehicle type filter
    if (filter.vehicleType && vehicle.vehicle_type !== filter.vehicleType) {
      return false;
    }

    // Speed filter
    if (filter.minSpeed && vehicle.current_location) {
      if (vehicle.current_location.speed < filter.minSpeed) return false;
    }

    // Battery filter
    if (filter.minBattery && vehicle.current_location) {
      if (vehicle.current_location.battery_level < filter.minBattery) return false;
    }

    return true;
  });

  // Helper function to determine vehicle status
  const getVehicleStatus = (vehicle: Vehicle) => {
    if (!vehicle.current_location) return 'offline';
    
    const lastUpdate = new Date(vehicle.current_location.recorded_at);
    const now = new Date();
    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    if (minutesSinceUpdate > 10) return 'offline';
    if (vehicle.current_location.speed > 5) return 'moving';
    return 'idle';
  };

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [vehiclesData, devicesData, geofencesData, alertsData] = await Promise.all([
        GPSService.getVehicles(),
        GPSService.getGPSDevices(),
        GPSService.getGeofences(),
        GPSService.getGPSAlerts()
      ]);

      setVehicles(vehiclesData);
      setDevices(devicesData);
      setGeofences(geofencesData);
      setAlerts(alertsData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos GPS';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data function
  const refreshData = useCallback(async () => {
    await loadData();
    toast.success('Datos GPS actualizados');
  }, [loadData]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadData]);

  // Update selected vehicle when vehicles data changes
  useEffect(() => {
    if (selectedVehicle) {
      const updatedVehicle = vehicles.find(v => v.id === selectedVehicle.id);
      if (updatedVehicle) {
        setSelectedVehicle(updatedVehicle);
      }
    }
  }, [vehicles, selectedVehicle]);

  return {
    vehicles,
    devices,
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
  };
};