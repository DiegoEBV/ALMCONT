// Shared GPS types between frontend and backend

export interface GPSDevice {
  id: string;
  device_id: string;
  vehicle_id?: string;
  device_type: string;
  manufacturer: string;
  model: string;
  firmware_version?: string;
  status: 'active' | 'inactive' | 'maintenance';
  last_communication?: string;
  battery_level?: number;
  signal_strength?: number;
  created_at: string;
  updated_at: string;
}

export interface GPSLocation {
  id: string;
  vehicle_id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed: number;
  heading: number;
  accuracy?: number;
  timestamp?: string;
  satellites: number;
  battery_level: number;
  signal_strength?: number;
  recorded_at: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  model: string;
  year?: number;
  fuel_capacity?: number;
  driver_name?: string;
  driver_license?: string;
  status: 'active' | 'inactive' | 'maintenance';
  current_location_id?: string;
  current_location?: GPSLocation;
  created_at: string;
  updated_at: string;
}

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  type: 'circle' | 'polygon';
  coordinates: number[][];
  radius?: number;
  center_lat?: number;
  center_lng?: number;
  is_active: boolean;
  alert_on_entry: boolean;
  alert_on_exit: boolean;
  created_at: string;
  updated_at: string;
}

export interface GPSAlert {
  id: string;
  vehicle_id: string;
  geofence_id?: string;
  alert_type: 'geofence' | 'speed' | 'battery' | 'offline' | 'panic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  metadata?: Record<string, any>;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export interface VehicleAssignment {
  id: string;
  vehicle_id: string;
  obra_id: string;
  driver_name?: string;
  assigned_at: string;
  unassigned_at?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// WebSocket Event Types
export interface LocationUpdateEvent {
  vehicle_id: string;
  vehicle_plate: string;
  location: GPSLocation;
  timestamp: string;
}

export interface GeofenceAlertEvent {
  alert_id: string;
  vehicle_id: string;
  vehicle_plate: string;
  geofence_id: string;
  geofence_name: string;
  alert_type: 'entry' | 'exit';
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

export interface SpeedAlertEvent {
  alert_id: string;
  vehicle_id: string;
  vehicle_plate: string;
  current_speed: number;
  speed_limit: number;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

// Map and UI Types
export type VehicleStatus = 'moving' | 'idle' | 'offline';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapFilter {
  search?: string;
  status?: VehicleStatus;
  vehicleType?: string;
  assignedWork?: string;
  minSpeed?: number;
  minBattery?: number;
}

// Route Optimization Types
export interface RoutePoint {
  latitude: number;
  longitude: number;
  address?: string;
  estimatedTime?: number;
  priority?: number;
}

export interface OptimizedRoute {
  id: string;
  name: string;
  vehicle_id: string;
  stops: RoutePoint[];
  totalDistance: number;
  totalTime: number;
  totalWeight?: number;
  vehicleCapacity?: number;
  efficiency: number;
  created_at: string;
}

// Analytics Types
export interface VehicleAnalytics {
  vehicle_id: string;
  total_distance: number;
  total_time: number;
  average_speed: number;
  fuel_consumption?: number;
  alerts_count: number;
  efficiency_score: number;
  period_start: string;
  period_end: string;
}

export interface GeofenceAnalytics {
  geofence_id: string;
  entries_count: number;
  exits_count: number;
  average_duration: number;
  most_frequent_vehicle?: string;
  period_start: string;
  period_end: string;
}