import React, { useState, useEffect } from 'react';
import { GPSAlert, GeofenceAlertEvent, Vehicle, Geofence } from '../../types/gps';
import { GPSService } from '../../services/gpsService';
import { useWebSocket } from '../../hooks/useWebSocket';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  Bell,
  BellOff,
  Eye,
  Trash2,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';

interface GeofenceAlertSystemProps {
  vehicles: Vehicle[];
  geofences: Geofence[];
  onAlertClick?: (alert: GPSAlert) => void;
}

interface AlertFilter {
  status: 'all' | 'active' | 'acknowledged' | 'resolved';
  severity: 'all' | 'low' | 'medium' | 'high' | 'critical';
  alertType: 'all' | 'geofence' | 'speed' | 'battery' | 'offline' | 'panic';
  search: string;
}

const GeofenceAlertSystem: React.FC<GeofenceAlertSystemProps> = ({
  vehicles,
  geofences,
  onAlertClick
}) => {
  const [alerts, setAlerts] = useState<GPSAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<AlertFilter>({
    status: 'all',
    severity: 'all',
    alertType: 'all',
    search: ''
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // WebSocket handlers for real-time alerts
  const handleGeofenceAlert = (event: GeofenceAlertEvent) => {
    // Create new alert from WebSocket event
    const newAlert: GPSAlert = {
      id: event.alert_id,
      device_id: '', // Will be populated from backend
      vehicle_id: event.vehicle_id,
      geofence_id: event.geofence_id,
      alert_type: 'geofence',
      severity: 'medium',
      message: `Vehículo ${event.vehicle_plate} ${event.alert_type === 'entry' ? 'ingresó a' : 'salió de'} ${event.geofence_name}`,
      status: 'active',
      metadata: {
        type: event.alert_type,
        latitude: event.location.latitude,
        longitude: event.location.longitude,
        geofence_name: event.geofence_name,
        vehicle_plate: event.vehicle_plate
      },
      created_at: event.timestamp,
      triggered_at: event.timestamp
    };

    // Add to alerts list
    setAlerts(prev => [newAlert, ...prev]);

    // Show notification if enabled
    if (notificationsEnabled) {
      const alertType = event.alert_type === 'entry' ? 'ingresó a' : 'salió de';
      toast.warning(`🚨 Alerta de Geocerca: Vehículo ${event.vehicle_plate} ${alertType} ${event.geofence_name}`, {
        duration: 5000,
        action: {
          label: 'Ver',
          onClick: () => onAlertClick?.(newAlert)
        }
      });
    }
  };

  const { isConnected } = useWebSocket({
    onGeofenceAlert: handleGeofenceAlert,
    autoConnect: true
  });

  // Load alerts
  const loadAlerts = async () => {
    try {
      setLoading(true);
      const alertsData = await GPSService.getGPSAlerts();
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast.error('Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filter.status !== 'all' && alert.status !== filter.status) return false;
    if (filter.severity !== 'all' && alert.severity !== filter.severity) return false;
    if (filter.alertType !== 'all' && alert.alert_type !== filter.alertType) return false;
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        alert.message.toLowerCase().includes(searchLower) ||
        alert.metadata?.vehicle_plate?.toLowerCase().includes(searchLower) ||
        alert.metadata?.geofence_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      // Update alert status in backend
      await GPSService.updateGPSAlert(alertId, { status: 'acknowledged' });
      
      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'acknowledged', acknowledged_at: new Date().toISOString() }
          : alert
      ));
      
      toast.success('Alerta reconocida');
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Error al reconocer alerta');
    }
  };

  // Resolve alert
  const resolveAlert = async (alertId: string) => {
    try {
      // Update alert status in backend
      await GPSService.updateGPSAlert(alertId, { status: 'resolved' });
      
      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'resolved', resolved_at: new Date().toISOString() }
          : alert
      ));
      
      toast.success('Alerta resuelta');
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Error al resolver alerta');
    }
  };

  // Delete alert
  const deleteAlert = async (alertId: string) => {
    try {
      await GPSService.deleteGPSAlert(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast.success('Alerta eliminada');
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Error al eliminar alerta');
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'geofence':
        return <MapPin className="w-4 h-4" />;
      case 'speed':
        return <AlertTriangle className="w-4 h-4" />;
      case 'battery':
        return <AlertTriangle className="w-4 h-4" />;
      case 'offline':
        return <XCircle className="w-4 h-4" />;
      case 'panic':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertColor = (severity: string, status: string) => {
    if (status === 'resolved') return 'text-green-600 bg-green-50 border-green-200';
    if (status === 'acknowledged') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="destructive">Activa</Badge>;
      case 'acknowledged':
        return <Badge variant="secondary">Reconocida</Badge>;
      case 'resolved':
        return <Badge variant="default">Resuelta</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sistema de Alertas</h2>
            <p className="text-sm text-gray-600">
              {isConnected ? (
                <span className="text-green-600">🟢 Conectado - Alertas en tiempo real</span>
              ) : (
                <span className="text-red-600">🔴 Desconectado</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {notificationsEnabled ? 'Notificaciones On' : 'Notificaciones Off'}
          </Button>
          
          <Button
            onClick={loadAlerts}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar alertas..."
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filter.status}
            onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value as any }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="acknowledged">Reconocidas</option>
            <option value="resolved">Resueltas</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filter.severity}
            onChange={(e) => setFilter(prev => ({ ...prev, severity: e.target.value as any }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las severidades</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>

          {/* Type Filter */}
          <select
            value={filter.alertType}
            onChange={(e) => setFilter(prev => ({ ...prev, alertType: e.target.value as any }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los tipos</option>
            <option value="geofence">Geocerca</option>
            <option value="speed">Velocidad</option>
            <option value="battery">Batería</option>
            <option value="offline">Desconexión</option>
            <option value="panic">Pánico</option>
          </select>
        </div>
      </Card>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="p-6 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600">Cargando alertas...</p>
          </Card>
        ) : filteredAlerts.length === 0 ? (
          <Card className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No hay alertas que mostrar</p>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`p-4 border-l-4 ${getAlertColor(alert.severity, alert.status)} cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => onAlertClick?.(alert)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-full ${getAlertColor(alert.severity, alert.status)}`}>
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {alert.message}
                      </h3>
                      {getStatusBadge(alert.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(alert.triggered_at)}
                      </div>
                      
                      {alert.metadata?.vehicle_plate && (
                        <div className="flex items-center gap-1">
                          <span>Vehículo: {alert.metadata.vehicle_plate}</span>
                        </div>
                      )}
                      
                      {alert.metadata?.geofence_name && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {alert.metadata.geofence_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 ml-4">
                  {alert.status === 'active' && (
                    <>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          acknowledgeAlert(alert.id);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Reconocer
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveAlert(alert.id);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Resolver
                      </Button>
                    </>
                  )}
                  
                  {alert.status === 'acknowledged' && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        resolveAlert(alert.id);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Resolver
                    </Button>
                  )}
                  
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAlert(alert.id);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {alerts.filter(a => a.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Alertas Activas</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {alerts.filter(a => a.status === 'acknowledged').length}
            </div>
            <div className="text-sm text-gray-600">Reconocidas</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {alerts.filter(a => a.status === 'resolved').length}
            </div>
            <div className="text-sm text-gray-600">Resueltas</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {alerts.filter(a => a.alert_type === 'geofence').length}
            </div>
            <div className="text-sm text-gray-600">Alertas de Geocerca</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GeofenceAlertSystem;