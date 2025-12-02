import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { supabase } from '../config/supabase';
import { LocationUpdateEvent, GeofenceAlertEvent, SpeedAlertEvent } from '../../shared/types/gps';

export class GPSWebSocketService {
  private io: SocketIOServer;
  private connectedClients: Map<string, {
    socket: any;
    joinedRooms: Set<string>;
    lastActivity: Date;
    reducedUpdates?: boolean;
  }> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.FRONTEND_URL 
          : ['http://localhost:3000', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.startLocationUpdateInterval();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`GPS WebSocket client connected: ${socket.id}`);
      
      // Store client connection
      this.connectedClients.set(socket.id, {
        socket,
        joinedRooms: new Set(),
        lastActivity: new Date()
      });

      // Handle joining GPS tracking room
      socket.on('join-gps-tracking', () => {
        socket.join('gps-tracking');
        this.connectedClients.get(socket.id)?.joinedRooms.add('gps-tracking');
        console.log(`Client ${socket.id} joined GPS tracking room`);
        
        // Send initial data
        this.sendInitialGPSData(socket);
      });

      // Handle leaving GPS tracking room
      socket.on('leave-gps-tracking', () => {
        socket.leave('gps-tracking');
        this.connectedClients.get(socket.id)?.joinedRooms.delete('gps-tracking');
        console.log(`Client ${socket.id} left GPS tracking room`);
      });

      // Handle vehicle subscription
      socket.on('subscribe-vehicle', (vehicleId: string) => {
        const roomName = `vehicle-${vehicleId}`;
        socket.join(roomName);
        this.connectedClients.get(socket.id)?.joinedRooms.add(roomName);
        console.log(`Client ${socket.id} subscribed to vehicle ${vehicleId}`);
      });

      // Handle vehicle unsubscription
      socket.on('unsubscribe-vehicle', (vehicleId: string) => {
        const roomName = `vehicle-${vehicleId}`;
        socket.leave(roomName);
        this.connectedClients.get(socket.id)?.joinedRooms.delete(roomName);
        console.log(`Client ${socket.id} unsubscribed from vehicle ${vehicleId}`);
      });

      // Handle reduce updates (when page is hidden)
      socket.on('reduce-updates', () => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.reducedUpdates = true;
        }
      });

      // Handle resume updates (when page is visible)
      socket.on('resume-updates', () => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.reducedUpdates = false;
        }
      });

      // Handle ping/pong for connection health
      socket.on('pong', () => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.lastActivity = new Date();
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`GPS WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`GPS WebSocket error for client ${socket.id}:`, error);
      });
    });
  }

  private async sendInitialGPSData(socket: any): Promise<void> {
    try {
      // Send current vehicle locations
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          current_location:gps_locations!vehicles_current_location_id_fkey(*)
        `);

      if (!error && vehicles) {
        socket.emit('initial-vehicles', vehicles);
      }

      // Send active alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('gps_alerts')
        .select(`
          *,
          vehicle:vehicles(*),
          geofence:geofences(*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!alertsError && alerts) {
        socket.emit('initial-alerts', alerts);
      }

    } catch (error) {
      console.error('Error sending initial GPS data:', error);
    }
  }

  // Broadcast location update to all connected clients
  public broadcastLocationUpdate(locationUpdate: LocationUpdateEvent): void {
    this.io.to('gps-tracking').emit('location-update', locationUpdate);
    
    // Also send to specific vehicle subscribers
    const vehicleRoom = `vehicle-${locationUpdate.vehicle_id}`;
    this.io.to(vehicleRoom).emit('location-update', locationUpdate);
  }

  // Broadcast geofence alert
  public broadcastGeofenceAlert(alert: GeofenceAlertEvent): void {
    this.io.to('gps-tracking').emit('geofence-alert', alert);
    
    // Also send to specific vehicle subscribers
    const vehicleRoom = `vehicle-${alert.vehicle_id}`;
    this.io.to(vehicleRoom).emit('geofence-alert', alert);
  }

  // Broadcast speed alert
  public broadcastSpeedAlert(alert: SpeedAlertEvent): void {
    this.io.to('gps-tracking').emit('speed-alert', alert);
    
    // Also send to specific vehicle subscribers
    const vehicleRoom = `vehicle-${alert.vehicle_id}`;
    this.io.to(vehicleRoom).emit('speed-alert', alert);
  }

  // Send heartbeat to maintain connections
  private startLocationUpdateInterval(): void {
    // Send ping every 30 seconds to maintain connection
    setInterval(() => {
      this.io.to('gps-tracking').emit('ping');
    }, 30000);

    // Check for location updates every 10 seconds
    setInterval(async () => {
      await this.checkForLocationUpdates();
    }, 10000);

    // Clean up inactive connections every 5 minutes
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 300000);
  }

  private async checkForLocationUpdates(): Promise<void> {
    try {
      // Get recent location updates (last 30 seconds)
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      
      const { data: recentLocations, error } = await supabase
        .from('gps_locations')
        .select(`
          *,
          vehicle:vehicles(*)
        `)
        .gte('recorded_at', thirtySecondsAgo)
        .order('recorded_at', { ascending: false });

      if (error) {
        console.error('Error checking for location updates:', error);
        return;
      }

      // Broadcast each location update
      recentLocations?.forEach((location) => {
        if (location.vehicle) {
          const locationUpdate: LocationUpdateEvent = {
            vehicle_id: location.vehicle_id,
            vehicle_plate: location.vehicle.plate_number,
            location: {
              id: location.id,
              device_id: location.device_id,
              vehicle_id: location.vehicle_id,
              latitude: location.latitude,
              longitude: location.longitude,
              altitude: location.altitude,
              speed: location.speed,
              heading: location.heading,
              accuracy: location.accuracy,
              timestamp: location.timestamp || location.recorded_at,
              battery_level: location.battery_level,
              signal_strength: location.signal_strength,
              satellites: location.satellites,
              recorded_at: location.recorded_at,
              created_at: location.created_at
            },
            timestamp: location.recorded_at
          };

          this.broadcastLocationUpdate(locationUpdate);
        }
      });

      // Check for geofence violations
      await this.checkGeofenceViolations();

      // Check for speed violations
      await this.checkSpeedViolations();

    } catch (error) {
      console.error('Error in location update check:', error);
    }
  }

  private async checkGeofenceViolations(): Promise<void> {
    try {
      // Get recent geofence alerts (last 30 seconds)
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      
      const { data: alerts, error } = await supabase
        .from('gps_alerts')
        .select(`
          *,
          vehicle:vehicles(*),
          geofence:geofences(*)
        `)
        .eq('alert_type', 'geofence')
        .gte('created_at', thirtySecondsAgo);

      if (error) {
        console.error('Error checking geofence violations:', error);
        return;
      }

      alerts?.forEach((alert) => {
        if (alert.vehicle && alert.geofence) {
          const geofenceAlert: GeofenceAlertEvent = {
            alert_id: alert.id,
            vehicle_id: alert.vehicle_id,
            vehicle_plate: alert.vehicle.plate_number,
            geofence_id: alert.geofence_id!,
            geofence_name: alert.geofence.name,
            alert_type: alert.metadata?.type || 'entry',
            location: {
              latitude: alert.metadata?.latitude || 0,
              longitude: alert.metadata?.longitude || 0
            },
            timestamp: alert.created_at
          };

          this.broadcastGeofenceAlert(geofenceAlert);
        }
      });

    } catch (error) {
      console.error('Error checking geofence violations:', error);
    }
  }

  private async checkSpeedViolations(): Promise<void> {
    try {
      // Get recent speed alerts (last 30 seconds)
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      
      const { data: alerts, error } = await supabase
        .from('gps_alerts')
        .select(`
          *,
          vehicle:vehicles(*)
        `)
        .eq('alert_type', 'speed')
        .gte('created_at', thirtySecondsAgo);

      if (error) {
        console.error('Error checking speed violations:', error);
        return;
      }

      alerts?.forEach((alert) => {
        if (alert.vehicle) {
          const speedAlert: SpeedAlertEvent = {
            alert_id: alert.id,
            vehicle_id: alert.vehicle_id,
            vehicle_plate: alert.vehicle.plate_number,
            current_speed: alert.metadata?.current_speed || 0,
            speed_limit: alert.metadata?.speed_limit || 0,
            location: {
              latitude: alert.metadata?.latitude || 0,
              longitude: alert.metadata?.longitude || 0
            },
            timestamp: alert.created_at
          };

          this.broadcastSpeedAlert(speedAlert);
        }
      });

    } catch (error) {
      console.error('Error checking speed violations:', error);
    }
  }

  private cleanupInactiveConnections(): void {
    const fiveMinutesAgo = new Date(Date.now() - 300000);
    
    this.connectedClients.forEach((client, socketId) => {
      if (client.lastActivity < fiveMinutesAgo) {
        console.log(`Cleaning up inactive GPS WebSocket connection: ${socketId}`);
        client.socket.disconnect();
        this.connectedClients.delete(socketId);
      }
    });
  }

  // Get connection statistics
  public getConnectionStats(): any {
    return {
      totalConnections: this.connectedClients.size,
      activeRooms: this.io.sockets.adapter.rooms.size,
      connectedClients: Array.from(this.connectedClients.entries()).map(([id, client]) => ({
        id,
        joinedRooms: Array.from(client.joinedRooms),
        lastActivity: client.lastActivity,
        reducedUpdates: client.reducedUpdates || false
      }))
    };
  }

  // Manually trigger location update broadcast (for testing)
  public async triggerLocationUpdate(vehicleId: string): Promise<void> {
    try {
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          current_location:gps_locations!vehicles_current_location_id_fkey(*)
        `)
        .eq('id', vehicleId)
        .single();

      if (error || !vehicle?.current_location) {
        throw new Error('Vehicle or location not found');
      }

      const locationUpdate: LocationUpdateEvent = {
        vehicle_id: vehicle.id,
        vehicle_plate: vehicle.plate_number,
        location: vehicle.current_location,
        timestamp: vehicle.current_location.recorded_at
      };

      this.broadcastLocationUpdate(locationUpdate);

    } catch (error) {
      console.error('Error triggering location update:', error);
      throw error;
    }
  }
}

export default GPSWebSocketService;