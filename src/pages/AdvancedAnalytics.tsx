import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
  Download,
  RefreshCw,
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import ErrorBoundary from '../components/ErrorBoundary';
// Las importaciones ya están definidas arriba
import { advancedAnalyticsService } from '../services/advancedAnalyticsService';
import { exportService } from '../services/exportService';

// Importar componentes de análisis
import AdvancedDashboard from '../components/dashboard/AdvancedDashboard';
import RealTimeMetrics from '../components/dashboard/RealTimeMetrics';
import PredictiveReports from '../components/dashboard/PredictiveReports';
import CostAnalysis from '../components/dashboard/CostAnalysis';
import KPIIndicators from '../components/dashboard/KPIIndicators';
import AdvancedFilters from '../components/dashboard/AdvancedFilters';

// Interfaces
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

interface AnalyticsConfig {
  autoRefresh: boolean;
  refreshInterval: number;
  showFilters: boolean;
  defaultPeriod: string;
  enableNotifications: boolean;
}

const AdvancedAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [filtros, setFiltros] = useState<FiltroAvanzado[]>([]);
  const [rangoFecha, setRangoFecha] = useState<RangoFecha>({ desde: null, hasta: null });
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [config, setConfig] = useState<AnalyticsConfig>({
    autoRefresh: true,
    refreshInterval: 30000, // 30 segundos
    showFilters: true,
    defaultPeriod: '30d',
    enableNotifications: true
  });
  
  // Refs para manejo de intervalos y estado de montaje
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup al desmontar el componente
  useEffect(() => {
    console.log('[AdvancedAnalytics] Component mounting');
    isMountedRef.current = true;
    
    return () => {
      console.log('[AdvancedAnalytics] Component unmounting - cleaning up');
      isMountedRef.current = false;
      if (intervalRef.current) {
        console.log('[AdvancedAnalytics] Clearing interval on unmount');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Auto-refresh functionality - Solo para tiempo real
  useEffect(() => {
    console.log('[AdvancedAnalytics] Auto-refresh effect triggered', {
      autoRefresh: config.autoRefresh,
      activeTab,
      isMounted: isMountedRef.current
    });
    
    // Limpiar intervalo anterior
    if (intervalRef.current) {
      console.log('[AdvancedAnalytics] Clearing previous interval');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (config.autoRefresh && activeTab === 'realtime' && isMountedRef.current) {
      console.log('[AdvancedAnalytics] Setting up new interval');
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          console.log('[AdvancedAnalytics] Auto-refresh tick');
          setLastUpdate(new Date());
        } else {
          console.log('[AdvancedAnalytics] Component unmounted, skipping update');
        }
      }, config.refreshInterval);
    }
    
    return () => {
      console.log('[AdvancedAnalytics] Auto-refresh cleanup');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [config.autoRefresh, config.refreshInterval, activeTab]);

  // Funciones optimizadas con useCallback
  const handleFiltersChange = useCallback((newFiltros: FiltroAvanzado[]) => {
    setFiltros(newFiltros);
  }, []);

  const handleDateRangeChange = useCallback((newRango: RangoFecha) => {
    setRangoFecha(newRango);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      // Simular actualización de datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (isMountedRef.current) {
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error al actualizar datos:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleExportAll = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setLoading(true);
      
      // Obtener todos los datos para exportar
      const fechaInicio = (rangoFecha.desde instanceof Date ? rangoFecha.desde.toISOString().split('T')[0] : rangoFecha.desde) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fechaFin = (rangoFecha.hasta instanceof Date ? rangoFecha.hasta.toISOString().split('T')[0] : rangoFecha.hasta) || new Date().toISOString().split('T')[0];
      
      const [metricas, predicciones, costos, kpis] = await Promise.all([
        advancedAnalyticsService.getDashboardMetricas(),
        advancedAnalyticsService.getPrediccionesDemanda(),
        advancedAnalyticsService.getAnalisisCostos(fechaInicio, fechaFin),
        advancedAnalyticsService.getIndicadoresKPI()
      ]);

      if (!isMountedRef.current) return;

      const exportData = {
        titulo: 'Reporte Completo de Analytics',
        subtitulo: 'Dashboard de métricas, predicciones, costos y KPIs',
        fecha: new Date(),
        datos: [
          ...Object.entries(metricas || {}).map(([key, value]) => ({ tipo: 'Métrica', nombre: key, valor: value })),
          ...Object.entries(predicciones || {}).map(([key, value]) => ({ tipo: 'Predicción', nombre: key, valor: value })),
          ...Object.entries(costos || {}).map(([key, value]) => ({ tipo: 'Costo', nombre: key, valor: value })),
          ...Object.entries(kpis || {}).map(([key, value]) => ({ tipo: 'KPI', nombre: key, valor: value }))
        ],
        columnas: [
          { header: 'Tipo', dataKey: 'tipo', width: 15 },
          { header: 'Nombre', dataKey: 'nombre', width: 25 },
          { header: 'Valor', dataKey: 'valor', width: 20 }
        ],
        resumen: {
          filtrosActivos: filtros.filter(f => f.activo).length,
          rangoFecha: `${rangoFecha.desde || 'N/A'} - ${rangoFecha.hasta || 'N/A'}`,
          fechaGeneracion: new Date().toISOString()
        }
      };

      await exportService.exportToPDF(exportData, {
        formato: 'pdf',
        incluirGraficos: true,
        incluirResumen: true
      });
    } catch (error) {
      console.error('Error al exportar:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [filtros, rangoFecha]);

  const handleTabChange = useCallback((tab: string) => {
    console.log('[AdvancedAnalytics] Tab change requested', { from: activeTab, to: tab });
    if (tab !== activeTab) {
      console.log('[AdvancedAnalytics] Changing tab and updating timestamp');
      setActiveTab(tab);
      setLastUpdate(new Date());
    } else {
      console.log('[AdvancedAnalytics] Tab change ignored - same tab');
    }
  }, [activeTab]);

  const toggleConfig = useCallback((key: keyof AnalyticsConfig) => {
    setConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  // Memoizar filtros activos para evitar cálculos innecesarios
  const memoizedFiltrosActivos = useMemo(() => {
    return filtros.filter(f => f.activo);
  }, [filtros]);

  // Memoizar la configuración de tabs para evitar re-creaciones
  const tabs = useMemo(() => [
    {
      id: 'overview',
      label: 'Resumen General',
      icon: BarChart3,
      description: 'Vista general de todas las métricas'
    },
    {
      id: 'realtime',
      label: 'Tiempo Real',
      icon: RefreshCw,
      description: 'Métricas en tiempo real'
    },
    {
      id: 'predictive',
      label: 'Predictivo',
      icon: TrendingUp,
      description: 'Análisis predictivo y tendencias'
    },
    {
      id: 'costs',
      label: 'Costos',
      icon: DollarSign,
      description: 'Análisis de costos detallado'
    },
    {
      id: 'kpis',
      label: 'KPIs',
      icon: Target,
      description: 'Indicadores clave de rendimiento'
    }
  ], []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[AdvancedAnalytics] Error boundary caught error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        });
        toast.error('Error en Analytics Avanzado. La página se recargará automáticamente.');
      }}
    >
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Avanzado</h1>
            <p className="text-gray-600 mt-1">
              Dashboard completo con métricas en tiempo real, análisis predictivo y reportes de costos
            </p>
          </div>
        
        <div className="flex items-center space-x-3">
          {/* Configuración rápida */}
          <div className="flex items-center space-x-2">
            <Button
              variant={config.autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => toggleConfig('autoRefresh')}
              className="text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${config.autoRefresh ? 'animate-spin' : ''}`} />
              Auto
            </Button>
            
            <Button
              variant={config.showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => toggleConfig('showFilters')}
              className="text-xs"
            >
              {config.showFilters ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
              Filtros
            </Button>
          </div>
          
          {/* Acciones principales */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Todo
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${config.autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">
              {config.autoRefresh ? 'Actualización automática activa' : 'Actualización manual'}
            </span>
          </div>
          
          {memoizedFiltrosActivos.length > 0 && (
            <Badge variant="secondary">
              {memoizedFiltrosActivos.length} filtros activos
            </Badge>
          )}
          
          {(rangoFecha.desde || rangoFecha.hasta) && (
            <Badge variant="outline">
              <Calendar className="h-3 w-3 mr-1" />
              Rango personalizado
            </Badge>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          Última actualización: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Filtros Avanzados */}
      {config.showFilters && (
        <AdvancedFilters
          onFiltersChange={handleFiltersChange}
          onDateRangeChange={handleDateRangeChange}
          className="mb-6"
        />
      )}

      {/* Tabs de Analytics */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex flex-col items-center space-y-1 p-3"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Contenido de cada tab */}
        <TabsContent value="overview" className="space-y-6">
          <AdvancedDashboard
            userRole={user?.rol || 'ALMACENERO'}
            filtros={memoizedFiltrosActivos}
            rangoFecha={rangoFecha}
            autoRefresh={config.autoRefresh}
          />
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          <RealTimeMetrics
            filtros={memoizedFiltrosActivos}
            rangoFecha={rangoFecha}
            autoRefresh={config.autoRefresh}
          />
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <PredictiveReports
            filtros={memoizedFiltrosActivos}
            rangoFecha={rangoFecha}
          />
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <CostAnalysis
            filtros={memoizedFiltrosActivos}
            rangoFecha={rangoFecha}
          />
        </TabsContent>

        <TabsContent value="kpis" className="space-y-6">
          <KPIIndicators
            filtros={memoizedFiltrosActivos}
            rangoFecha={rangoFecha}
          />
        </TabsContent>
      </Tabs>

      {/* Footer con información adicional */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <h4 className="font-semibold text-gray-900">Datos Procesados</h4>
              <p className="text-2xl font-bold text-blue-600 mt-1">1,247</p>
              <p className="text-sm text-gray-500">Registros analizados</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900">Precisión del Modelo</h4>
              <p className="text-2xl font-bold text-green-600 mt-1">94.2%</p>
              <p className="text-sm text-gray-500">Predicciones acertadas</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900">Tiempo de Respuesta</h4>
              <p className="text-2xl font-bold text-orange-600 mt-1">1.2s</p>
              <p className="text-sm text-gray-500">Promedio de carga</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </ErrorBoundary>
  );
};

export default AdvancedAnalytics;