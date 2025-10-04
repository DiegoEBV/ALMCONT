// GPS Types for the tracking system

export interface GPSDevice {
  id: string;
  imei: string;
  name: string;
  vehicle_id: string | null;
  report_interval: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
}

export interface GPSLocation {
  id: string;
  device_id: string;
  vehicle_id?: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  timestamp: string;
  battery_level: number | null;
  signal_strength: number | null;
  satellites?: number;
  recorded_at?: string;
  created_at?: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  model: string;
  vehicle_type: string;
  fuel_capacity: number;
  driver_name?: string;
  is_active: boolean;
  created_at: string;
  current_location?: GPSLocation;
}

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  geometry_type?: 'circle' | 'polygon';
  coordinates: Array<{lat: number; lng: number}>;
  radius?: number;
  center_lat?: number;
  center_lng?: number;
  alert_type: 'entry' | 'exit' | 'both';
  trigger_type?: 'entry' | 'exit' | 'both';
  active_hours: {start: string; end: string};
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GPSAlert {
  id: string;
  device_id: string;
  geofence_id: string | null;
  alert_type: string;
  alert_data: any;
  is_resolved: boolean;
  triggered_at: string;
  resolved_at: string | null;
  created_at: string;
  vehicle_id?: string;
  status?: string;
  severity?: string;
  message?: string;
  metadata?: {
    vehicle_plate?: string;
    geofence_name?: string;
    [key: string]: any;
  };
  device?: GPSDevice;
  geofence?: Geofence;
}

export interface VehicleAssignment {
  id: string;
  vehicle_id: string;
  obra_id: string;
  assigned_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  obra?: any; // Reference to obra type
}

// WebSocket Event Types
export interface LocationUpdateEvent {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
  battery_level?: number;
  satellites?: number;
}

export interface GeofenceAlertEvent {
  vehicle_id: string;
  vehicle_plate: string;
  geofence_id: string;
  geofence_name: string;
  alert_type: 'entry' | 'exit';
  timestamp: string;
  alert_id?: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface SpeedAlertEvent {
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

// Map related types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapFilter {
  obra_id?: string;
  vehicle_type?: string;
  vehicleType?: string;
  is_active?: boolean;
  status?: string;
  search?: string;
  assignedWork?: string;
  minSpeed?: number;
  minBattery?: number;
  date_range?: {
    start: string;
    end: string;
  };
}

// Vehicle status for real-time tracking
export interface VehicleStatus {
  vehicle_id: string;
  plate_number: string;
  status: 'online' | 'offline' | 'idle' | 'moving';
  last_update: string;
  current_location?: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
  };
  battery_level?: number;
  signal_strength?: number;
}

// Route optimization types
export interface RoutePoint {
  latitude: number;
  longitude: number;
  address?: string;
  estimated_time?: string;
  order: number;
}

export interface OptimizedRoute {
  id: string;
  vehicle_id: string;
  route_points: RoutePoint[];
  total_distance: number;
  estimated_duration: number;
  created_at: string;
  status: 'planned' | 'in_progress' | 'completed';
}

// Analytics and reporting types
export interface VehicleAnalytics {
  vehicle_id: string;
  total_distance: number;
  total_time: number;
  average_speed: number;
  fuel_consumption?: number;
  idle_time: number;
  alerts_count: number;
  period: {
    start: string;
    end: string;
  };
}

export interface GeofenceAnalytics {
  geofence_id: string;
  geofence_name: string;
  entries_count: number;
  exits_count: number;
  average_time_inside: number;
  vehicles_visited: string[];
  period: {
    start: string;
    end: string;
  };
}