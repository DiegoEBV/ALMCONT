import React, { useState, useEffect } from 'react';
import { GPSDevice, Vehicle } from '../../types/gps';
import { GPSService } from '../../services/gpsService';
import { X, Save, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

interface DeviceFormProps {
  device?: GPSDevice | null;
  vehicles: Vehicle[];
  onSave: (device: GPSDevice) => void;
  onCancel: () => void;
}

const DeviceForm: React.FC<DeviceFormProps> = ({ device, vehicles, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    imei: '',
    name: '',
    vehicle_id: '',
    report_interval: 30,
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (device) {
      setFormData({
        imei: device.imei,
        name: device.name,
        vehicle_id: device.vehicle_id || '',
        report_interval: device.report_interval,
        is_active: device.is_active
      });
    }
  }, [device]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.imei.trim()) {
      newErrors.imei = 'El IMEI es requerido';
    } else if (!/^\d{15}$/.test(formData.imei)) {
      newErrors.imei = 'El IMEI debe tener exactamente 15 dígitos';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (formData.report_interval < 10 || formData.report_interval > 3600) {
      newErrors.report_interval = 'El intervalo debe estar entre 10 y 3600 segundos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let savedDevice: GPSDevice;
      
      if (device) {
        // Update existing device
        savedDevice = await GPSService.updateGPSDevice(device.id, formData);
        toast.success('Dispositivo GPS actualizado correctamente');
      } else {
        // Create new device
        savedDevice = await GPSService.createGPSDevice(formData);
        toast.success('Dispositivo GPS creado correctamente');
      }
      
      onSave(savedDevice);
    } catch (error) {
      console.error('Error saving device:', error);
      toast.error(device ? 'Error al actualizar dispositivo' : 'Error al crear dispositivo');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">
            {device ? 'Editar Dispositivo GPS' : 'Agregar Dispositivo GPS'}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IMEI */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IMEI *
            </label>
            <input
              type="text"
              value={formData.imei}
              onChange={(e) => handleInputChange('imei', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.imei ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ingrese el IMEI del dispositivo"
              maxLength={15}
            />
            {errors.imei && (
              <p className="text-red-500 text-xs mt-1">{errors.imei}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nombre del dispositivo"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Vehicle Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehículo Asignado
            </label>
            <select
              value={formData.vehicle_id}
              onChange={(e) => handleInputChange('vehicle_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sin asignar</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate_number} - {vehicle.model}
                </option>
              ))}
            </select>
          </div>

          {/* Report Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intervalo de Reporte (segundos) *
            </label>
            <input
              type="number"
              value={formData.report_interval}
              onChange={(e) => handleInputChange('report_interval', parseInt(e.target.value) || 30)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.report_interval ? 'border-red-500' : 'border-gray-300'
              }`}
              min="10"
              max="3600"
            />
            {errors.report_interval && (
              <p className="text-red-500 text-xs mt-1">{errors.report_interval}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Frecuencia con la que el dispositivo enviará datos (10-3600 segundos)
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Dispositivo activo
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {device ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default DeviceForm;