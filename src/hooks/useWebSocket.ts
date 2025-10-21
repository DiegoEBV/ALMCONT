import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { LocationUpdateEvent, GeofenceAlertEvent, SpeedAlertEvent } from '../types/gps';
import { toast } from 'sonner';

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
}

interface UseWebSocketProps {
  onLocationUpdate?: (event: LocationUpdateEvent) => void;
  onGeofenceAlert?: (event: GeofenceAlertEvent) => void;
  onSpeedAlert?: (event: SpeedAlertEvent) => void;
  autoConnect?: boolean;
}

export const useWebSocket = ({
  onLocationUpdate,
  onGeofenceAlert,
  onSpeedAlert,
  autoConnect = true
}: UseWebSocketProps): UseWebSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      // Create socket connection
      const socket = io(process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        // Configurar límites para evitar memory leaks
        maxListeners: 10
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('GPS WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        
        // Join GPS tracking room
        socket.emit('join-gps-tracking');
        
        toast.success('Conexión GPS establecida');
      });

      socket.on('disconnect', (reason) => {
        console.log('GPS WebSocket disconnected:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          socket.connect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('GPS WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        
        reconnectAttemptsRef.current++;
        
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          toast.error('No se pudo establecer conexión GPS');
        }
      });

      // GPS event handlers
      socket.on('location-update', (data: LocationUpdateEvent) => {
        console.log('Location update received:', data);
        onLocationUpdate?.(data);
      });

      socket.on('geofence-alert', (data: GeofenceAlertEvent) => {
        console.log('Geofence alert received:', data);
        onGeofenceAlert?.(data);
        
        // Show toast notification for geofence alerts
        const alertType = data.alert_type === 'entry' ? 'ingresó a' : 'salió de';
        toast.warning(`Vehículo ${data.vehicle_plate} ${alertType} ${data.geofence_name}`);
      });

      socket.on('speed-alert', (data: SpeedAlertEvent) => {
        console.log('Speed alert received:', data);
        onSpeedAlert?.(data);
        
        // Show toast notification for speed alerts
        toast.error(`Vehículo ${data.vehicle_plate} excede velocidad: ${data.current_speed} km/h`);
      });

      // Heartbeat to keep connection alive
      socket.on('ping', () => {
        socket.emit('pong');
      });

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionError(error instanceof Error ? error.message : 'Error de conexión');
    }
  }, [onLocationUpdate, onGeofenceAlert, onSpeedAlert]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      // Remover todos los listeners antes de desconectar
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setConnectionError(null);
    
    // Delay reconnection slightly to avoid rapid reconnection attempts
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, 1000);
  }, [connect, disconnect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // Remover connect y disconnect de las dependencias para evitar loops

  // Cleanup on unmount - SIMPLIFICADO
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []); // Sin dependencias para evitar re-creación

  // Handle page visibility changes to manage connection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, we might want to reduce update frequency
        socketRef.current?.emit('reduce-updates');
      } else {
        // Page is visible, resume normal updates
        socketRef.current?.emit('resume-updates');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    isConnected,
    connectionError,
    reconnect
  };
};