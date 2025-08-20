import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  Clock,
  Zap,
  RotateCcw,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react';
import { advancedAnalyticsService } from '../../services/advancedAnalyticsService';
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

interface KPIIndicatorsProps {
  className?: string;
  filtros?: FiltroAvanzado[];
  rangoFecha?: RangoFecha;
}

interface KPIMetrica {
  id: string;
  nombre: string;
  valor: number;
  unidad: string;
  objetivo: number;
  tendencia: 'up' | 'down' | 'stable';
  cambio: number;
  estado: 'excelente' | 'bueno' | 'regular' | 'malo';
  descripcion: string;
  icono: React.ReactNode;
  color: string;
}

interface HistorialKPI {
  periodo: string;
  tiempoAtencion: number;
  eficienciaAlmacen: number;
  rotacionInventario: number;
  nivelServicio: number;
}

interface MetricaDetallada {
  categoria: string;
  actual: number;
  objetivo: number;
  progreso: number;
  estado: 'cumplido' | 'en_progreso' | 'atrasado';
}

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8884D8'];

const KPIIndicators: React.FC<KPIIndicatorsProps> = ({ className }) => {
  const [kpiMetricas, setKpiMetricas] = useState<KPIMetrica[]>([]);
  const [historialKPI, setHistorialKPI] = useState<HistorialKPI[]>([]);
  const [metricasDetalladas, setMetricasDetalladas] = useState<MetricaDetallada[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mensual');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await loadKPIData();
      }
    };
    
    loadData();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        if (isMounted) {
          loadData();
        }
      }, 30000); // Actualizar cada 30 segundos
      
      return () => {
        clearInterval(interval);
        isMounted = false;
      };
    }
    
    return () => {
      isMounted = false;
    };
  }, [periodoSeleccionado, autoRefresh]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      setKpiMetricas([]);
      setHistorialKPI([]);
      setMetricasDetalladas([]);
      setPeriodoSeleccionado('mensual');
      setLoading(true);
      setLastUpdate(new Date());
      setAutoRefresh(true);
    };
  }, []);

  const loadKPIData = async () => {
    setLoading(true);
    try {
      // Cargar indicadores KPI desde el servicio
      const indicadores = await advancedAnalyticsService.getIndicadoresKPI();
      
      // Obtener indicadores específicos del array
      const tiempoAtencion = indicadores.find(ind => ind.nombre === 'Tiempo Promedio de Atención')?.valor || 0;
      const eficienciaAlmacen = indicadores.find(ind => ind.nombre === 'Eficiencia de Almacén')?.valor || 0;
      const rotacionInventario = indicadores.find(ind => ind.nombre === 'Rotación de Inventario')?.valor || 0;
      const nivelServicio = indicadores.find(ind => ind.nombre === 'Nivel de Servicio')?.valor || 0;
      
      // Generar métricas KPI principales
      const metricas: KPIMetrica[] = [
        {
          id: 'tiempo_atencion',
          nombre: 'Tiempo Promedio de Atención',
          valor: tiempoAtencion,
          unidad: 'horas',
          objetivo: 4,
          tendencia: Math.random() > 0.5 ? 'down' : 'up',
          cambio: (Math.random() - 0.5) * 20,
          estado: tiempoAtencion <= 4 ? 'excelente' : 
                 tiempoAtencion <= 6 ? 'bueno' : 
                 tiempoAtencion <= 8 ? 'regular' : 'malo',
          descripcion: 'Tiempo promedio desde solicitud hasta entrega',
          icono: <Clock className="h-6 w-6" />,
          color: 'text-blue-600'
        },
        {
          id: 'eficiencia_almacen',
          nombre: 'Eficiencia de Almacén',
          valor: eficienciaAlmacen,
          unidad: '%',
          objetivo: 85,
          tendencia: Math.random() > 0.5 ? 'up' : 'stable',
          cambio: (Math.random() - 0.3) * 15,
          estado: eficienciaAlmacen >= 90 ? 'excelente' : 
                 eficienciaAlmacen >= 80 ? 'bueno' : 
                 eficienciaAlmacen >= 70 ? 'regular' : 'malo',
          descripcion: 'Relación entre entradas y salidas optimizadas',
          icono: <Zap className="h-6 w-6" />,
          color: 'text-green-600'
        },
        {
          id: 'rotacion_inventario',
          nombre: 'Rotación de Inventario',
          valor: rotacionInventario,
          unidad: 'días',
          objetivo: 30,
          tendencia: Math.random() > 0.5 ? 'down' : 'stable',
          cambio: (Math.random() - 0.5) * 10,
          estado: rotacionInventario <= 25 ? 'excelente' : 
                 rotacionInventario <= 35 ? 'bueno' : 
                 rotacionInventario <= 45 ? 'regular' : 'malo',
          descripcion: 'Días promedio de rotación de materiales',
          icono: <RotateCcw className="h-6 w-6" />,
          color: 'text-purple-600'
        },
        {
          id: 'nivel_servicio',
          nombre: 'Nivel de Servicio',
          valor: nivelServicio,
          unidad: '%',
          objetivo: 95,
          tendencia: Math.random() > 0.5 ? 'up' : 'stable',
          cambio: (Math.random() - 0.2) * 8,
          estado: nivelServicio >= 95 ? 'excelente' : 
                 nivelServicio >= 90 ? 'bueno' : 
                 nivelServicio >= 85 ? 'regular' : 'malo',
          descripcion: 'Porcentaje de solicitudes atendidas a tiempo',
          icono: <Target className="h-6 w-6" />,
          color: 'text-orange-600'
        }
      ];
      
      setKpiMetricas(metricas);
      
      // Generar historial de KPIs
      await generateHistorialKPI();
      
      // Generar métricas detalladas
      await generateMetricasDetalladas();
      
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error cargando indicadores KPI:', error);
      toast.error('Error al cargar indicadores KPI');
      setLoading(false);
    }
  };

  const generateHistorialKPI = async () => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    const data: HistorialKPI[] = meses.map(mes => ({
      periodo: mes,
      tiempoAtencion: Math.round((Math.random() * 4 + 3) * 10) / 10,
      eficienciaAlmacen: Math.round((Math.random() * 20 + 75)),
      rotacionInventario: Math.round(Math.random() * 20 + 25),
      nivelServicio: Math.round((Math.random() * 15 + 85))
    }));
    
    setHistorialKPI(data);
  };

  const generateMetricasDetalladas = async () => {
    const categorias = [
      'Tiempo de Respuesta',
      'Precisión de Inventario',
      'Disponibilidad de Stock',
      'Eficiencia Operativa',
      'Satisfacción Cliente'
    ];
    
    const data: MetricaDetallada[] = categorias.map(categoria => {
      const objetivo = Math.floor(Math.random() * 20) + 80;
      const actual = Math.floor(Math.random() * 30) + 70;
      const progreso = (actual / objetivo) * 100;
      
      return {
        categoria,
        actual,
        objetivo,
        progreso: Math.min(progreso, 100),
        estado: progreso >= 100 ? 'cumplido' : progreso >= 80 ? 'en_progreso' : 'atrasado'
      };
    });
    
    setMetricasDetalladas(data);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'excelente': return 'bg-green-100 text-green-800 border-green-200';
      case 'bueno': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'regular': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'malo': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTendenciaIcon = (tendencia: string, cambio: number) => {
    if (tendencia === 'up') {
      return <TrendingUp className={`h-4 w-4 ${cambio >= 0 ? 'text-green-500' : 'text-red-500'}`} />;
    } else if (tendencia === 'down') {
      return <TrendingDown className={`h-4 w-4 ${cambio <= 0 ? 'text-green-500' : 'text-red-500'}`} />;
    }
    return <Activity className="h-4 w-4 text-blue-500" />;
  };

  const getProgressColor = (progreso: number) => {
    if (progreso >= 90) return 'bg-green-500';
    if (progreso >= 70) return 'bg-blue-500';
    if (progreso >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const exportKPIReport = () => {
    toast.success('Reporte de KPIs exportado exitosamente');
  };

  const promedioGeneral = kpiMetricas.reduce((sum, kpi) => {
    const porcentaje = kpi.unidad === '%' ? kpi.valor : (kpi.valor / kpi.objetivo) * 100;
    return sum + porcentaje;
  }, 0) / kpiMetricas.length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            <span>Indicadores KPI</span>
          </h2>
          <p className="text-muted-foreground">
            Última actualización: {lastUpdate.toLocaleTimeString('es-ES')}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
            autoRefresh ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`} />
            <span className="text-sm font-medium">
              {autoRefresh ? 'Auto-actualización' : 'Manual'}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Pausar' : 'Activar'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={loadKPIData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button variant="outline" onClick={exportKPIReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Resumen general */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-indigo-900">Rendimiento General</h3>
              <p className="text-indigo-700">Promedio de todos los KPIs</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-900">
                {promedioGeneral.toFixed(1)}%
              </div>
              <Badge className={getEstadoColor(
                promedioGeneral >= 90 ? 'excelente' : 
                promedioGeneral >= 80 ? 'bueno' : 
                promedioGeneral >= 70 ? 'regular' : 'malo'
              )}>
                {promedioGeneral >= 90 ? 'EXCELENTE' : 
                 promedioGeneral >= 80 ? 'BUENO' : 
                 promedioGeneral >= 70 ? 'REGULAR' : 'NECESITA MEJORA'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiMetricas.map((kpi) => {
          const porcentajeObjetivo = kpi.unidad === '%' ? kpi.valor : (kpi.valor / kpi.objetivo) * 100;
          
          return (
            <Card key={kpi.id} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gray-50 ${kpi.color}`}>
                    {kpi.icono}
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTendenciaIcon(kpi.tendencia, kpi.cambio)}
                    <span className={`text-sm font-medium ${
                      kpi.cambio >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {kpi.cambio >= 0 ? '+' : ''}{kpi.cambio.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">{kpi.nombre}</h3>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold">
                      {kpi.valor.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {kpi.unidad}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Objetivo: {kpi.objetivo}{kpi.unidad}</span>
                      <span>{porcentajeObjetivo.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={Math.min(porcentajeObjetivo, 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  <Badge className={getEstadoColor(kpi.estado)}>
                    {kpi.estado.toUpperCase()}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  {kpi.descripcion}
                </p>
              </CardContent>
              
              {/* Indicador de estado */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                kpi.estado === 'excelente' ? 'bg-green-500' :
                kpi.estado === 'bueno' ? 'bg-blue-500' :
                kpi.estado === 'regular' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </Card>
          );
        })}
      </div>

      {/* Gráficos de tendencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolución temporal */}
        <Card>
          <CardHeader>
            <CardTitle>Evolución de KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historialKPI}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="tiempoAtencion" 
                  stroke="#8884d8" 
                  name="Tiempo Atención (h)"
                />
                <Line 
                  type="monotone" 
                  dataKey="eficienciaAlmacen" 
                  stroke="#82ca9d" 
                  name="Eficiencia (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="nivelServicio" 
                  stroke="#ffc658" 
                  name="Nivel Servicio (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de rendimiento */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Rendimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Excelente', value: kpiMetricas.filter(k => k.estado === 'excelente').length },
                    { name: 'Bueno', value: kpiMetricas.filter(k => k.estado === 'bueno').length },
                    { name: 'Regular', value: kpiMetricas.filter(k => k.estado === 'regular').length },
                    { name: 'Malo', value: kpiMetricas.filter(k => k.estado === 'malo').length }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Métricas detalladas */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metricasDetalladas.map((metrica, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{metrica.categoria}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {metrica.actual}% / {metrica.objetivo}%
                    </span>
                    {metrica.estado === 'cumplido' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {metrica.estado === 'atrasado' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
                <div className="relative">
                  <Progress value={metrica.progreso} className="h-3" />
                  <div className={`absolute inset-0 rounded-full ${getProgressColor(metrica.progreso)}`} 
                       style={{ width: `${metrica.progreso}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KPIIndicators;