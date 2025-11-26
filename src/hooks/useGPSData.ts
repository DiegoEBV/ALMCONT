import { useState, useEffect, useCallback } from 'react';
import { Vehicle, GPSDevice, Geofence, GPSAlert, MapFilter } from '../types/gps';
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

  // Filter vehicles based on current filter settings
  const filteredVehicles = vehicles.filter(vehicle => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const matchesSearch = 
        vehicle.plate_number.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        vehicle.driver_name?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filter.status) {
      const vehicleStatus = getVehicleStatus(vehicle);
      if (vehicleStatus !== filter.status) return false;
    }

    if (filter.vehicleType && vehicle.vehicle_type !== filter.vehicleType) {
      return false;
    }

    if (filter.minSpeed && vehicle.current_location) {
      if (vehicle.current_location.speed < filter.minSpeed) return false;
    }

    if (filter.minBattery && vehicle.current_location) {
      if (vehicle.current_location.battery_level < filter.minBattery) return false;
    }

    return true;
  });

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      GPSService.getVehiclesWithCurrentLocation(),
      GPSService.getGPSDevices(),
      GPSService.getGeofences(),
      GPSService.getGPSAlerts()
    ]);

    const [vehiclesRes, devicesRes, geofencesRes, alertsRes] = results;

    let failures = 0;

    if (vehiclesRes.status === 'fulfilled') {
      setVehicles(vehiclesRes.value as Vehicle[]);
    } else {
      failures++;
      toast.warning('No se pudieron cargar vehículos');
      setVehicles([]);
    }

    if (devicesRes.status === 'fulfilled') {
      setDevices(devicesRes.value);
    } else {
      failures++;
      toast.warning('No se pudieron cargar dispositivos');
      setDevices([]);
    }

    if (geofencesRes.status === 'fulfilled') {
      setGeofences(geofencesRes.value);
    } else {
      failures++;
      toast.warning('No se pudieron cargar geocercas');
      setGeofences([]);
    }

    if (alertsRes.status === 'fulfilled') {
      setAlerts(alertsRes.value);
    } else {
      failures++;
      setAlerts([]);
    }

    if (failures === results.length) {
      setError('Error al cargar datos GPS');
      toast.error('Error al cargar datos GPS');
    }

    setLoading(false);
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