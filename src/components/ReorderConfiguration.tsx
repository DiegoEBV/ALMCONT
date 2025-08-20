import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, TrendingUp, Package, AlertTriangle, CheckCircle, Edit3 } from 'lucide-react';
import { ReorderService, ReorderAlert, AutoReorderResult } from '../services/reorderService';
import { CustomModal as Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter, ModalDescription } from './ui/modal';
import { Button } from './ui/button';
import LoadingSpinner from './ui/LoadingSpinner';
import { toast } from 'sonner';

// Funciones de utilidad para urgencia
const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'alta': return 'text-red-600 bg-red-50 border-red-200';
    case 'media': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'baja': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getUrgencyIcon = (urgency: string) => {
  switch (urgency) {
    case 'alta': return <AlertTriangle className="w-4 h-4" />;
    case 'media': return <TrendingUp className="w-4 h-4" />;
    case 'baja': return <CheckCircle className="w-4 h-4" />;
    default: return <Package className="w-4 h-4" />;
  }
};

interface ReorderConfigurationProps {
  className?: string;
}

export const ReorderConfiguration: React.FC<ReorderConfigurationProps> = ({ className = '' }) => {
  const [configs, setConfigs] = useState<ReorderAlert[]>([]);
  const [suggestions, setSuggestions] = useState<ReorderAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ReorderAlert | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'suggestions' | 'reports'>('config');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'alta' | 'media' | 'baja'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsData, suggestionsData] = await Promise.all([
        ReorderService.checkReorderPoints(),
        ReorderService.checkReorderPoints()
      ]);
      setConfigs(configsData);
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error('Error loading reorder data:', error);
      toast.error('Error al cargar datos de reorden');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (config: Partial<ReorderAlert>) => {
    try {
      setProcessing(true);
      const result = await ReorderService.configureReorderParameters(
         config.material_id!,
         {
           cantidad_reorden: config.cantidad_sugerida,
           proveedor_preferido: config.proveedor_sugerido,
           activa: true
         },
         'current-user-id' // TODO: obtener del contexto de usuario
       );
      
      if (result.success) {
        toast.success('Configuración guardada exitosamente');
        await loadData();
        setShowConfigModal(false);
        setSelectedConfig(null);
      } else {
        toast.error(result.message || 'Error al configurar reorden');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setProcessing(false);
    }
  };

  const handleExecuteReorder = async (materialId: string) => {
    try {
      setProcessing(true);
      const result = await ReorderService.executeAutoReorder(materialId);
      
      if (result.success) {
        toast.success('Orden de compra generada automáticamente');
        await loadData();
      } else {
        toast.error('Error al ejecutar reorden automático');
      }
    } catch (error) {
      console.error('Error executing reorder:', error);
      toast.error('Error al ejecutar reorden');
    } finally {
      setProcessing(false);
    }
  };



  const filteredConfigs = configs.filter(config =>
    config.material_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuggestions = suggestions.filter(suggestion => {
    const matchesSearch = suggestion.material_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = filterUrgency === 'all' || suggestion.urgencia === filterUrgency;
    return matchesSearch && matchesUrgency;
  });

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sistema de Reorden Automático</h2>
          <p className="text-gray-600 mt-1">
            Gestiona puntos de reorden y automatiza las compras de materiales
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          
          <Button
            onClick={() => {
              setSelectedConfig(null);
              setShowConfigModal(true);
            }}
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Nueva Configuración
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'config', label: 'Configuraciones', count: configs.length },
            { id: 'suggestions', label: 'Sugerencias', count: suggestions.length },
            { id: 'reports', label: 'Reportes', count: 0 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre o código de material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {activeTab === 'suggestions' && (
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las urgencias</option>
            <option value="alta">Urgencia Alta</option>
            <option value="media">Urgencia Media</option>
            <option value="baja">Urgencia Baja</option>
          </select>
        )}
      </div>

      {/* Contenido por Tab */}
      {activeTab === 'config' && (
        <ConfigurationsTab
          configs={filteredConfigs}
          onEdit={(config) => {
            setSelectedConfig(config);
            setShowConfigModal(true);
          }}
          onRefresh={loadData}
        />
      )}

      {activeTab === 'suggestions' && (
        <SuggestionsTab
          suggestions={filteredSuggestions}
          onExecuteReorder={handleExecuteReorder}
          processing={processing}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsTab />
      )}

      {/* Modal de Configuración */}
      {showConfigModal && (
        <ConfigurationModal
          config={selectedConfig}
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedConfig(null);
          }}
          onSave={handleSaveConfig}
          processing={processing}
        />
      )}
    </div>
  );
};

// Tab de Configuraciones
interface ConfigurationsTabProps {
  configs: ReorderAlert[];
  onEdit: (config: ReorderAlert) => void;
  onRefresh: () => void;
}

const ConfigurationsTab: React.FC<ConfigurationsTabProps> = ({ configs, onEdit, onRefresh }) => {
  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay configuraciones</h3>
        <p className="text-gray-600">Crea tu primera configuración de reorden automático.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {configs.map((config) => (
        <div key={config.material_id} className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {config.material_nombre || 'Material sin nombre'}
                </h3>
                <span className="text-sm text-gray-500">
                  ID: {config.material_id || 'N/A'}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(config.urgencia)}`}>
                  {getUrgencyIcon(config.urgencia)}
                  {config.urgencia?.toUpperCase()}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Punto de Reorden:</span>
                  <p className="font-medium">{config.punto_reorden} unidades</p>
                </div>
                <div>
                  <span className="text-gray-600">Cantidad Sugerida:</span>
                  <p className="font-medium">{config.cantidad_sugerida} unidades</p>
                </div>
                <div>
                  <span className="text-gray-600">Stock Actual:</span>
                  <p className="font-medium">{config.stock_actual} unidades</p>
                </div>
                <div>
                  <span className="text-gray-600">Urgencia:</span>
                  <p className="font-medium">{config.urgencia}</p>
                </div>
              </div>
              
              {config.proveedor_sugerido && (
                <div className="mt-3 text-sm">
                  <span className="text-gray-600">Proveedor Sugerido:</span>
                  <span className="ml-2 font-medium">{config.proveedor_sugerido}</span>
                </div>
              )}
            </div>
            
            <Button
              onClick={() => onEdit(config)}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Tab de Sugerencias
interface SuggestionsTabProps {
  suggestions: ReorderAlert[];
  onExecuteReorder: (materialId: string) => void;
  processing: boolean;
}

const SuggestionsTab: React.FC<SuggestionsTabProps> = ({ suggestions, onExecuteReorder, processing }) => {
  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay sugerencias de reorden</h3>
        <p className="text-gray-600">Todos los materiales tienen stock suficiente.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {suggestions.map((suggestion) => (
        <div key={suggestion.material_id} className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${suggestion.urgencia ? getUrgencyColor(suggestion.urgencia) : 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                  {suggestion.urgencia ? getUrgencyIcon(suggestion.urgencia) : <Package className="w-4 h-4" />}
                  {suggestion.urgencia?.toUpperCase() || 'NORMAL'}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {suggestion.material_nombre || 'Material sin nombre'}
                </h3>
                <span className="text-sm text-gray-500">
                  ID: {suggestion.material_id || 'N/A'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-600">Stock Actual:</span>
                  <p className="font-medium text-lg">{suggestion.stock_actual} unidades</p>
                </div>
                <div>
                  <span className="text-gray-600">Punto de Reorden:</span>
                  <p className="font-medium">{suggestion.punto_reorden} unidades</p>
                </div>
                <div>
                  <span className="text-gray-600">Cantidad Sugerida:</span>
                  <p className="font-medium text-blue-600">{suggestion.cantidad_sugerida} unidades</p>
                </div>
                <div>
                  <span className="text-gray-600">Proveedor Sugerido:</span>
                  <p className="font-medium">{suggestion.proveedor_sugerido || 'N/A'}</p>
                </div>
              </div>
              
              {suggestion.urgencia === 'critica' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">
                    <strong>¡Atención!</strong> Stock crítico - Se requiere reorden inmediato
                  </p>
                </div>
              )}
            </div>
            
            <div className="ml-4">
              <Button
                onClick={() => onExecuteReorder(suggestion.material_id)}
                disabled={processing}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Ejecutar Reorden
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Tab de Reportes
const ReportsTab: React.FC = () => {
  return (
    <div className="text-center py-12">
      <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Reportes de Reorden</h3>
      <p className="text-gray-600">Los reportes detallados estarán disponibles próximamente.</p>
    </div>
  );
};

// Modal de Configuración
interface ConfigurationModalProps {
  config: ReorderAlert | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Partial<ReorderAlert>) => void;
  processing: boolean;
}

const ConfigurationModal: React.FC<ConfigurationModalProps> = ({
  config,
  isOpen,
  onClose,
  onSave,
  processing
}) => {
  const [formData, setFormData] = useState<Partial<ReorderAlert>>({
    material_id: config?.material_id || '',
    punto_reorden: config?.punto_reorden || 0,
    cantidad_sugerida: config?.cantidad_sugerida || 0,
    stock_actual: config?.stock_actual || 0,
    urgencia: config?.urgencia || 'media',
    proveedor_sugerido: config?.proveedor_sugerido || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.material_id || !formData.punto_reorden || !formData.cantidad_sugerida) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }
    
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config ? 'Editar Configuración' : 'Nueva Configuración'}>
      <ModalDescription>
        {config ? 'Modifica los parámetros de reorden para el material seleccionado' : 'Configura los parámetros de reorden automático para un nuevo material'}
      </ModalDescription>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material ID *
            </label>
            <input
              type="text"
              value={formData.material_id}
              onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Punto de Reorden *
            </label>
            <input
              type="number"
              min="0"
              value={formData.punto_reorden}
              onChange={(e) => setFormData({ ...formData, punto_reorden: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad Sugerida *
            </label>
            <input
              type="number"
              min="1"
              value={formData.cantidad_sugerida}
              onChange={(e) => setFormData({ ...formData, cantidad_sugerida: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Actual
            </label>
            <input
              type="number"
              min="0"
              value={formData.stock_actual}
              onChange={(e) => setFormData({ ...formData, stock_actual: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Material
            </label>
            <input
              type="text"
              value={formData.material_nombre || ''}
              onChange={(e) => setFormData({ ...formData, material_nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del material"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Proveedor Preferido
          </label>
          <input
            type="text"
            value={formData.proveedor_sugerido}
            onChange={(e) => setFormData({ ...formData, proveedor_sugerido: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre del proveedor preferido"
          />
        </div>
        

        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="urgencia"
            checked={formData.urgencia === 'alta'}
            onChange={(e) => setFormData({ ...formData, urgencia: e.target.checked ? 'alta' : 'media' })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="urgencia" className="ml-2 block text-sm text-gray-900">
            Urgencia Alta
          </label>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={processing}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            disabled={processing}
          >
            {processing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};