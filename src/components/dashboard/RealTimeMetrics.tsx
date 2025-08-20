import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Package,
  DollarSign
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

interface RealTimeMetricsProps {
  refreshInterval?: number;
  filtros?: FiltroAvanzado[];
  rangoFecha?: RangoFecha;
  autoRefresh?: boolean;
}

interface ConsumoRealTime {
  timestamp: string;
  cantidad: number;
  costo: number;
  material: string;
}

interface MetricaInstantanea {
  nombre: string;
  valor: number;
  unidad: string;
  cambio: number;
  tendencia: 'up' | 'down' | 'stable';
  color: string;
}

const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ 
  refreshInterval = 10000, 
  filtros, 
  rangoFecha, 
  autoRefresh = true 
}) => {
  const [consumoRealTime, setConsumoRealTime] = useState<ConsumoRealTime[]>([]);
  const [metricasInstantaneas, setMetricasInstantaneas] = useState<MetricaInstantanea[]>([]);
  const [alertasActivas, setAlertasActivas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRealTimeActive, setIsRealTimeActive] = useState(autoRefresh);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup al desmontar el componente
  useEffect(() => {
    console.log('[RealTimeMetrics] Component mounting');
    isMountedRef.current = true;
    
    return () => {
      console.log('[RealTimeMetrics] Component unmounting - cleaning up');
      isMountedRef.current = false;
      if (intervalRef.current) {
        console.log('[RealTimeMetrics] Clearing interval on unmount');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Manejar visibilidad de la página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (document.visibilityState === 'visible' && isRealTimeActive) {
        startRealTimeUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRealTimeActive]);

  // Funciones optimizadas con useCallback

  const loadRealTimeData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    console.log('[RealTimeMetrics] Starting data load');
    setLoading(true);
    
    // Implementar timeout para prevenir bloqueos
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Data load timeout')), 8000); // 8 segundos timeout
    });
    
    try {
      // Simular carga de datos con delay y timeout
      await Promise.race([
        new Promise(resolve => setTimeout(resolve, 1000)),
        timeoutPromise
      ]);
      
      if (!isMountedRef.current) {
        console.log('[RealTimeMetrics] Component unmounted during data load');
        return;
      }
      
      // Simular datos en tiempo real
      await generateRealTimeData();
      
      if (!isMountedRef.current) return;
      
      // Cargar métricas instantáneas
      const metricas = await advancedAnalyticsService.getDashboardMetricas();
      
      setMetricasInstantaneas([
        {
          nombre: 'Consumo Actual',
          valor: metricas.consumoHoy,
          unidad: '$',
          cambio: Math.random() * 10 - 5,
          tendencia: Math.random() > 0.5 ? 'up' : 'down',
          color: 'text-green-500'
        },
        {
          nombre: 'Rotación Promedio',
          valor: metricas.rotacionPromedio,
          unidad: 'días',
          cambio: Math.random() * 2 - 1,
          tendencia: Math.random() > 0.5 ? 'up' : 'down',
          color: 'text-blue-500'
        },
        {
          nombre: 'Eficiencia',
          valor: metricas.eficienciaAlmacen,
          unidad: '%',
          cambio: Math.random() * 3 - 1.5,
          tendencia: Math.random() > 0.5 ? 'up' : 'down',
          color: 'text-purple-500'
        },
        {
          nombre: 'Tiempo Atención',
          valor: metricas.tiempoPromedioAtencion,
          unidad: 'h',
          cambio: Math.random() * 1 - 0.5,
          tendencia: Math.random() > 0.5 ? 'up' : 'down',
          color: 'text-orange-500'
        }
      ]);
      
      // Cargar alertas activas
      const alertas = await advancedAnalyticsService.getAlertasStockBajo();
      setAlertasActivas(alertas.slice(0, 3));
      
      if (isMountedRef.current) {
        setLastUpdate(new Date());
        setLoading(false);
      }
      
      console.log('[RealTimeMetrics] Data load completed successfully');
      
    } catch (error) {
      console.error('[RealTimeMetrics] Error loading real-time data:', error);
      if (isMountedRef.current && error.message !== 'Data load timeout') {
        // Solo mostrar error si no es timeout y el componente está montado
        toast.error('Error al actualizar métricas en tiempo real');
        setLoading(false);
      } else if (isMountedRef.current) {
        setLoading(false);
      }
      console.log('[RealTimeMetrics] Data load finished with error, loading set to false');
    }
  }, [filtros, rangoFecha]);

  // Función para iniciar actualizaciones en tiempo real
  const startRealTimeUpdates = useCallback(() => {
    console.log('[RealTimeMetrics] Starting real-time updates');
    
    // Limpiar cualquier intervalo existente
    if (intervalRef.current) {
      console.log('[RealTimeMetrics] Clearing existing interval before starting new one');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Solo crear nuevo intervalo si el componente está montado
    if (isMountedRef.current) {
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current && document.visibilityState === 'visible') {
          console.log('[RealTimeMetrics] Real-time update tick');
          loadRealTimeData();
        } else {
          console.log('[RealTimeMetrics] Skipping update - component unmounted or document hidden');
        }
      }, 10000); // 10 segundos
    }
  }, [loadRealTimeData]);

  // Función para detener actualizaciones
  const stopRealTimeUpdates = useCallback(() => {
    console.log('[RealTimeMetrics] Stopping real-time updates');
    if (intervalRef.current) {
      console.log('[RealTimeMetrics] Clearing interval');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else {
      console.log('[RealTimeMetrics] No interval to clear');
    }
  }, []);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadRealTimeData();
  }, [loadRealTimeData]);

  // Efecto para manejar el estado de tiempo real
  useEffect(() => {
    if (isRealTimeActive) {
      startRealTimeUpdates();
    } else {
      stopRealTimeUpdates();
    }
    
    return () => stopRealTimeUpdates();
  }, [isRealTimeActive, startRealTimeUpdates, stopRealTimeUpdates]);

  const generateRealTimeData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    // Generar datos simulados de consumo en tiempo real
    const now = new Date();
    const newData: ConsumoRealTime[] = [];
    
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(now.getTime() - (19 - i) * 60000); // Cada minuto
      newData.push({
        timestamp: timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        cantidad: Math.floor(Math.random() * 50) + 10,
        costo: Math.floor(Math.random() * 5000) + 1000,
        material: ['Cemento', 'Acero', 'Madera', 'Pintura'][Math.floor(Math.random() * 4)]
      });
    }
    
    if (isMountedRef.current) {
      setConsumoRealTime(newData);
    }
  }, []);

  const getTrendIcon = useCallback((tendencia: string) => {
    switch (tendencia) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  }, []);

  const formatCambio = useCallback((cambio: number) => {
    const signo = cambio >= 0 ? '+' : '';
    return `${signo}${cambio.toFixed(1)}%`;
  }, []);

  const toggleRealTime = useCallback(() => {
    setIsRealTimeActive(prev => !prev);
  }, []);

  const handleManualRefresh = useCallback(() => {
    if (!loading) {
      loadRealTimeData();
    }
  }, [loading, loadRealTimeData]);

  // Memoizar datos computados para evitar re-renders innecesarios
  const memoizedConsumoData = useMemo(() => consumoRealTime, [consumoRealTime]);
  const memoizedMetricas = useMemo(() => metricasInstantaneas, [metricasInstantaneas]);
  const memoizedAlertas = useMemo(() => alertasActivas, [alertasActivas]);
  
  const recentConsumoData = useMemo(() => {
    return memoizedConsumoData.slice(-10);
  }, [memoizedConsumoData]);

  return (
    <div className="space-y-6">
      {/* Header con estado de tiempo real */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Métricas en Tiempo Real</h2>
          <p className="text-sm text-muted-foreground">
            Última actualización: {lastUpdate.toLocaleTimeString('es-ES')}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
            isRealTimeActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isRealTimeActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`} />
            <span className="text-sm font-medium">
              {isRealTimeActive ? 'En vivo' : 'Pausado'}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleRealTime}
          >
            {isRealTimeActive ? 'Pausar' : 'Reanudar'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Métricas instantáneas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {memoizedMetricas.map((metrica, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metrica.nombre}</p>
                  <p className="text-2xl font-bold">
                    {metrica.unidad === '$' ? '$' : ''}
                    {metrica.valor.toLocaleString()}
                    {metrica.unidad !== '$' ? metrica.unidad : ''}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    {getTrendIcon(metrica.tendencia)}
                    <span className={`text-sm ${
                      metrica.cambio >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCambio(metrica.cambio)}
                    </span>
                  </div>
                </div>
                <div className={`p-2 rounded-full bg-gray-100`}>
                  {metrica.nombre.includes('Consumo') && <DollarSign className={`h-6 w-6 ${metrica.color}`} />}
                  {metrica.nombre.includes('Rotación') && <Package className={`h-6 w-6 ${metrica.color}`} />}
                  {metrica.nombre.includes('Eficiencia') && <Activity className={`h-6 w-6 ${metrica.color}`} />}
                  {metrica.nombre.includes('Tiempo') && <RefreshCw className={`h-6 w-6 ${metrica.color}`} />}
                </div>
              </div>
            </CardContent>
            
            {/* Indicador de actualización */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${
              isRealTimeActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            }`} />
          </Card>
        ))}
      </div>

      {/* Gráficos en tiempo real */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumo en tiempo real */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Consumo en Tiempo Real</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={memoizedConsumoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'costo' ? `$${value.toLocaleString()}` : value,
                    name === 'costo' ? 'Costo' : 'Cantidad'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="costo" 
                  stackId="1" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Actividad por material */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Actividad por Material</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={recentConsumoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alertas en tiempo real */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Alertas Activas</span>
            <Badge variant="destructive">{memoizedAlertas.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memoizedAlertas.length > 0 ? (
            <div className="space-y-3">
              {memoizedAlertas.map((alerta, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-900">{alerta.materialNombre}</p>
                      <p className="text-sm text-red-700">
                        Stock crítico: {alerta.stockActual} unidades
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="destructive">
                      {alerta.nivelCriticidad.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-red-700">
                      {alerta.diasRestantes} días restantes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No hay alertas activas</p>
              <p className="text-sm">Todos los niveles de stock están dentro de los parámetros normales</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeMetrics;