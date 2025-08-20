import React, { useState, useEffect } from 'react';
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

const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ refreshInterval = 10000 }) => {
  const [consumoRealTime, setConsumoRealTime] = useState<ConsumoRealTime[]>([]);
  const [metricasInstantaneas, setMetricasInstantaneas] = useState<MetricaInstantanea[]>([]);
  const [alertasActivas, setAlertasActivas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);

  useEffect(() => {
    loadRealTimeData();
    
    if (isRealTimeActive) {
      const interval = setInterval(() => {
        // Solo actualizar si el componente está montado y visible
        if (document.visibilityState === 'visible') {
          loadRealTimeData();
        }
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [refreshInterval, isRealTimeActive]);

  // Pausar actualizaciones cuando la página no está visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsRealTimeActive(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadRealTimeData = async () => {
    try {
      // Simular datos en tiempo real
      await generateRealTimeData();
      
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
      
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error cargando datos en tiempo real:', error);
      toast.error('Error al actualizar métricas en tiempo real');
    }
  };

  const generateRealTimeData = async () => {
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
    
    setConsumoRealTime(newData);
  };

  const getTrendIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatCambio = (cambio: number) => {
    const signo = cambio >= 0 ? '+' : '';
    return `${signo}${cambio.toFixed(1)}%`;
  };

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
            onClick={() => setIsRealTimeActive(!isRealTimeActive)}
          >
            {isRealTimeActive ? 'Pausar' : 'Reanudar'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadRealTimeData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Métricas instantáneas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricasInstantaneas.map((metrica, index) => (
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
              <AreaChart data={consumoRealTime}>
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
              <BarChart data={consumoRealTime.slice(-10)}>
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
            <Badge variant="destructive">{alertasActivas.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertasActivas.length > 0 ? (
            <div className="space-y-3">
              {alertasActivas.map((alerta, index) => (
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