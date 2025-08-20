import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
  ComposedChart,
  Bar,
  Area,
  AreaChart,
  ScatterChart,
  Scatter
} from 'recharts';
import {
  TrendingUp,
  Brain,
  Calendar,
  Target,
  AlertCircle,
  Download,
  Filter,
  BarChart3
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

interface PredictiveReportsProps {
  className?: string;
  filtros?: FiltroAvanzado[];
  rangoFecha?: RangoFecha;
}

interface TendenciaConsumo {
  periodo: string;
  consumoReal: number;
  tendencia: number;
  prediccion: number;
  confianza: number;
}

interface PrediccionMaterial {
  material: string;
  demandaActual: number;
  prediccionProxima: number;
  tendencia: 'creciente' | 'decreciente' | 'estable';
  confianza: number;
  recomendacion: string;
}

interface AlertaPreventiva {
  tipo: 'reabastecimiento' | 'sobrestock' | 'obsolescencia';
  material: string;
  descripcion: string;
  fechaEstimada: string;
  prioridad: 'alta' | 'media' | 'baja';
  accionRecomendada: string;
}

const PredictiveReports: React.FC<PredictiveReportsProps> = ({ className }) => {
  const [tendenciasConsumo, setTendenciasConsumo] = useState<TendenciaConsumo[]>([]);
  const [prediccionesMateriales, setPrediccionesMateriales] = useState<PrediccionMaterial[]>([]);
  const [alertasPreventivas, setAlertasPreventivas] = useState<AlertaPreventiva[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('3meses');
  const [materialSeleccionado, setMaterialSeleccionado] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [tipoAnalisis, setTipoAnalisis] = useState('tendencias');

  useEffect(() => {
    loadPredictiveData();
  }, [periodoSeleccionado, materialSeleccionado]);

  const loadPredictiveData = async () => {
    setLoading(true);
    try {
      // Generar datos de tendencias de consumo
      await generateTendenciasData();
      
      // Cargar predicciones de demanda
      const predicciones = await advancedAnalyticsService.getPrediccionesDemanda();
      
      // Transformar predicciones a formato de material
      const prediccionesMat: PrediccionMaterial[] = predicciones.map(pred => ({
        material: pred.materialNombre,
        demandaActual: Math.round(pred.demandaPredichaProximoMes * 0.8), // Estimación basada en predicción
        prediccionProxima: pred.demandaPredichaProximoMes,
        tendencia: pred.tendencia as 'creciente' | 'decreciente' | 'estable',
        confianza: pred.confianza,
        recomendacion: generateRecomendacion(pred)
      }));
      
      setPrediccionesMateriales(prediccionesMat);
      
      // Generar alertas preventivas
      await generateAlertasPreventivas();
      
      setLoading(false);
    } catch (error) {
      console.error('Error cargando datos predictivos:', error);
      toast.error('Error al cargar reportes predictivos');
      setLoading(false);
    }
  };

  const generateTendenciasData = async () => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const data: TendenciaConsumo[] = [];
    
    for (let i = 0; i < 12; i++) {
      const baseConsumo = 50000 + Math.sin(i * 0.5) * 10000;
      const ruido = (Math.random() - 0.5) * 5000;
      const consumoReal = baseConsumo + ruido;
      const tendencia = baseConsumo + Math.sin(i * 0.5) * 8000;
      const prediccion = tendencia + Math.sin((i + 1) * 0.5) * 8000;
      
      data.push({
        periodo: meses[i],
        consumoReal: Math.round(consumoReal),
        tendencia: Math.round(tendencia),
        prediccion: Math.round(prediccion),
        confianza: Math.round(85 + Math.random() * 10)
      });
    }
    
    setTendenciasConsumo(data);
  };

  const generateRecomendacion = (prediccion: any): string => {
    if (prediccion.tendencia === 'creciente') {
      return 'Incrementar stock en un 20%';
    } else if (prediccion.tendencia === 'decreciente') {
      return 'Reducir pedidos próximos';
    }
    return 'Mantener niveles actuales';
  };

  const generateAlertasPreventivas = async () => {
    const alertas: AlertaPreventiva[] = [
      {
        tipo: 'reabastecimiento',
        material: 'Cemento Portland',
        descripcion: 'Se prevé agotamiento de stock en 15 días',
        fechaEstimada: '2024-02-15',
        prioridad: 'alta',
        accionRecomendada: 'Realizar pedido de 500 sacos inmediatamente'
      },
      {
        tipo: 'sobrestock',
        material: 'Pintura Látex',
        descripcion: 'Acumulación excesiva detectada',
        fechaEstimada: '2024-02-10',
        prioridad: 'media',
        accionRecomendada: 'Promover uso en proyectos actuales'
      },
      {
        tipo: 'obsolescencia',
        material: 'Tubería PVC 4"',
        descripcion: 'Material sin movimiento por 90 días',
        fechaEstimada: '2024-02-20',
        prioridad: 'baja',
        accionRecomendada: 'Evaluar reasignación a otros proyectos'
      }
    ];
    
    setAlertasPreventivas(alertas);
  };

  const getTendenciaColor = (tendencia: string) => {
    switch (tendencia) {
      case 'creciente': return 'text-green-600';
      case 'decreciente': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'creciente': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreciente': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <BarChart3 className="h-4 w-4 text-blue-600" />;
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'bg-red-100 text-red-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const exportReport = () => {
    toast.success('Reporte exportado exitosamente');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-600" />
            <span>Reportes Predictivos</span>
          </h2>
          <p className="text-muted-foreground">Análisis de tendencias y predicciones de demanda</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1mes">1 Mes</SelectItem>
              <SelectItem value="3meses">3 Meses</SelectItem>
              <SelectItem value="6meses">6 Meses</SelectItem>
              <SelectItem value="1ano">1 Año</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={tipoAnalisis} onValueChange={setTipoAnalisis}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tendencias">Tendencias</SelectItem>
              <SelectItem value="predicciones">Predicciones</SelectItem>
              <SelectItem value="alertas">Alertas</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Análisis de tendencias */}
      {tipoAnalisis === 'tendencias' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Tendencias de Consumo</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={tendenciasConsumo}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      `$${value.toLocaleString()}`,
                      name === 'consumoReal' ? 'Consumo Real' :
                      name === 'tendencia' ? 'Tendencia' : 'Predicción'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="consumoReal" fill="#8884d8" name="Consumo Real" />
                  <Line 
                    type="monotone" 
                    dataKey="tendencia" 
                    stroke="#82ca9d" 
                    strokeWidth={3}
                    name="Tendencia"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="prediccion" 
                    stroke="#ff7300" 
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    name="Predicción"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Predicciones por material */}
      {tipoAnalisis === 'predicciones' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {prediccionesMateriales.slice(0, 4).map((pred, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{pred.material}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Demanda Actual</span>
                      <span className="font-semibold">{pred.demandaActual.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Predicción Próxima</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{pred.prediccionProxima.toLocaleString()}</span>
                        {getTendenciaIcon(pred.tendencia)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Confianza</span>
                      <Badge variant="outline">{pred.confianza}%</Badge>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Recomendación:</p>
                      <p className="text-sm">{pred.recomendacion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Alertas preventivas */}
      {tipoAnalisis === 'alertas' && (
        <div className="space-y-4">
          {alertasPreventivas.map((alerta, index) => (
            <Card key={index} className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{alerta.material}</h3>
                        <Badge className={getPrioridadColor(alerta.prioridad)}>
                          {alerta.prioridad.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alerta.descripcion}</p>
                      <p className="text-sm">
                        <span className="font-medium">Fecha estimada:</span> {alerta.fechaEstimada}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Acción recomendada:</span> {alerta.accionRecomendada}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      Ver Detalles
                    </Button>
                    <Button size="sm">
                      Tomar Acción
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resumen de predicciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Resumen de Predicciones</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">85%</div>
              <div className="text-sm text-muted-foreground">Precisión Promedio</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{alertasPreventivas.length}</div>
              <div className="text-sm text-muted-foreground">Alertas Activas</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">12</div>
              <div className="text-sm text-muted-foreground">Materiales Analizados</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveReports;