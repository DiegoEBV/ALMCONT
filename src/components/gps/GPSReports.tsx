import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Route, 
  AlertTriangle, 
  TrendingUp, 
  Download,
  Calendar,
  Filter,
  MapPin,
  Clock,
  Fuel,
  Users,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useGPSData } from '../../hooks/useGPSData';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ReportFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  vehicleIds: string[];
  reportType: 'routes' | 'alerts' | 'performance';
}

const GPSReports: React.FC = () => {
  const { vehicles, geofences, alerts } = useGPSData();
  const [activeSection, setActiveSection] = useState<'routes' | 'alerts' | 'performance'>('routes');
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      start: subDays(new Date(), 7),
      end: new Date()
    },
    vehicleIds: [],
    reportType: 'routes'
  });

  // Sample data for demonstration - in real app, this would come from API
  const [reportData, setReportData] = useState({
    routes: {
      efficiency: [85, 92, 78, 88, 95, 82, 90],
      distance: [245, 312, 189, 267, 298, 223, 276],
      fuelConsumption: [28.5, 35.2, 22.1, 31.8, 33.9, 26.7, 32.1]
    },
    alerts: {
      geofenceEvents: 23,
      speedAlerts: 15,
      maintenanceAlerts: 8,
      batteryAlerts: 4
    },
    performance: {
      fleetUtilization: 87,
      averageSpeed: 45.2,
      totalDistance: 1890,
      fuelEfficiency: 12.8
    }
  });

  const sections = [
    {
      id: 'routes' as const,
      name: 'Rutas Optimizadas',
      icon: Route,
      description: 'Análisis de eficiencia de rutas'
    },
    {
      id: 'alerts' as const,
      name: 'Alertas y Eventos',
      icon: AlertTriangle,
      description: 'Historial de alertas del sistema'
    },
    {
      id: 'performance' as const,
      name: 'Métricas de Rendimiento',
      icon: TrendingUp,
      description: 'KPIs de flota y estadísticas'
    }
  ];

  // Chart configurations
  const routeEfficiencyChart = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        label: 'Eficiencia de Ruta (%)',
        data: reportData.routes.efficiency,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      },
    ],
  };

  const distanceChart = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        label: 'Distancia Recorrida (km)',
        data: reportData.routes.distance,
        fill: false,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Consumo de Combustible (L)',
        data: reportData.routes.fuelConsumption,
        fill: false,
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const alertsChart = {
    labels: ['Geocercas', 'Velocidad', 'Mantenimiento', 'Batería'],
    datasets: [
      {
        data: [
          reportData.alerts.geofenceEvents,
          reportData.alerts.speedAlerts,
          reportData.alerts.maintenanceAlerts,
          reportData.alerts.batteryAlerts
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Reporte GPS - Sistema de Rastreo', 20, 20);
    
    // Date range
    doc.setFontSize(12);
    doc.text(`Período: ${format(filters.dateRange.start, 'dd/MM/yyyy', { locale: es })} - ${format(filters.dateRange.end, 'dd/MM/yyyy', { locale: es })}`, 20, 35);
    
    // Performance metrics
    doc.setFontSize(16);
    doc.text('Métricas de Rendimiento', 20, 55);
    
    const performanceData = [
      ['Utilización de Flota', `${reportData.performance.fleetUtilization}%`],
      ['Velocidad Promedio', `${reportData.performance.averageSpeed} km/h`],
      ['Distancia Total', `${reportData.performance.totalDistance} km`],
      ['Eficiencia de Combustible', `${reportData.performance.fuelEfficiency} km/L`],
    ];
    
    (doc as any).autoTable({
      startY: 65,
      head: [['Métrica', 'Valor']],
      body: performanceData,
    });
    
    // Alerts summary
    doc.setFontSize(16);
    doc.text('Resumen de Alertas', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const alertsData = [
      ['Eventos de Geocercas', reportData.alerts.geofenceEvents.toString()],
      ['Alertas de Velocidad', reportData.alerts.speedAlerts.toString()],
      ['Alertas de Mantenimiento', reportData.alerts.maintenanceAlerts.toString()],
      ['Alertas de Batería', reportData.alerts.batteryAlerts.toString()],
    ];
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Tipo de Alerta', 'Cantidad']],
      body: alertsData,
    });
    
    doc.save(`reporte-gps-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Performance sheet
    const performanceWS = XLSX.utils.json_to_sheet([
      {
        'Métrica': 'Utilización de Flota',
        'Valor': `${reportData.performance.fleetUtilization}%`
      },
      {
        'Métrica': 'Velocidad Promedio',
        'Valor': `${reportData.performance.averageSpeed} km/h`
      },
      {
        'Métrica': 'Distancia Total',
        'Valor': `${reportData.performance.totalDistance} km`
      },
      {
        'Métrica': 'Eficiencia de Combustible',
        'Valor': `${reportData.performance.fuelEfficiency} km/L`
      }
    ]);
    
    // Alerts sheet
    const alertsWS = XLSX.utils.json_to_sheet([
      { 'Tipo': 'Geocercas', 'Cantidad': reportData.alerts.geofenceEvents },
      { 'Tipo': 'Velocidad', 'Cantidad': reportData.alerts.speedAlerts },
      { 'Tipo': 'Mantenimiento', 'Cantidad': reportData.alerts.maintenanceAlerts },
      { 'Tipo': 'Batería', 'Cantidad': reportData.alerts.batteryAlerts }
    ]);
    
    XLSX.utils.book_append_sheet(wb, performanceWS, 'Rendimiento');
    XLSX.utils.book_append_sheet(wb, alertsWS, 'Alertas');
    
    XLSX.writeFile(wb, `reporte-gps-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const renderRoutesSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Eficiencia de Rutas Semanal
          </h3>
          <Bar data={routeEfficiencyChart} options={chartOptions} />
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Route className="w-5 h-5 text-green-600" />
            Distancia y Consumo
          </h3>
          <Line data={distanceChart} options={chartOptions} />
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Eficiencia Promedio</p>
              <p className="text-2xl font-bold text-blue-600">87.3%</p>
            </div>
            <Target className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Distancia Total</p>
              <p className="text-2xl font-bold text-green-600">1,890 km</p>
            </div>
            <MapPin className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tiempo Promedio</p>
              <p className="text-2xl font-bold text-orange-600">4.2 hrs</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>
    </div>
  );

  const renderAlertsSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Distribución de Alertas
          </h3>
          <Doughnut data={alertsChart} options={doughnutOptions} />
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Alertas Recientes</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Salida de Geocerca</p>
                  <p className="text-sm text-red-600">Vehículo ABC-123</p>
                </div>
              </div>
              <span className="text-xs text-red-600">Hace 15 min</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">Exceso de Velocidad</p>
                  <p className="text-sm text-yellow-600">Vehículo XYZ-789</p>
                </div>
              </div>
              <span className="text-xs text-yellow-600">Hace 32 min</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Mantenimiento Programado</p>
                  <p className="text-sm text-blue-600">Vehículo DEF-456</p>
                </div>
              </div>
              <span className="text-xs text-blue-600">Hace 1 hora</span>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-600">{reportData.alerts.geofenceEvents}</p>
          <p className="text-sm text-gray-600">Eventos Geocercas</p>
        </Card>
        
        <Card className="p-4 text-center">
          <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-yellow-600">{reportData.alerts.speedAlerts}</p>
          <p className="text-sm text-gray-600">Alertas Velocidad</p>
        </Card>
        
        <Card className="p-4 text-center">
          <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-600">{reportData.alerts.maintenanceAlerts}</p>
          <p className="text-sm text-gray-600">Mantenimiento</p>
        </Card>
        
        <Card className="p-4 text-center">
          <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-600">{reportData.alerts.batteryAlerts}</p>
          <p className="text-sm text-gray-600">Batería Baja</p>
        </Card>
      </div>
    </div>
  );

  const renderPerformanceSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Utilización de Flota</p>
              <p className="text-3xl font-bold text-blue-600">{reportData.performance.fleetUtilization}%</p>
              <p className="text-xs text-green-600 mt-1">↗ +5% vs mes anterior</p>
            </div>
            <Users className="w-10 h-10 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Velocidad Promedio</p>
              <p className="text-3xl font-bold text-green-600">{reportData.performance.averageSpeed}</p>
              <p className="text-xs text-gray-500">km/h</p>
            </div>
            <Activity className="w-10 h-10 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Distancia Total</p>
              <p className="text-3xl font-bold text-purple-600">{reportData.performance.totalDistance}</p>
              <p className="text-xs text-gray-500">km esta semana</p>
            </div>
            <MapPin className="w-10 h-10 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Eficiencia Combustible</p>
              <p className="text-3xl font-bold text-orange-600">{reportData.performance.fuelEfficiency}</p>
              <p className="text-xs text-gray-500">km/L promedio</p>
            </div>
            <Fuel className="w-10 h-10 text-orange-600" />
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Rendimiento por Vehículo</h3>
          <div className="space-y-4">
            {vehicles.slice(0, 5).map((vehicle, index) => (
              <div key={vehicle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{vehicle.plate_number}</p>
                    <p className="text-sm text-gray-600">{vehicle.model}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">{(Math.random() * 20 + 80).toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">eficiencia</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Análisis de Comportamiento</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Conducción Eficiente</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-sm font-medium">85%</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cumplimiento de Rutas</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
                <span className="text-sm font-medium">92%</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Respeto de Límites</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
                <span className="text-sm font-medium">78%</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Mantenimiento Preventivo</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                </div>
                <span className="text-sm font-medium">95%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Reportes y Análisis GPS
          </h1>
          <p className="text-gray-600">
            Análisis completo del rendimiento y actividad de la flota
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={exportToPDF}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            PDF
          </Button>
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">Período:</span>
            <input
              type="date"
              value={format(filters.dateRange.start, 'yyyy-MM-dd')}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
              }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={format(filters.dateRange.end, 'yyyy-MM-dd')}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
              }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={filters.reportType}
              onChange={(e) => setFilters(prev => ({ ...prev, reportType: e.target.value as any }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="routes">Rutas</option>
              <option value="alerts">Alertas</option>
              <option value="performance">Rendimiento</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              variant={activeSection === section.id ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {section.name}
            </Button>
          );
        })}
      </div>

      {/* Content */}
      {activeSection === 'routes' && renderRoutesSection()}
      {activeSection === 'alerts' && renderAlertsSection()}
      {activeSection === 'performance' && renderPerformanceSection()}
    </div>
  );
};

export default GPSReports;