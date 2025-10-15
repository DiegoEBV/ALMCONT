import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Bell, 
  BellOff, 
  Settings,
  Calendar,
  Package,
  Users,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { loanAlertService, LoanNotificationAlert, LoanAlertConfig } from '../services/loanAlertService';
import { LoanService } from '../services/loanService';
import { useAuth } from "../hooks/useAuth";

interface AlertStats {
  total: number;
  vencimientoProximo: number;
  prestamosVencidos: number;
  devolucionesParciales: number;
  condicionInadecuada: number;
}

const LoanAlertDashboard: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<LoanNotificationAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<LoanNotificationAlert[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats>({
    total: 0,
    vencimientoProximo: 0,
    prestamosVencidos: 0,
    devolucionesParciales: 0,
    condicionInadecuada: 0
  });
  const [config, setConfig] = useState<LoanAlertConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('alerts');
  
  // Filtros
  const [filters, setFilters] = useState({
    type: 'all',
    priority: 'all',
    status: 'all',
    search: ''
  });

  useEffect(() => {
    if (user?.id) {
      loadAlerts();
      loadConfig();
      
      // Suscribirse a cambios de alertas
      const unsubscribe = loanAlertService.subscribe(user.id, (newAlerts) => {
        setAlerts(newAlerts);
        updateStats(newAlerts);
      });

      return unsubscribe;
    }
  }, [user?.id]);

  useEffect(() => {
    applyFilters();
  }, [alerts, filters]);

  const loadAlerts = async () => {
    if (!user?.id) return;
    
    try {
      const userAlerts = await loanAlertService.getLoanAlerts(user.id);
      setAlerts(userAlerts);
      updateStats(userAlerts);
    } catch (error) {
      console.error('Error loading loan alerts:', error);
      toast.error('Error al cargar alertas de préstamos');
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    if (!user?.id) return;
    
    try {
      const userConfig = await loanAlertService.getAlertConfig(user.id);
      setConfig(userConfig);
    } catch (error) {
      console.error('Error loading alert config:', error);
    }
  };

  const updateStats = (alertList: LoanNotificationAlert[]) => {
    const stats = alertList.reduce((acc, alert) => {
      acc.total++;
      switch (alert.type) {
        case 'vencimiento_proximo':
          acc.vencimientoProximo++;
          break;
        case 'prestamo_vencido':
          acc.prestamosVencidos++;
          break;
        case 'devolucion_parcial':
          acc.devolucionesParciales++;
          break;
        case 'condicion_inadecuada':
          acc.condicionInadecuada++;
          break;
      }
      return acc;
    }, {
      total: 0,
      vencimientoProximo: 0,
      prestamosVencidos: 0,
      devolucionesParciales: 0,
      condicionInadecuada: 0
    });
    
    setAlertStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...alerts];

    if (filters.type !== 'all') {
      filtered = filtered.filter(alert => alert.type === filters.type);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(alert => alert.priority === filters.priority);
    }

    if (filters.status !== 'all') {
      if (filters.status === 'read') {
        filtered = filtered.filter(alert => alert.read);
      } else if (filters.status === 'unread') {
        filtered = filtered.filter(alert => !alert.read);
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(searchLower) ||
        alert.message.toLowerCase().includes(searchLower) ||
        alert.data.numeroPrestamo.toLowerCase().includes(searchLower) ||
        alert.data.terceroNombre.toLowerCase().includes(searchLower)
      );
    }

    setFilteredAlerts(filtered);
  };

  const handleMarkAsRead = async (alertId: string) => {
    if (!user?.id) return;
    
    try {
      await loanAlertService.markAsRead(alertId, user.id);
      toast.success('Alerta marcada como leída');
    } catch (error) {
      console.error('Error marking alert as read:', error);
      toast.error('Error al marcar alerta como leída');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await loanAlertService.markAllAsRead(user.id);
      toast.success('Todas las alertas marcadas como leídas');
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
      toast.error('Error al marcar todas las alertas como leídas');
    }
  };

  const handleConfigChange = async (newConfig: Partial<LoanAlertConfig>) => {
    if (!user?.id) return;
    
    try {
      await loanAlertService.saveAlertConfig({
        ...newConfig,
        userId: user.id
      });
      
      const updatedConfig = await loanAlertService.getAlertConfig(user.id);
      setConfig(updatedConfig);
      toast.success('Configuración guardada');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar configuración');
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'vencimiento_proximo':
        return <Clock className="h-4 w-4" />;
      case 'prestamo_vencido':
        return <AlertTriangle className="h-4 w-4" />;
      case 'devolucion_parcial':
        return <Package className="h-4 w-4" />;
      case 'condicion_inadecuada':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'vencimiento_proximo':
        return 'Vencimiento Próximo';
      case 'prestamo_vencido':
        return 'Préstamo Vencido';
      case 'devolucion_parcial':
        return 'Devolución Parcial';
      case 'condicion_inadecuada':
        return 'Condición Inadecuada';
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alertas de Préstamos</h2>
          <p className="text-gray-600">Sistema de monitoreo y notificaciones</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadAlerts}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Alertas</p>
                <p className="text-2xl font-bold">{alertStats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vencimiento Próximo</p>
                <p className="text-2xl font-bold text-orange-600">{alertStats.vencimientoProximo}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Préstamos Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{alertStats.prestamosVencidos}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Devoluciones Parciales</p>
                <p className="text-2xl font-bold text-yellow-600">{alertStats.devolucionesParciales}</p>
              </div>
              <Package className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Condición Inadecuada</p>
                <p className="text-2xl font-bold text-purple-600">{alertStats.condicionInadecuada}</p>
              </div>
              <XCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Buscar</Label>
                  <Input
                    id="search"
                    placeholder="Buscar por préstamo, tercero..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Tipo de Alerta</Label>
                  <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="vencimiento_proximo">Vencimiento Próximo</SelectItem>
                      <SelectItem value="prestamo_vencido">Préstamo Vencido</SelectItem>
                      <SelectItem value="devolucion_parcial">Devolución Parcial</SelectItem>
                      <SelectItem value="condicion_inadecuada">Condición Inadecuada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las prioridades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las prioridades</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="low">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="unread">No leídas</SelectItem>
                      <SelectItem value="read">Leídas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {alerts.filter(a => !a.read).length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
                    Marcar Todas como Leídas
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts List */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Alertas ({filteredAlerts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-500">No hay alertas que mostrar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 border rounded-lg ${!alert.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${
                            alert.priority === 'high' ? 'bg-red-100 text-red-600' :
                            alert.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {getAlertIcon(alert.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{alert.title}</h4>
                              <Badge variant={getPriorityColor(alert.priority)}>
                                {getTypeLabel(alert.type)}
                              </Badge>
                              {!alert.read && (
                                <Badge variant="default">Nueva</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                            <div className="text-xs text-gray-500 space-y-1">
                              <p>Préstamo: {alert.data.numeroPrestamo}</p>
                              <p>Tercero: {alert.data.terceroNombre}</p>
                              {alert.data.fechaVencimiento && (
                                <p>Fecha vencimiento: {new Date(alert.data.fechaVencimiento).toLocaleDateString('es-PE')}</p>
                              )}
                              {alert.data.diasVencido && (
                                <p>Días vencido: {alert.data.diasVencido}</p>
                              )}
                              <p>Creada: {formatDate(alert.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!alert.read && (
                            <Button
                              onClick={() => handleMarkAsRead(alert.id)}
                              variant="outline"
                              size="sm"
                            >
                              Marcar como Leída
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Alertas</CardTitle>
              <CardDescription>
                Personaliza las notificaciones y alertas de préstamos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tipos de Alertas */}
              <div>
                <h4 className="font-medium mb-4">Tipos de Alertas</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="alertasVencimiento">Alertas de Vencimiento</Label>
                      <p className="text-sm text-gray-500">Notificar cuando un préstamo esté próximo a vencer</p>
                    </div>
                    <Switch
                      id="alertasVencimiento"
                      checked={config?.alertasVencimiento ?? true}
                      onChange={(e) => handleConfigChange({ alertasVencimiento: e.target.checked })}
                    />
                  </div>

                  {config?.alertasVencimiento && (
                    <div className="ml-4">
                      <Label htmlFor="diasAnticipacion">Días de Anticipación</Label>
                      <Input
                        id="diasAnticipacion"
                        type="number"
                        min="1"
                        max="30"
                        value={config?.diasAnticipacion ?? 3}
                        onChange={(e) => handleConfigChange({ diasAnticipacion: parseInt(e.target.value) })}
                        className="w-24"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="alertasPrestamosVencidos">Préstamos Vencidos</Label>
                      <p className="text-sm text-gray-500">Notificar cuando un préstamo esté vencido</p>
                    </div>
                    <Switch
                      id="alertasPrestamosVencidos"
                      checked={config?.alertasPrestamosVencidos ?? true}
                      onChange={(e) => handleConfigChange({ alertasPrestamosVencidos: e.target.checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="alertasDevolucionesParciales">Devoluciones Parciales</Label>
                      <p className="text-sm text-gray-500">Notificar sobre devoluciones parciales pendientes</p>
                    </div>
                    <Switch
                      id="alertasDevolucionesParciales"
                      checked={config?.alertasDevolucionesParciales ?? true}
                      onChange={(e) => handleConfigChange({ alertasDevolucionesParciales: e.target.checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="alertasCondicionInadecuada">Condición Inadecuada</Label>
                      <p className="text-sm text-gray-500">Notificar sobre materiales en condición inadecuada</p>
                    </div>
                    <Switch
                      id="alertasCondicionInadecuada"
                      checked={config?.alertasCondicionInadecuada ?? true}
                      onChange={(e) => handleConfigChange({ alertasCondicionInadecuada: e.target.checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Métodos de Notificación */}
              <div>
                <h4 className="font-medium mb-4">Métodos de Notificación</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="pushNotifications">Notificaciones Push</Label>
                      <p className="text-sm text-gray-500">Mostrar notificaciones en el navegador</p>
                    </div>
                    <Switch
                      id="pushNotifications"
                      checked={config?.pushNotifications ?? true}
                      onChange={(e) => handleConfigChange({ pushNotifications: e.target.checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailNotifications">Notificaciones por Email</Label>
                      <p className="text-sm text-gray-500">Enviar alertas por correo electrónico</p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={config?.emailNotifications ?? false}
                      onChange={(e) => handleConfigChange({ emailNotifications: e.target.checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Horarios Activos */}
              <div>
                <h4 className="font-medium mb-4">Horarios Activos</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="horaInicio">Hora de Inicio</Label>
                    <Input
                      id="horaInicio"
                      type="time"
                      value={config?.horariosActivos?.inicio ?? '08:00'}
                      onChange={(e) => handleConfigChange({
                        horariosActivos: {
                          ...config?.horariosActivos,
                          inicio: e.target.value,
                          fin: config?.horariosActivos?.fin ?? '18:00',
                          diasSemana: config?.horariosActivos?.diasSemana ?? [1, 2, 3, 4, 5]
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="horaFin">Hora de Fin</Label>
                    <Input
                      id="horaFin"
                      type="time"
                      value={config?.horariosActivos?.fin ?? '18:00'}
                      onChange={(e) => handleConfigChange({
                        horariosActivos: {
                          ...config?.horariosActivos,
                          inicio: config?.horariosActivos?.inicio ?? '08:00',
                          fin: e.target.value,
                          diasSemana: config?.horariosActivos?.diasSemana ?? [1, 2, 3, 4, 5]
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoanAlertDashboard;