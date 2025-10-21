import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Package, Clock, AlertTriangle, Building2, ShoppingCart, Download, RefreshCw, Plus, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { httpService } from '@/services/httpService';
import { materialesService } from '@/services/materiales';
import { MaterialFormData } from '@/types';
import { useAuth } from '../hooks/useAuth';

interface KPIData {
  totalWorks: number;
  activeWorks: number;
  totalMaterials: number;
  totalStock: number;
  pendingRequests: number;
  completedOrders: number;
  averageProcessingTime: number;
  stockTurnover: number;
}

interface WorkComparison {
  workId: string;
  workName: string;
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  totalMaterials: number;
  stockValue: number;
  efficiency: number;
  lastActivity: string;
}

interface WarehouseWorkerEfficiency {
  workerId: string;
  workerName: string;
  workerEmail: string;
  totalRequests: number;
  completedRequests: number;
  averageProcessingTime: number;
  accuracy: number;
  productivity: number;
  lastActivity: string;
}

interface DashboardMetrics {
  kpis: KPIData;
  workComparisons: WorkComparison[];
  workerEfficiency: WarehouseWorkerEfficiency[];
  trends: {
    requestsTrend: Array<{ date: string; count: number }>;
    stockTrend: Array<{ date: string; value: number }>;
    efficiencyTrend: Array<{ date: string; efficiency: number }>;
  };
}



const CoordinationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Logs de debugging para identificar el componente
  console.log('🏢 CoordinationDashboard: Componente inicializado');
  console.log('🏢 CoordinationDashboard: Usuario actual:', user?.email, 'Rol:', user?.rol);
  
  // Material creation form state
  const [materialForm, setMaterialForm] = useState<MaterialFormData>({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    unidad_medida: '',
    precio_referencial: 0,
    stock_minimo: 0
  });
  const [creatingMaterial, setCreatingMaterial] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setRefreshing(true);

      
      if (!mountedRef.current) return;
      
      const response = await httpService.getAnalyticsDashboard();
      // Convertir los datos para que coincidan con el tipo esperado
      const convertedMetrics: DashboardMetrics = {
        kpis: response.data.kpis,
        workComparisons: response.data.workComparisons.map((work: { workId: string; workName: string; totalTasks?: number; completedTasks?: number; efficiency: number }) => ({
          workId: work.workId,
          workName: work.workName,
          totalRequests: work.totalTasks || 0,
          completedRequests: work.completedTasks || 0,
          pendingRequests: (work.totalTasks || 0) - (work.completedTasks || 0),
          totalMaterials: 0,
          stockValue: 0,
          efficiency: work.efficiency,
          lastActivity: new Date().toISOString()
        })),
        workerEfficiency: response.data.workerEfficiency.map((worker: { workerId: string; workerName: string; tasksCompleted: number; averageTime: number; efficiency: number }) => ({
          workerId: worker.workerId,
          workerName: worker.workerName,
          workerEmail: `${worker.workerName.toLowerCase().replace(' ', '.')}@empresa.com`,
          totalRequests: worker.tasksCompleted + Math.floor(Math.random() * 20),
          completedRequests: worker.tasksCompleted,
          averageProcessingTime: worker.averageTime,
          accuracy: Math.random() * 10 + 90,
          productivity: worker.efficiency,
          lastActivity: new Date().toISOString()
        })),
        trends: {
          requestsTrend: response.data.trends.map((trend: { date: string; requests: number }) => ({
            date: trend.date,
            count: trend.requests
          })),
          stockTrend: response.data.trends.map((trend: { date: string }) => ({
            date: trend.date,
            value: Math.floor(Math.random() * 1000) + 500
          })),
          efficiencyTrend: response.data.trends.map((trend: { date: string; efficiency: number }) => ({
            date: trend.date,
            efficiency: trend.efficiency
          }))
        }
      };
      if (!mountedRef.current) return;
      
      setMetrics(convertedMetrics);
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const exportReport = async (type: 'efficiency' | 'works') => {
    try {
      const endpoint = type === 'efficiency' ? '/api/analytics/reports/efficiency' : '/api/analytics/reports/works';
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al generar reporte');
      }
      
      const data = await response.json();
      
      // Crear y descargar archivo JSON
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${type}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Error al exportar el reporte');
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingMaterial(true);
    
    try {
      const materialData = {
        ...materialForm,
        unidad: materialForm.unidad_medida,
        activo: true
      };
      await materialesService.create({
        ...materialData,
        precio_unitario: materialData.precio_referencial ?? 0
      });
      toast.success('Material creado exitosamente');
      
      // Reset form
      setMaterialForm({
        codigo: '',
        nombre: '',
        descripcion: '',
        categoria: '',
        unidad_medida: '',
        precio_referencial: 0,
        stock_minimo: 0
      });
    } catch (error) {
      console.error('Error creating material:', error);
      toast.error('Error al crear el material');
    } finally {
      setCreatingMaterial(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
    const loadData = async () => {
      if (!mountedRef.current) return;
      
      try {
        await fetchMetrics();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error al cargar datos</h2>
          <Button onClick={fetchMetrics}>Reintentar</Button>
        </div>
      </div>
    );
  }

  const { kpis, workComparisons, workerEfficiency, trends } = metrics;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Ejecutivo</h1>
          <p className="text-gray-600 mt-1">Dashboard de coordinación y análisis</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchMetrics}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            onClick={() => exportReport('efficiency')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Obras</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalWorks}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.activeWorks} activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.totalMaterials} materiales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requerimientos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.completedOrders} completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.averageProcessingTime.toFixed(1)}d</div>
            <p className="text-xs text-muted-foreground">
              Rotación: {kpis.stockTurnover.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/solicitudes-compra')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Solicitudes de Compra</h3>
                <p className="text-gray-600 text-sm">Gestionar solicitudes de compra</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/requerimientos')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Requerimientos</h3>
                <p className="text-gray-600 text-sm">Ver requerimientos de obras</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/ordenes-compra')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Órdenes de Compra</h3>
                <p className="text-gray-600 text-sm">Gestionar órdenes de compra</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="works">Análisis de Obras</TabsTrigger>
          <TabsTrigger value="workers">Eficiencia Almaceneros</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="materials">Crear Materiales</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Efficiency Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Eficiencia por Obra</CardTitle>
                <CardDescription>Comparación de rendimiento entre obras</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={workComparisons.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="workName" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="efficiency" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Worker Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Top Almaceneros</CardTitle>
                <CardDescription>Rendimiento por productividad</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workerEfficiency.slice(0, 5).map((worker, index) => (
                    <div key={worker.workerId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {index + 1}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{worker.workerName}</p>
                          <p className="text-xs text-gray-500">{worker.workerEmail}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{worker.productivity}</p>
                        <p className="text-xs text-gray-500">{worker.accuracy.toFixed(1)}% precisión</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Works Analysis Tab */}
        <TabsContent value="works" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Análisis Comparativo de Obras</h3>
            <Button onClick={() => exportReport('works')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Análisis
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {workComparisons.map((work) => (
              <Card key={work.workId}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold">{work.workName}</h4>
                      <p className="text-sm text-gray-500">ID: {work.workId}</p>
                    </div>
                    <Badge 
                      variant={work.efficiency >= 80 ? "default" : work.efficiency >= 60 ? "secondary" : "destructive"}
                    >
                      {work.efficiency.toFixed(1)}% eficiencia
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Requerimientos</p>
                      <p className="text-xl font-semibold">{work.totalRequests}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Completados</p>
                      <p className="text-xl font-semibold text-green-600">{work.completedRequests}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pendientes</p>
                      <p className="text-xl font-semibold text-orange-600">{work.pendingRequests}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Valor Stock</p>
                      <p className="text-xl font-semibold">S/ {work.stockValue.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <Progress value={work.efficiency} className="mb-2" />
                  <p className="text-xs text-gray-500">
                    Última actividad: {new Date(work.lastActivity).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Workers Efficiency Tab */}
        <TabsContent value="workers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Eficiencia de Almaceneros</h3>
            <Button onClick={() => exportReport('efficiency')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Reporte
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workerEfficiency.map((worker) => (
              <Card key={worker.workerId}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold">{worker.workerName}</h4>
                      <p className="text-sm text-gray-500">{worker.workerEmail}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={worker.accuracy >= 90 ? "default" : "secondary"}>
                        {worker.accuracy.toFixed(1)}% precisión
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Requerimientos</p>
                      <p className="text-xl font-semibold">{worker.totalRequests}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Completados</p>
                      <p className="text-xl font-semibold text-green-600">{worker.completedRequests}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tiempo Promedio</p>
                      <p className="text-xl font-semibold">{worker.averageProcessingTime.toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Productividad</p>
                      <p className="text-xl font-semibold">{worker.productivity}</p>
                    </div>
                  </div>
                  
                  <Progress value={worker.accuracy} className="mb-2" />
                  <p className="text-xs text-gray-500">
                    Última actividad: {new Date(worker.lastActivity).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requests Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Requerimientos</CardTitle>
                <CardDescription>Últimos 30 días</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.requestsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stock Value Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Valor del Stock</CardTitle>
                <CardDescription>Evolución del valor total</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.stockTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`S/ ${Number(value).toLocaleString()}`, 'Valor']} />
                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Efficiency Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tendencia de Eficiencia</CardTitle>
                <CardDescription>Eficiencia general del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.efficiencyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Eficiencia']} />
                    <Line type="monotone" dataKey="efficiency" stroke="#F59E0B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Materials Creation Tab */}
        <TabsContent value="materials" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Crear Nuevo Material</h3>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">Gestión de Materiales</span>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Información del Material
              </CardTitle>
              <CardDescription>
                Complete los datos del nuevo material para agregarlo al catálogo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateMaterial} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código *
                    </label>
                    <input
                      type="text"
                      required
                      value={materialForm.codigo}
                      onChange={(e) => setMaterialForm({ ...materialForm, codigo: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: MAT-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={materialForm.nombre}
                      onChange={(e) => setMaterialForm({ ...materialForm, nombre: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre del material"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={materialForm.descripcion}
                      onChange={(e) => setMaterialForm({ ...materialForm, descripcion: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Descripción detallada del material"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría *
                    </label>
                    <select
                      required
                      value={materialForm.categoria}
                      onChange={(e) => setMaterialForm({ ...materialForm, categoria: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar categoría</option>
                      <option value="Construcción">Construcción</option>
                      <option value="Herramientas">Herramientas</option>
                      <option value="Eléctrico">Eléctrico</option>
                      <option value="Plomería">Plomería</option>
                      <option value="Acabados">Acabados</option>
                      <option value="Seguridad">Seguridad</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unidad *
                    </label>
                    <select
                      required
                      value={materialForm.unidad_medida}
                      onChange={(e) => setMaterialForm({ ...materialForm, unidad_medida: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar unidad</option>
                      <option value="Unidad">Unidad</option>
                      <option value="Metro">Metro</option>
                      <option value="Metro cuadrado">Metro cuadrado</option>
                      <option value="Metro cúbico">Metro cúbico</option>
                      <option value="Kilogramo">Kilogramo</option>
                      <option value="Litro">Litro</option>
                      <option value="Caja">Caja</option>
                      <option value="Bolsa">Bolsa</option>
                      <option value="Rollo">Rollo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Unitario (S/) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={materialForm.precio_referencial || 0}
                      onChange={(e) => setMaterialForm({ ...materialForm, precio_referencial: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Mínimo *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={materialForm.stock_minimo}
                      onChange={(e) => setMaterialForm({ ...materialForm, stock_minimo: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ubicación
                    </label>
                    <input
                      type="text"
                      value={materialForm.subcategoria || ''}
                      onChange={(e) => setMaterialForm({ ...materialForm, subcategoria: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Almacén A - Estante 1"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMaterialForm({
                      codigo: '',
                      nombre: '',
                      descripcion: '',
                      categoria: '',
                      unidad_medida: '',
                      precio_referencial: 0,
                      stock_minimo: 0,
                      subcategoria: ''
                    })}
                  >
                    Limpiar
                  </Button>
                  <Button
                    type="submit"
                    disabled={creatingMaterial}
                    className="flex items-center gap-2"
                  >
                    {creatingMaterial ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {creatingMaterial ? 'Creando...' : 'Crear Material'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoordinationDashboard;