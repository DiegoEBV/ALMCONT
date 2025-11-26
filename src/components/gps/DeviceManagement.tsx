import React, { useState, useEffect } from 'react';
import { GPSDevice, Vehicle } from '../../types/gps';
import { GPSService } from '../../services/gpsService';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import DeviceForm from './DeviceForm';
import { Navigation } from 'lucide-react';

interface DeviceManagementProps {
  className?: string;
}

const DeviceManagement: React.FC<DeviceManagementProps> = ({ className = '' }) => {
  const [devices, setDevices] = useState<GPSDevice[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<GPSDevice | null>(null);

  // Load devices and vehicles
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [devicesData, vehiclesData] = await Promise.all([
        GPSService.getGPSDevices(),
        GPSService.getVehicles()
      ]);
      setDevices(devicesData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar dispositivos GPS');
    } finally {
      setLoading(false);
    }
  };

  // Filter devices
  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      (device.imei?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (device.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || (device.is_active ? 'active' : 'inactive') === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (isActive: boolean) => {
    return isActive 
      ? <CheckCircle className="w-4 h-4 text-green-600" />
      : <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Activo' : 'Inactivo';
  };

  

  const getVehicleName = (vehicleId?: string) => {
    if (!vehicleId) return 'Sin asignar';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.plate_number} - ${vehicle.model}` : 'Vehículo no encontrado';
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este dispositivo GPS?')) {
      return;
    }

    try {
      await GPSService.deleteGPSDevice(deviceId);
      toast.success('Dispositivo GPS eliminado correctamente');
      loadData();
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Error al eliminar dispositivo GPS');
    }
  };

  const sendTestLocation = async (device: GPSDevice) => {
    try {
      // Ensure device is linked to a vehicle; create one if missing
      let vehicleId = device.vehicle_id;
      if (!vehicleId) {
        const plate = `TEST-${device.imei.slice(-4)}`;
        const newVehicle = await GPSService.createVehicle({
          plate_number: plate,
          model: 'Vehículo de Prueba',
          vehicle_type: 'truck',
          fuel_capacity: 80,
          is_active: true
        } as Omit<Parameters<typeof GPSService.createVehicle>[0], 'id' | 'created_at' | 'updated_at'>);
        await GPSService.updateGPSDevice(device.id, { vehicle_id: newVehicle.id });
        vehicleId = newVehicle.id;
      }

      const lat = -12.0464 + (Math.random() - 0.5) * 0.02;
      const lng = -77.0428 + (Math.random() - 0.5) * 0.02;
      await GPSService.addGPSLocation({
        device_id: device.id,
        vehicle_id: vehicleId,
        latitude: lat,
        longitude: lng,
        speed: 20,
        heading: 180,
        satellites: 9,
        battery_level: 80,
        recorded_at: new Date().toISOString()
      } as {
        device_id: string;
        vehicle_id: string;
        latitude: number;
        longitude: number;
        speed: number;
        heading: number;
        satellites: number;
        battery_level: number;
        recorded_at: string;
      });
      toast.success('Ubicación de prueba registrada');
      await loadData();
    } catch (error) {
      console.error('Error sending test location:', error);
      toast.error('Error al registrar ubicación de prueba');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dispositivos GPS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Dispositivos GPS</h2>
          <p className="text-gray-600">Administra los dispositivos GPS y sus asignaciones</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar Dispositivo
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por ID, fabricante o modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'maintenance')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="maintenance">Mantenimiento</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Dispositivos</p>
              <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {devices.filter(d => d.is_active).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Inactivos</p>
              <p className="text-2xl font-bold text-gray-900">
                {devices.filter(d => !d.is_active).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Con Vehículo</p>
              <p className="text-2xl font-bold text-gray-900">
                {devices.filter(d => d.vehicle_id).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Devices List */}
      <div className="space-y-4">
        {filteredDevices.length === 0 ? (
          <Card className="p-8 text-center">
            <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se encontraron dispositivos
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza agregando tu primer dispositivo GPS'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setShowAddModal(true)}>
                Agregar Primer Dispositivo
              </Button>
            )}
          </Card>
        ) : (
          filteredDevices.map((device) => (
            <Card key={device.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Smartphone className="w-6 h-6 text-blue-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {device.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(device.is_active)}`}>
                        {getStatusIcon(device.is_active)}
                        <span className="ml-1">{getStatusText(device.is_active)}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">IMEI</p>
                        <p className="font-medium">{device.imei}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Intervalo</p>
                        <p className="font-medium">{device.report_interval}s</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Vehículo</p>
                        <p className="font-medium">{getVehicleName(device.vehicle_id)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Estado</p>
                        <p className="font-medium">{device.is_active ? 'Activo' : 'Inactivo'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Creado</p>
                        <p className="font-medium">{new Date(device.created_at).toLocaleDateString('es-PE')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Actualizado</p>
                        <p className="font-medium">{new Date(device.updated_at).toLocaleDateString('es-PE')}</p>
                      </div>
                    </div>


                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingDevice(device)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestLocation(device)}
                    className="flex items-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    Ubicación de prueba
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteDevice(device.id)}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Device Modal */}
      {(showAddModal || editingDevice) && (
        <DeviceForm
          device={editingDevice}
          vehicles={vehicles}
          onSave={(savedDevice) => {
            if (editingDevice) {
              // Update existing device in the list
              setDevices(prev => prev.map(d => d.id === savedDevice.id ? savedDevice : d));
            } else {
              // Add new device to the list
              setDevices(prev => [...prev, savedDevice]);
            }
            setShowAddModal(false);
            setEditingDevice(null);
          }}
          onCancel={() => {
            setShowAddModal(false);
            setEditingDevice(null);
          }}
        />
      )}
    </div>
  );
};

export default DeviceManagement;