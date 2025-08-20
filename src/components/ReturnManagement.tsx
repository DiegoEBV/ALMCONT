import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { 
  Package, 
  ArrowLeft, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Check, 
  X, 
  AlertTriangle,
  Calendar,
  User,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { ReturnService } from '../services/returnService';
import { Return } from '../types';

// Tipos de datos
type ReturnRequest = Return;

interface ReturnDetail {
  id: string;
  devolucion_id: string;
  material_id: string;
  material_codigo?: string;
  material_nombre?: string;
  cantidad: number;
  precio_unitario?: number;
  subtotal?: number;
  motivo_detalle?: string;
}

interface ReturnFormData {
  tipo_documento: 'entrada' | 'salida';
  documento_id: string;
  motivo: string;
  observaciones: string;
  solicitado_por: string;
  detalles: {
    material_id: string;
    cantidad: number;
    motivo_detalle: string;
  }[];
}

interface ReturnSummary {
  total_devoluciones: number;
  valor_total: number;
  devoluciones_por_tipo: {
    cliente: number;
    proveedor: number;
    interna: number;
  };
  devoluciones_por_estado: {
    pendiente: number;
    aprobada: number;
    procesada: number;
    rechazada: number;
    cancelada: number;
  };
  materiales_mas_devueltos: Array<{
    material_id: string;
    material_nombre: string;
    cantidad_total: number;
    valor_total: number;
  }>;
}

type TabType = 'pending' | 'history' | 'create' | 'reports';

const ReturnManagement: React.FC = () => {
  // Estados principales
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [returns, setReturns] = useState<Return[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [returnDetails, setReturnDetails] = useState<ReturnDetail[]>([]);
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para modales
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Cargar datos iniciales
  useEffect(() => {
    loadReturns();
    loadSummary();
  }, [activeTab, statusFilter, dateFilter]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.estado = statusFilter;
      }
      if (dateFilter !== 'all') {
        const now = new Date();
        const days = parseInt(dateFilter);
        const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filters.fecha_desde = fromDate.toISOString().split('T')[0];
      }

      const data = activeTab === 'pending' 
        ? await ReturnService.getPendingReturns()
        : await ReturnService.getPendingReturns(filters);
      
      setReturns(data);
    } catch (err) {
      console.error('Error loading returns:', err);
      setError('Error al cargar las devoluciones');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await ReturnService.getReturnsSummary();
      setSummary(data);
    } catch (err) {
      console.error('Error loading summary:', err);
    }
  };

  const loadReturnDetails = async (returnId: string) => {
    try {
      // Aquí cargaríamos los detalles de la devolución
      // Por ahora usamos datos mock
      setReturnDetails([]);
    } catch (err) {
      console.error('Error loading return details:', err);
    }
  };

  // Handlers
  const handleViewDetails = async (returnRequest: ReturnRequest) => {
    setSelectedReturn(returnRequest);
    await loadReturnDetails(returnRequest.id);
    setShowDetailModal(true);
  };

  const handleApproveReturn = async (returnId: string) => {
    try {
      await ReturnService.approveReturn(returnId, 'Aprobado desde interfaz');
      await loadReturns();
      await loadSummary();
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error approving return:', err);
      setError('Error al aprobar la devolución');
    }
  };

  const handleRejectReturn = async (returnId: string, reason: string) => {
    try {
      await ReturnService.rejectReturn(returnId, reason, reason);
      await loadReturns();
      await loadSummary();
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error rejecting return:', err);
      setError('Error al rechazar la devolución');
    }
  };

  const handleCreateReturn = async (formData: ReturnFormData) => {
    try {
      await ReturnService.createReturnRequest({
        tipo_devolucion: formData.tipo_documento as 'cliente' | 'proveedor' | 'interna',
        documento_origen_id: formData.documento_id,
        motivo: formData.motivo,
        observaciones: formData.observaciones,
        detalles: formData.detalles,
        solicitado_por: formData.solicitado_por
      });
      await loadReturns();
      await loadSummary();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating return:', err);
      setError('Error al crear la devolución');
    }
  };

  // Filtrar devoluciones
  const filteredReturns = returns.filter(returnRequest => {
    const matchesSearch = returnRequest.numero_devolucion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnRequest.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (returnRequest.usuario?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Vista de Devoluciones Pendientes
  const PendingView: React.FC = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar devoluciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="aprobada">Aprobada</option>
              <option value="rechazada">Rechazada</option>
              <option value="procesada">Procesada</option>
            </select>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Devolución
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Cargando devoluciones...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay devoluciones {activeTab === 'pending' ? 'pendientes' : 'registradas'}</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Solicitante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReturns.map((returnRequest) => (
                    <tr key={returnRequest.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{returnRequest.numero_devolucion}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          returnRequest.estado === 'APROBADO' 
                            ? 'bg-green-100 text-green-800' 
                            : returnRequest.estado === 'PENDIENTE'
                            ? 'bg-yellow-100 text-yellow-800'
                            : returnRequest.estado === 'RECHAZADO'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {returnRequest.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{returnRequest.motivo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{returnRequest.usuario?.nombre || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          returnRequest.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                          returnRequest.estado === 'APROBADO' ? 'bg-green-100 text-green-800' :
                          returnRequest.estado === 'RECHAZADO' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {returnRequest.estado.charAt(0).toUpperCase() + returnRequest.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(returnRequest.fecha_devolucion).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        N/A
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(returnRequest)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Vista de Reportes
  const ReportsView: React.FC = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{summary?.devoluciones_por_estado?.pendiente || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aprobadas</p>
                <p className="text-2xl font-bold text-green-600">{summary?.devoluciones_por_estado?.aprobada || 0}</p>
              </div>
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rechazadas</p>
                <p className="text-2xl font-bold text-red-600">{summary?.devoluciones_por_estado?.rechazada || 0}</p>
              </div>
              <X className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total (Mes)</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${(summary?.valor_total || 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis de Tendencias</h3>
          <div className="text-center py-8">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Gráficos de tendencias se mostrarán aquí</p>
          </div>
        </div>
      </div>
    );
  };

  // Modal de Detalles
  const DetailModal: React.FC = () => {
    if (!showDetailModal || !selectedReturn) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Detalles de Devolución</h2>
            <button
              onClick={() => setShowDetailModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Información General */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Información General</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Código:</span>
                  <div className="font-medium">{selectedReturn.numero_devolucion}</div>
                </div>
                <div>
                  <span className="text-gray-600">Tipo:</span>
                  <div className="font-medium">
                    {selectedReturn.estado}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Estado:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedReturn.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' : 
                    selectedReturn.estado === 'APROBADO' ? 'bg-green-100 text-green-800' :    
                    selectedReturn.estado === 'RECHAZADO' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedReturn.estado.charAt(0).toUpperCase() + selectedReturn.estado.slice(1)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Valor Total:</span>
                  <div className="font-medium">
                    N/A
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Solicitante:</span>
                  <div className="font-medium">{selectedReturn.usuario?.nombre || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Fecha Solicitud:</span>
                  <div className="font-medium">
                    {new Date(selectedReturn.fecha_devolucion).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Motivo</h3>
              <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{selectedReturn.motivo}</p>
            </div>

            {/* Observaciones */}
            {selectedReturn.observaciones && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Observaciones</h3>
                <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{selectedReturn.observaciones}</p>
              </div>
            )}

            {/* Detalles de Items */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Items a Devolver</h3>
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Los detalles de items se mostrarán aquí</p>
              </div>
            </div>

            {/* Acciones */}
            {selectedReturn.estado === 'PENDIENTE' && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleRejectReturn(selectedReturn.id, 'Rechazado desde interfaz')}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  onClick={() => handleApproveReturn(selectedReturn.id)}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aprobar
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Modal de Crear Devolución
  const CreateModal: React.FC = () => {
    const [formData, setFormData] = useState<ReturnFormData>({
      tipo_documento: 'entrada',
      documento_id: '',
      motivo: '',
      observaciones: '',
      solicitado_por: '',
      detalles: []
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleCreateReturn(formData);
    };

    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Nueva Devolución</h2>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Documento *
              </label>
              <select
                value={formData.tipo_documento}
                onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value as 'entrada' | 'salida' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID del Documento *
              </label>
              <input
                type="text"
                value={formData.documento_id}
                onChange={(e) => setFormData({ ...formData, documento_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ID del documento a devolver"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo *
              </label>
              <textarea
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe el motivo de la devolución..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solicitado por *
              </label>
              <input
                type="text"
                value={formData.solicitado_por}
                onChange={(e) => setFormData({ ...formData, solicitado_por: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ID del usuario solicitante"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones adicionales..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Componente Principal
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Devoluciones</h1>
          <p className="text-gray-600">Administra las devoluciones de materiales</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'pending', label: 'Pendientes', icon: AlertTriangle },
            { id: 'history', label: 'Historial', icon: FileText },
            { id: 'reports', label: 'Reportes', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-h-[400px]">
        {(activeTab === 'pending' || activeTab === 'history') && <PendingView />}
        {activeTab === 'reports' && <ReportsView />}
      </div>

      <DetailModal />
      <CreateModal />
    </div>
  );
};

export default ReturnManagement;