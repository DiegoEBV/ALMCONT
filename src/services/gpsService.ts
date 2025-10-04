import { supabase } from '../lib/supabase';

// GPS Device Types
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
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  satellites: number;
  battery_level: number;
  recorded_at: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  model: string;
  vehicle_type: string;
  fuel_capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface Geofence {
  id: string;
  name: string;
  coordinates: Array<{lat: number; lng: number}>;
  alert_type: 'entry' | 'exit' | 'both';
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
}

// GPS Service Class
export class GPSService {
  // GPS Devices Management
  static async getGPSDevices(): Promise<GPSDevice[]> {
    try {
      const { data, error } = await supabase
        .from('gps_devices')
        .select(`
          *,
          vehicle:vehicles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching GPS devices:', error);
      throw error;
    }
  }

  static async createGPSDevice(device: Omit<GPSDevice, 'id' | 'created_at' | 'updated_at'>): Promise<GPSDevice> {
    try {
      const { data, error } = await supabase
        .from('gps_devices')
        .insert([device])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating GPS device:', error);
      throw error;
    }
  }

  static async updateGPSDevice(id: string, updates: Partial<GPSDevice>): Promise<GPSDevice> {
    try {
      const { data, error } = await supabase
        .from('gps_devices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating GPS device:', error);
      throw error;
    }
  }

  static async deleteGPSDevice(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('gps_devices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting GPS device:', error);
      throw error;
    }
  }

  // GPS Locations Management
  static async getLatestLocations(vehicleIds?: string[]): Promise<GPSLocation[]> {
    try {
      let query = supabase
        .from('gps_locations')
        .select(`
          *,
          device:gps_devices(
            *,
            vehicle:vehicles(*)
          )
        `)
        .order('recorded_at', { ascending: false });

      if (vehicleIds && vehicleIds.length > 0) {
        query = query.in('device.vehicle_id', vehicleIds);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching latest locations:', error);
      throw error;
    }
  }

  static async getLocationHistory(deviceId: string, startDate?: string, endDate?: string): Promise<GPSLocation[]> {
    try {
      let query = supabase
        .from('gps_locations')
        .select('*')
        .eq('device_id', deviceId)
        .order('recorded_at', { ascending: false });

      if (startDate) {
        query = query.gte('recorded_at', startDate);
      }
      if (endDate) {
        query = query.lte('recorded_at', endDate);
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching location history:', error);
      throw error;
    }
  }

  static async addGPSLocation(location: Omit<GPSLocation, 'id' | 'created_at'>): Promise<GPSLocation> {
    try {
      const { data, error } = await supabase
        .from('gps_locations')
        .insert([location])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding GPS location:', error);
      throw error;
    }
  }

  // Vehicles Management
  static async getVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('plate_number', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  }

  static async createVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at'>): Promise<Vehicle> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicle])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  static async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  }

  // Geofences Management
  static async getGeofences(): Promise<Geofence[]> {
    try {
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching geofences:', error);
      throw error;
    }
  }

  static async createGeofence(geofence: Omit<Geofence, 'id' | 'created_at' | 'updated_at'>): Promise<Geofence> {
    try {
      const { data, error } = await supabase
        .from('geofences')
        .insert([geofence])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating geofence:', error);
      throw error;
    }
  }

  static async updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence> {
    try {
      const { data, error } = await supabase
        .from('geofences')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating geofence:', error);
      throw error;
    }
  }

  static async deleteGeofence(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('geofences')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting geofence:', error);
      throw error;
    }
  }

  // GPS Alerts Management
  static async getGPSAlerts(isResolved?: boolean): Promise<GPSAlert[]> {
    try {
      let query = supabase
        .from('gps_alerts')
        .select(`
          *,
          device:gps_devices(*),
          geofence:geofences(*)
        `)
        .order('triggered_at', { ascending: false });

      if (typeof isResolved === 'boolean') {
        query = query.eq('is_resolved', isResolved);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching GPS alerts:', error);
      throw error;
    }
  }

  static async createGPSAlert(alert: Omit<GPSAlert, 'id' | 'triggered_at'>): Promise<GPSAlert> {
    try {
      const { data, error } = await supabase
        .from('gps_alerts')
        .insert([alert])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating GPS alert:', error);
      throw error;
    }
  }

  static async updateGPSAlert(id: string, updates: Partial<GPSAlert>): Promise<GPSAlert> {
    try {
      const { data, error } = await supabase
        .from('gps_alerts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating GPS alert:', error);
      throw error;
    }
  }

  static async deleteGPSAlert(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('gps_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting GPS alert:', error);
      throw error;
    }
  }

  static async resolveGPSAlert(id: string): Promise<GPSAlert> {
    try {
      const { data, error } = await supabase
        .from('gps_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error resolving GPS alert:', error);
      throw error;
    }
  }

  // Vehicle Assignments Management
  static async getVehicleAssignments(obraId?: string): Promise<VehicleAssignment[]> {
    try {
      let query = supabase
        .from('vehicle_assignments')
        .select(`
          *,
          vehicle:vehicles(*),
          obra:obras(*)
        `)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });

      if (obraId) {
        query = query.eq('obra_id', obraId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching vehicle assignments:', error);
      throw error;
    }
  }

  static async assignVehicleToObra(vehicleId: string, obraId: string): Promise<VehicleAssignment> {
    try {
      // First, deactivate any existing assignments for this vehicle
      await supabase
        .from('vehicle_assignments')
        .update({ is_active: false, end_date: new Date().toISOString().split('T')[0] })
        .eq('vehicle_id', vehicleId)
        .eq('is_active', true);

      // Create new assignment
      const { data, error } = await supabase
        .from('vehicle_assignments')
        .insert([{
          vehicle_id: vehicleId,
          obra_id: obraId,
          assigned_date: new Date().toISOString().split('T')[0],
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error assigning vehicle to obra:', error);
      throw error;
    }
  }

  // Utility Methods
  static async getVehiclesWithCurrentLocation(): Promise<Array<Vehicle & { current_location?: GPSLocation }>> {
    try {
      const vehicles = await this.getVehicles();
      const locations = await this.getLatestLocations();

      return vehicles.map(vehicle => {
        const currentLocation = locations.find(loc => 
          (loc as any).device?.vehicle_id === vehicle.id
        );
        return {
          ...vehicle,
          current_location: currentLocation
        };
      });
    } catch (error) {
      console.error('Error fetching vehicles with current location:', error);
      throw error;
    }
  }

  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  static isPointInGeofence(lat: number, lng: number, geofence: Geofence): boolean {
    const coordinates = geofence.coordinates;
    let inside = false;

    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      if (((coordinates[i].lat > lat) !== (coordinates[j].lat > lat)) &&
          (lng < (coordinates[j].lng - coordinates[i].lng) * (lat - coordinates[i].lat) / (coordinates[j].lat - coordinates[i].lat) + coordinates[i].lng)) {
        inside = !inside;
      }
    }

    return inside;
  }
}

export default GPSService;