import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  DollarSign,
  Package,
  Clock,
  Target,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { advancedAnalyticsService, DashboardMetricas, IndicadorKPI } from '../../services/advancedAnalyticsService';
import { toast } from 'sonner';

interface FiltroAvanzado {
  id: string;
  campo: string;
  operador: 'igual' | 'contiene' | 'mayor' | 'menor' | 'entre' | 'en';
  valor: any;
  activo: boolean;
  tipo: 'texto' | 'numero' | 'fecha' | 'select' | 'multiselect';
  opciones?: { label: string; value: string }[];
}

interface RangoFecha {
  desde: Date | null;
  hasta: Date | null;
}

interface AdvancedDashboardProps {
  userRole: string;
  filtros?: FiltroAvanzado[];
  rangoFecha?: RangoFecha;
  autoRefresh?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({ userRole }) => {
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [kpis, setKpis] = useState<IndicadorKPI[]>([]);
  const [consumoData, setConsumoData] = useState<any[]>([]);
  const [rotacionData, setRotacionData] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [costosData, setCostosData] = useState<any[]>([]);
  const [predicciones, setPredicciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedObra, setSelectedObra] = useState('todas');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('metricas');

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;
    
    const loadData = async () => {
      if (isMounted) {
        await loadDashboardData();
      }
    };
    
    loadData();
    
    if (autoRefresh && isMounted) {
      interval = setInterval(() => {
        if (isMounted) {
          loadData();
        }
      }, 30000);
    }
    
    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [selectedPeriod, selectedObra, autoRefresh]);
  
  // Cleanup effect para resetear estado al desmontar
  useEffect(() => {
    return () => {
      setMetricas(null);
      setKpis([]);
      setConsumoData([]);
      setRotacionData([]);
      setAlertas([]);
      setCostosData([]);
      setPredicciones([]);
      setLoading(true);
      setActiveTab('metricas');
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar métricas principales
      const dashboardMetricas = await advancedAnalyticsService.getDashboardMetricas();
      setMetricas(dashboardMetricas);
      
      // Cargar KPIs
      const indicadores = await advancedAnalyticsService.getIndicadoresKPI();
      setKpis(indicadores);
      
      // Cargar datos de consumo
      const fechaFin = new Date().toISOString().split('T')[0];
      const fechaInicio = new Date(Date.now() - parseInt(selectedPeriod) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      const consumo = await advancedAnalyticsService.getMetricasConsumo(fechaInicio, fechaFin);
      const consumoAgrupado = agruparConsumoPorFecha(consumo);
      setConsumoData(consumoAgrupado);
      
      // Cargar rotación de inventario
      const rotacion = await advancedAnalyticsService.getRotacionInventario();
      setRotacionData(rotacion.slice(0, 10)); // Top 10
      
      // Cargar alertas
      const alertasStock = await advancedAnalyticsService.getAlertasStockBajo();
      setAlertas(alertasStock.slice(0, 5)); // Top 5 más críticas
      
      // Cargar análisis de costos
      const costos = await advancedAnalyticsService.getAnalisisCostos(fechaInicio, fechaFin);
      setCostosData(costos.slice(0, 5)); // Top 5 obras
      
      // Cargar predicciones
      const prediccionesDemanda = await advancedAnalyticsService.getPrediccionesDemanda();
      setPredicciones(prediccionesDemanda.slice(0, 8)); // Top 8
      
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const agruparConsumoPorFecha = (consumo: any[]) => {
    const agrupado = consumo.reduce((acc, item) => {
      const fecha = item.fecha;
      if (!acc[fecha]) {
        acc[fecha] = { fecha, cantidad: 0, costo: 0 };
      }
      acc[fecha].cantidad += item.cantidad;
      acc[fecha].costo += item.costo;
      return acc;
    }, {});
    
    return Object.values(agrupado).sort((a: any, b: any) => 
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );
  };

  const exportarReporte = async (tipo: string) => {
    try {
      toast.success(`Exportando reporte de ${tipo}...`);
      // Aquí implementarías la lógica de exportación
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };

  const getTrendIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'positiva':
      case 'creciente':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negativa':
      case 'decreciente':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCriticidadColor = (nivel: string) => {
    switch (nivel) {
      case 'alto': return 'destructive';
      case 'medio': return 'default';
      case 'bajo': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading && !metricas) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Avanzado</h1>
          <p className="text-muted-foreground">Métricas en tiempo real y análisis predictivo</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 días</SelectItem>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="90">90 días</SelectItem>
              <SelectItem value="365">1 año</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => exportarReporte('completo')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      {metricas && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Consumo Hoy</p>
                  <p className="text-2xl font-bold">${metricas.consumoHoy.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Consumo Mes</p>
                  <p className="text-2xl font-bold">${metricas.consumoMesActual.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rotación Promedio</p>
                  <p className="text-2xl font-bold">{metricas.rotacionPromedio} días</p>
                </div>
                <Package className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alertas Activas</p>
                  <p className="text-2xl font-bold">{metricas.alertasActivas}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Eficiencia</p>
                  <p className="text-2xl font-bold">{metricas.eficienciaAlmacen}%</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tiempo Atención</p>
                  <p className="text-2xl font-bold">{metricas.tiempoPromedioAtencion}h</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metricas">Métricas en Tiempo Real</TabsTrigger>
          <TabsTrigger value="predictivos">Reportes Predictivos</TabsTrigger>
          <TabsTrigger value="costos">Análisis de Costos</TabsTrigger>
          <TabsTrigger value="kpis">Indicadores KPI</TabsTrigger>
        </TabsList>

        {/* Métricas en Tiempo Real */}
        <TabsContent value="metricas" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Consumo */}
            <Card>
              <CardHeader>
                <CardTitle>Consumo por Período</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={consumoData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'costo' ? `$${value.toLocaleString()}` : value,
                      name === 'costo' ? 'Costo' : 'Cantidad'
                    ]} />
                    <Area type="monotone" dataKey="costo" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Rotación de Inventario */}
            <Card>
              <CardHeader>
                <CardTitle>Rotación de Inventario (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rotacionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="materialNombre" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} días`, 'Rotación']} />
                    <Bar dataKey="rotacionDias" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Alertas de Stock Bajo */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Stock Bajo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertas.map((alerta, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">{alerta.materialNombre}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock: {alerta.stockActual} / Mínimo: {alerta.stockMinimo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getCriticidadColor(alerta.nivelCriticidad)}>
                        {alerta.nivelCriticidad.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {alerta.diasRestantes} días
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reportes Predictivos */}
        <TabsContent value="predictivos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Predicciones de Demanda */}
            <Card>
              <CardHeader>
                <CardTitle>Predicciones de Demanda</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predicciones.map((prediccion, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTrendIcon(prediccion.tendencia)}
                        <div>
                          <p className="font-medium">{prediccion.materialNombre}</p>
                          <p className="text-sm text-muted-foreground">
                            Demanda predicha: {prediccion.demandaPredichaProximoMes} unidades
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{prediccion.confianza}% confianza</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {prediccion.tendencia}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Tendencias */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Tendencias</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={consumoData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cantidad" stroke="#8884d8" name="Cantidad" />
                    <Line type="monotone" dataKey="costo" stroke="#82ca9d" name="Costo" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Análisis de Costos */}
        <TabsContent value="costos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Costos por Obra */}
            <Card>
              <CardHeader>
                <CardTitle>Costos por Obra</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costosData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="obraNombre" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Costo Total']} />
                    <Bar dataKey="costoTotal" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribución de Costos */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Costos por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costosData.length > 0 ? Object.entries(costosData[0]?.costoPorCategoria || {}).map(([categoria, costo]) => ({
                        name: categoria,
                        value: costo
                      })) : []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costosData.length > 0 && Object.entries(costosData[0]?.costoPorCategoria || {}).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Costo']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Indicadores KPI */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpis.map((kpi, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{kpi.nombre}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold">
                        {kpi.valor}{kpi.unidad}
                      </span>
                      {getTrendIcon(kpi.tendencia)}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Meta: {kpi.meta}{kpi.unidad}</span>
                        <span>{kpi.porcentajeCumplimiento.toFixed(1)}%</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            kpi.porcentajeCumplimiento >= 100
                              ? 'bg-green-500'
                              : kpi.porcentajeCumplimiento >= 80
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, kpi.porcentajeCumplimiento)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedDashboard;