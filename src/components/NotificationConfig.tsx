import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';

interface NotificationConfigProps {
  className?: string;
}

const NotificationConfig: React.FC<NotificationConfigProps> = ({ className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    stockBajo: false,
    nuevosRequerimientos: false,
    aprobacionesPendientes: false,
    stockMinimo: 10,
  });

  const handleSave = () => {
    console.log('Guardando configuración:', formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };



  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Configuración de Notificaciones
            </h3>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
            >
              Configurar
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-6">
            {/* Tipos de Notificaciones */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Tipos de Alertas
              </h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.stockBajo}
                    onChange={(e) => setFormData({ ...formData, stockBajo: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Stock bajo</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.nuevosRequerimientos}
                    onChange={(e) => setFormData({ ...formData, nuevosRequerimientos: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Nuevos requerimientos</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.aprobacionesPendientes}
                    onChange={(e) => setFormData({ ...formData, aprobacionesPendientes: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Aprobaciones pendientes</span>
                </label>
              </div>
            </div>

            {/* Stock Mínimo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock mínimo para alertas
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.stockMinimo}
                onChange={(e) => setFormData({ ...formData, stockMinimo: parseInt(e.target.value) || 10 })}
                className="block w-24 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                onClick={handleCancel}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
              >
                Guardar Configuración
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>Stock bajo: {formData.stockBajo ? 'Activado' : 'Desactivado'}</p>
              <p>Nuevos requerimientos: {formData.nuevosRequerimientos ? 'Activado' : 'Desactivado'}</p>
              <p>Aprobaciones pendientes: {formData.aprobacionesPendientes ? 'Activado' : 'Desactivado'}</p>
              <p>Stock mínimo: {formData.stockMinimo}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationConfig;