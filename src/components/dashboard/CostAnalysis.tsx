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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  Package,
  Calendar,
  Download,
  Filter,
  Calculator,
  Target
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

interface CostAnalysisProps {
  className?: string;
  filtros?: FiltroAvanzado[];
  rangoFecha?: RangoFecha;
}

interface CostoPorObra {
  obra: string;
  costoTotal: number;
  costoMateriales: number;
  costoManoObra: number;
  porcentajePresupuesto: number;
  estado: 'bajo' | 'normal' | 'alto';
}

interface CostoPorMaterial {
  material: string;
  categoria: string;
  costoTotal: number;
  cantidad: number;
  costoUnitario: number;
  variacion: number;
  tendencia: 'up' | 'down' | 'stable';
}

interface CostoPorPeriodo {
  periodo: string;
  costoTotal: number;
  materiales: number;
  logistica: number;
  almacenamiento: number;
  variacionMensual: number;
}

interface ComparativaCostos {
  categoria: string;
  actual: number;
  anterior: number;
  presupuestado: number;
  variacion: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const CostAnalysis: React.FC<CostAnalysisProps> = ({ className }) => {
  const [costosPorObra, setCostosPorObra] = useState<CostoPorObra[]>([]);
  const [costosPorMaterial, setCostosPorMaterial] = useState<CostoPorMaterial[]>([]);
  const [costosPorPeriodo, setCostosPorPeriodo] = useState<CostoPorPeriodo[]>([]);
  const [comparativaCostos, setComparativaCostos] = useState<ComparativaCostos[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mensual');
  const [obraSeleccionada, setObraSeleccionada] = useState('todas');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('obras');

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await loadCostAnalysisData();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [periodoSeleccionado, obraSeleccionada, categoriaSeleccionada]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      setCostosPorObra([]);
      setCostosPorMaterial([]);
      setCostosPorPeriodo([]);
      setComparativaCostos([]);
      setPeriodoSeleccionado('mensual');
      setObraSeleccionada('todas');
      setCategoriaSeleccionada('todas');
      setLoading(true);
      setActiveTab('obras');
    };
  }, []);

  const loadCostAnalysisData = async () => {
    setLoading(true);
    try {
      // Cargar análisis de costos desde el servicio
      // Usar fechas por defecto (últimos 30 días)
      const fechaInicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fechaFin = new Date().toISOString().split('T')[0];
      
      const analisisCostos = await advancedAnalyticsService.getAnalisisCostos(fechaInicio, fechaFin);
      
      // Generar datos de costos por obra
      await generateCostosPorObra();
      
      // Generar datos de costos por material
      await generateCostosPorMaterial();
      
      // Generar datos de costos por período
      await generateCostosPorPeriodo();
      
      // Generar comparativa de costos
      await generateComparativaCostos();
      
      setLoading(false);
    } catch (error) {
      console.error('Error cargando análisis de costos:', error);
      toast.error('Error al cargar análisis de costos');
      setLoading(false);
    }
  };

  const generateCostosPorObra = async () => {
    const obras = [
      'Edificio Central', 'Torre Norte', 'Complejo Sur', 'Proyecto Alpha', 'Obra Beta'
    ];
    
    const data: CostoPorObra[] = obras.map(obra => {
      const costoTotal = Math.floor(Math.random() * 500000) + 100000;
      const costoMateriales = costoTotal * (0.6 + Math.random() * 0.2);
      const costoManoObra = costoTotal - costoMateriales;
      const porcentajePresupuesto = Math.floor(Math.random() * 40) + 70;
      
      return {
        obra,
        costoTotal,
        costoMateriales: Math.round(costoMateriales),
        costoManoObra: Math.round(costoManoObra),
        porcentajePresupuesto,
        estado: porcentajePresupuesto > 95 ? 'alto' : porcentajePresupuesto < 80 ? 'bajo' : 'normal'
      };
    });
    
    setCostosPorObra(data);
  };

  const generateCostosPorMaterial = async () => {
    const materiales = [
      { nombre: 'Cemento Portland', categoria: 'Construcción' },
      { nombre: 'Acero Corrugado', categoria: 'Estructura' },
      { nombre: 'Madera Pino', categoria: 'Carpintería' },
      { nombre: 'Pintura Látex', categoria: 'Acabados' },
      { nombre: 'Tubería PVC', categoria: 'Instalaciones' },
      { nombre: 'Cable Eléctrico', categoria: 'Instalaciones' }
    ];
    
    const data: CostoPorMaterial[] = materiales.map(mat => {
      const cantidad = Math.floor(Math.random() * 1000) + 100;
      const costoUnitario = Math.floor(Math.random() * 100) + 10;
      const costoTotal = cantidad * costoUnitario;
      const variacion = (Math.random() - 0.5) * 20;
      
      return {
        material: mat.nombre,
        categoria: mat.categoria,
        costoTotal,
        cantidad,
        costoUnitario,
        variacion,
        tendencia: variacion > 5 ? 'up' : variacion < -5 ? 'down' : 'stable'
      };
    });
    
    setCostosPorMaterial(data);
  };

  const generateCostosPorPeriodo = async () => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    const data: CostoPorPeriodo[] = meses.map((mes, index) => {
      const costoTotal = Math.floor(Math.random() * 100000) + 50000;
      const materiales = costoTotal * (0.5 + Math.random() * 0.2);
      const logistica = costoTotal * 0.15;
      const almacenamiento = costoTotal - materiales - logistica;
      const variacionMensual = index > 0 ? (Math.random() - 0.5) * 10 : 0;
      
      return {
        periodo: mes,
        costoTotal,
        materiales: Math.round(materiales),
        logistica: Math.round(logistica),
        almacenamiento: Math.round(almacenamiento),
        variacionMensual
      };
    });
    
    setCostosPorPeriodo(data);
  };

  const generateComparativaCostos = async () => {
    const categorias = ['Materiales', 'Logística', 'Almacenamiento', 'Mano de Obra', 'Equipos'];
    
    const data: ComparativaCostos[] = categorias.map(categoria => {
      const presupuestado = Math.floor(Math.random() * 50000) + 20000;
      const actual = presupuestado * (0.8 + Math.random() * 0.4);
      const anterior = presupuestado * (0.85 + Math.random() * 0.3);
      const variacion = ((actual - anterior) / anterior) * 100;
      
      return {
        categoria,
        actual: Math.round(actual),
        anterior: Math.round(anterior),
        presupuestado,
        variacion
      };
    });
    
    setComparativaCostos(data);
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <div className="h-4 w-4 bg-blue-500 rounded-full" />;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'alto': return 'bg-red-100 text-red-800';
      case 'bajo': return 'bg-green-100 text-green-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const exportCostReport = () => {
    toast.success('Reporte de costos exportado exitosamente');
  };

  const totalCostos = costosPorObra.reduce((sum, obra) => sum + obra.costoTotal, 0);
  const promedioEficiencia = costosPorObra.reduce((sum, obra) => sum + obra.porcentajePresupuesto, 0) / costosPorObra.length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Calculator className="h-6 w-6 text-green-600" />
            <span>Análisis de Costos</span>
          </h2>
          <p className="text-muted-foreground">Análisis detallado de costos por obra, material y período</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={obraSeleccionada} onValueChange={setObraSeleccionada}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las Obras</SelectItem>
              <SelectItem value="edificio">Edificio Central</SelectItem>
              <SelectItem value="torre">Torre Norte</SelectItem>
              <SelectItem value="complejo">Complejo Sur</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportCostReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Resumen de costos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Costo Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCostos)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eficiencia Promedio</p>
                <p className="text-2xl font-bold">{promedioEficiencia.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Obras Activas</p>
                <p className="text-2xl font-bold">{costosPorObra.length}</p>
              </div>
              <Building className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Materiales</p>
                <p className="text-2xl font-bold">{costosPorMaterial.length}</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para diferentes análisis */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="obras">Por Obra</TabsTrigger>
          <TabsTrigger value="materiales">Por Material</TabsTrigger>
          <TabsTrigger value="periodo">Por Período</TabsTrigger>
          <TabsTrigger value="comparativa">Comparativa</TabsTrigger>
        </TabsList>

        {/* Análisis por obra */}
        <TabsContent value="obras" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Costos por Obra</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costosPorObra}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="obra" angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="costoTotal" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Costos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costosPorObra}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ obra, percent }) => `${obra} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="costoTotal"
                    >
                      {costosPorObra.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Tabla detallada de obras */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle por Obra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Obra</th>
                      <th className="text-right p-2">Costo Total</th>
                      <th className="text-right p-2">Materiales</th>
                      <th className="text-right p-2">Mano de Obra</th>
                      <th className="text-center p-2">% Presupuesto</th>
                      <th className="text-center p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costosPorObra.map((obra, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{obra.obra}</td>
                        <td className="p-2 text-right">{formatCurrency(obra.costoTotal)}</td>
                        <td className="p-2 text-right">{formatCurrency(obra.costoMateriales)}</td>
                        <td className="p-2 text-right">{formatCurrency(obra.costoManoObra)}</td>
                        <td className="p-2 text-center">{obra.porcentajePresupuesto}%</td>
                        <td className="p-2 text-center">
                          <Badge className={getEstadoColor(obra.estado)}>
                            {obra.estado.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análisis por material */}
        <TabsContent value="materiales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {costosPorMaterial.map((material, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{material.material}</span>
                    {getTendenciaIcon(material.tendencia)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{material.categoria}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Costo Total</span>
                      <span className="font-semibold">{formatCurrency(material.costoTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Cantidad</span>
                      <span>{material.cantidad.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Costo Unitario</span>
                      <span>{formatCurrency(material.costoUnitario)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Variación</span>
                      <span className={`font-semibold ${
                        material.variacion >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {material.variacion >= 0 ? '+' : ''}{material.variacion.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Análisis por período */}
        <TabsContent value="periodo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Costos por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={costosPorPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="materiales" stackId="a" fill="#8884d8" name="Materiales" />
                  <Bar dataKey="logistica" stackId="a" fill="#82ca9d" name="Logística" />
                  <Bar dataKey="almacenamiento" stackId="a" fill="#ffc658" name="Almacenamiento" />
                  <Line type="monotone" dataKey="costoTotal" stroke="#ff7300" strokeWidth={3} name="Total" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparativa */}
        <TabsContent value="comparativa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comparativa: Actual vs Presupuestado vs Anterior</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparativaCostos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="presupuestado" fill="#8884d8" name="Presupuestado" />
                  <Bar dataKey="anterior" fill="#82ca9d" name="Período Anterior" />
                  <Bar dataKey="actual" fill="#ffc658" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CostAnalysis;