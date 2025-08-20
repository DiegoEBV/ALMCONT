import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { warehouseService } from '../services/warehouseService';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Navigation,
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface PickingItem {
  id: string;
  materialId: string;
  materialName: string;
  requestedQuantity: number;
  actualQuantity?: number;
  location: string;
  workName: string;
  status: 'pending' | 'picked' | 'cancelled';
  notes?: string;
}

interface OptimizedPickingList {
  id: string;
  workerId: string;
  items: PickingItem[];
  totalWeight: number;
  estimatedTime: number;
  efficiency: number;
  route: string[];
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

interface LocationAlert {
  id: string;
  type: 'low_stock' | 'misplaced_item' | 'damaged_location' | 'access_blocked';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  materialId?: string;
  materialName?: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  workerId?: string;
}

interface WorkerPerformance {
  workerId: string;
  totalPickingLists: number;
  completedLists: number;
  averageCompletionTime: number;
  efficiency: number;
  accuracyRate: number;
  totalItemsPicked: number;
}

const WarehouseDashboard: React.FC = () => {
  const [pickingLists, setPickingLists] = useState<OptimizedPickingList[]>([]);
  const [alerts, setAlerts] = useState<LocationAlert[]>([]);
  const [performance, setPerformance] = useState<WorkerPerformance | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mock worker ID - in real app this would come from auth context
  const workerId = 'worker-001';

  useEffect(() => {
    mountedRef.current = true;
    
    const loadData = async () => {
      if (!mountedRef.current) return;
      
      try {
        await Promise.all([
          fetchPickingLists(),
          fetchAlerts(),
          fetchPerformance()
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadData();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const fetchPickingLists = async () => {
    try {
      setLoading(true);
      const pickingLists = await warehouseService.getPickingLists('current-worker');
      
      if (!mountedRef.current) return;
      
      setPickingLists(pickingLists);
    } catch (error) {
      console.error('Error fetching picking lists:', error);
      if (mountedRef.current) {
        toast.error('Error al cargar listas de picking');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchAlerts = async () => {
    try {
      const alerts = await warehouseService.getWarehouseAlerts('current-worker');
      
      if (!mountedRef.current) return;
      
      setAlerts(alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      if (mountedRef.current) {
        toast.error('Error al cargar alertas');
      }
    }
  };

  const fetchPerformance = async () => {
    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      const performance = await warehouseService.getWorkerPerformance('current-worker', startDate, endDate);
      
      if (!mountedRef.current) return;
      
      setPerformance(performance);
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const updateItemStatus = async (listId: string, itemId: string, status: string, actualQuantity?: number) => {
    try {
      const success = await warehouseService.updateItemStatus(listId, itemId, status, actualQuantity);
      
      if (success) {
        toast.success('Estado actualizado correctamente');
        fetchPickingLists();
      } else {
        toast.error('Error al actualizar estado');
      }
    } catch (error) {
      console.error('Error updating item status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await warehouseService.acknowledgeAlert(alertId, 'current-worker');
      toast.success('Alerta reconocida');
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Error al reconocer alerta');
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await warehouseService.resolveAlert(alertId, 'current-worker');
      toast.success('Alerta resuelta');
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Error al resolver alerta');
    }
  };



  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'picked': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredPickingLists = pickingLists.filter(list => {
    const matchesSearch = list.items.some(item => 
      item.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.workName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = filterStatus === 'all' || list.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Almacén</h1>
            <p className="text-gray-600">Gestión simplificada para almaceneros</p>
          </div>
          <Button onClick={() => { fetchPickingLists(); fetchAlerts(); fetchPerformance(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Alertas Críticas</AlertTitle>
            <AlertDescription className="text-red-700">
              Hay {criticalAlerts.length} alerta(s) crítica(s) que requieren atención inmediata.
            </AlertDescription>
          </Alert>
        )}

        {/* Performance Cards */}
        {performance && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Listas Completadas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.completedLists}</div>
                <p className="text-xs text-muted-foreground">
                  de {performance.totalPickingLists} totales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.efficiency.toFixed(1)}%</div>
                <Progress value={performance.efficiency} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Precisión</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.accuracyRate.toFixed(1)}%</div>
                <Progress value={performance.accuracyRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Items Recogidos</CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.totalItemsPicked}</div>
                <p className="text-xs text-muted-foreground">
                  Tiempo promedio: {performance.averageCompletionTime.toFixed(1)}min
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="picking" className="space-y-4">
          <TabsList>
            <TabsTrigger value="picking">Listas de Picking</TabsTrigger>
            <TabsTrigger value="alerts">Alertas ({activeAlerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="picking" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="search">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Buscar por material o obra..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="status-filter">Estado</Label>
                    <select
                      id="status-filter"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="all">Todos</option>
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="completed">Completado</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Picking Lists */}
            <div className="grid gap-4">
              {filteredPickingLists.map((list) => (
                <Card key={list.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Lista #{list.id.slice(-6)}
                          <Badge variant={list.status === 'completed' ? 'default' : 'secondary'}>
                            {list.status === 'pending' ? 'Pendiente' :
                             list.status === 'in_progress' ? 'En Progreso' : 'Completado'}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {list.items.length} items • {list.totalWeight.toFixed(1)}kg • 
                          Tiempo estimado: {list.estimatedTime}min • 
                          Eficiencia: {list.efficiency.toFixed(1)}%
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Navigation className="h-4 w-4 mr-1" />
                          Ruta
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          Exportar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {list.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={item.status === 'picked'}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updateItemStatus(list.id, item.id, 'picked', item.requestedQuantity);
                                }
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.materialName}</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                <MapPin className="inline h-3 w-3 mr-1" />
                                {item.location} • {item.workName}
                              </div>
                              <div className="text-sm text-gray-500">
                                Cantidad: {item.requestedQuantity}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            {item.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => updateItemStatus(list.id, item.id, 'picked', item.requestedQuantity)}
                              >
                                Recoger
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="grid gap-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className={alert.severity === 'critical' ? 'border-red-200' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className={`h-5 w-5 ${
                            alert.severity === 'critical' ? 'text-red-500' :
                            alert.severity === 'high' ? 'text-orange-500' :
                            alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                          {alert.type === 'low_stock' ? 'Stock Bajo' :
                           alert.type === 'misplaced_item' ? 'Item Mal Ubicado' :
                           alert.type === 'damaged_location' ? 'Ubicación Dañada' : 'Acceso Bloqueado'}
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity === 'critical' ? 'Crítico' :
                             alert.severity === 'high' ? 'Alto' :
                             alert.severity === 'medium' ? 'Medio' : 'Bajo'}
                          </Badge>
                          <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'}>
                            {alert.status === 'active' ? 'Activa' :
                             alert.status === 'acknowledged' ? 'Reconocida' : 'Resuelta'}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          <MapPin className="inline h-3 w-3 mr-1" />
                          {alert.location}
                          {alert.materialName && ` • ${alert.materialName}`}
                        </CardDescription>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">{alert.message}</p>
                    <div className="flex gap-2">
                      {alert.status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Reconocer
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            Resolver
                          </Button>
                        </>
                      )}
                      {alert.status === 'acknowledged' && (
                        <Button
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolver
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WarehouseDashboard;