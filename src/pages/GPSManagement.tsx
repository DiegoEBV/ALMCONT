import React, { useState, Suspense, lazy } from 'react';
import { 
  Smartphone, 
  Shield, 
  MapPin, 
  Settings,
  BarChart3,
  Route,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/Button';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

// Lazy load GPS management components
const DeviceManagement = lazy(() => import('../components/gps/DeviceManagement'));
const GeofenceManagement = lazy(() => import('../components/gps/GeofenceManagement'));
const GPSReports = lazy(() => import('../components/gps/GPSReports'));
const GPSTracking = lazy(() => import('./GPSTracking'));

type TabType = 'tracking' | 'devices' | 'geofences' | 'reports';

const GPSManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('tracking');

  const tabs = [
    {
      id: 'tracking' as TabType,
      name: 'Rastreo en Tiempo Real',
      icon: MapPin,
      description: 'Monitoreo de vehículos y ubicaciones'
    },
    {
      id: 'devices' as TabType,
      name: 'Dispositivos GPS',
      icon: Smartphone,
      description: 'Gestión de dispositivos y asignaciones'
    },
    {
      id: 'geofences' as TabType,
      name: 'Geocercas y Alertas',
      icon: Shield,
      description: 'Configuración de zonas y notificaciones'
    },
    {
      id: 'reports' as TabType,
      name: 'Reportes y Análisis',
      icon: BarChart3,
      description: 'Estadísticas y reportes de seguimiento'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tracking':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GPSTracking />
          </Suspense>
        );
      case 'devices':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <DeviceManagement />
          </Suspense>
        );
      case 'geofences':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GeofenceManagement />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GPSReports />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema GPS</h1>
          <p className="text-gray-600">Gestión completa del sistema de rastreo GPS</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon
                  className={`mr-2 h-5 w-5 ${
                    activeTab === tab.id
                      ? 'text-blue-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                <div className="text-left">
                  <div>{tab.name}</div>
                  <div className="text-xs text-gray-400 font-normal">
                    {tab.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default GPSManagement;