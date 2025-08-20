import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Eye, AlertTriangle, User, Calendar, DollarSign } from 'lucide-react';
import { ApprovalService } from '../services/approvalService';
import type { Approval } from '../types';
import { Button } from './ui/button';
import { CustomModal as Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter, ModalDescription } from './ui/modal';
import LoadingSpinner from './ui/LoadingSpinner';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

interface ApprovalWorkflowProps {
  className?: string;
}

export const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({ className }) => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'priority'>('date');

  useEffect(() => {
    loadPendingApprovals();
  }, [user]);

  const loadPendingApprovals = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const approvals = await ApprovalService.getPendingApprovals(user.id);
      setPendingApprovals(approvals);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      toast.error('Error al cargar aprobaciones pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string, observaciones?: string) => {
    if (!user?.id) return;
    
    try {
      setProcessing(true);
      const result = await ApprovalService.processApproval(
        approvalId,
        user.id,
        'aprobar',
        observaciones
      );
      
      if (result.success) {
        toast.success('Documento aprobado exitosamente');
        await loadPendingApprovals();
        setShowModal(false);
        setSelectedApproval(null);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error approving document:', error);
      toast.error('Error al aprobar documento');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (approvalId: string, observaciones: string) => {
    if (!user?.id || !observaciones.trim()) {
      toast.error('Las observaciones son requeridas para rechazar');
      return;
    }
    
    try {
      setProcessing(true);
      const result = await ApprovalService.processApproval(
        approvalId,
        user.id,
        'rechazar',
        observaciones
      );
      
      if (result.success) {
        toast.success('Documento rechazado');
        await loadPendingApprovals();
        setShowModal(false);
        setSelectedApproval(null);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast.error('Error al rechazar documento');
    } finally {
      setProcessing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'text-red-600 bg-red-50';
      case 'media': return 'text-yellow-600 bg-yellow-50';
      case 'baja': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'alta': return <AlertTriangle className="w-4 h-4" />;
      case 'media': return <Clock className="w-4 h-4" />;
      case 'baja': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'solicitud_compra': 'Solicitud de Compra',
      'orden_compra': 'Orden de Compra',
      'salida_materiales': 'Salida de Materiales',
      'devolucion': 'Devolución',
      'ajuste_inventario': 'Ajuste de Inventario'
    };
    return labels[type] || type;
  };

  const filteredAndSortedApprovals = pendingApprovals
    .filter(approval => filter === 'all' || (approval.datos_solicitud?.prioridad || 'media') === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return (b.datos_solicitud?.monto || 0) - (a.datos_solicitud?.monto || 0);
        case 'priority':
          const priorityOrder = { 'alta': 3, 'media': 2, 'baja': 1 };
          return (priorityOrder[(b.datos_solicitud?.prioridad || 'media') as keyof typeof priorityOrder] || 0) -
                 (priorityOrder[(a.datos_solicitud?.prioridad || 'media') as keyof typeof priorityOrder] || 0);
        case 'date':
        default:
          return new Date(a.fecha_solicitud).getTime() - new Date(b.fecha_solicitud).getTime();
      }
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
          <h2 className="text-2xl font-bold text-gray-900">Flujo de Aprobaciones</h2>
          <p className="text-gray-600 mt-1">
            {pendingApprovals.length} documento{pendingApprovals.length !== 1 ? 's' : ''} pendiente{pendingApprovals.length !== 1 ? 's' : ''} de aprobación
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Filtros */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las prioridades</option>
            <option value="alta">Prioridad Alta</option>
            <option value="media">Prioridad Media</option>
            <option value="baja">Prioridad Baja</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">Ordenar por Fecha</option>
            <option value="amount">Ordenar por Monto</option>
            <option value="priority">Ordenar por Prioridad</option>
          </select>
          
          <Button
            onClick={loadPendingApprovals}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Lista de Aprobaciones */}
      {filteredAndSortedApprovals.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay aprobaciones pendientes</h3>
          <p className="text-gray-600">Todos los documentos han sido procesados.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAndSortedApprovals.map((approval) => (
            <div
              key={approval.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(approval.datos_solicitud?.prioridad || 'media')}`}>
                      {getPriorityIcon(approval.datos_solicitud?.prioridad || 'media')}
                      {(approval.datos_solicitud?.prioridad || 'media').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {getDocumentTypeLabel(approval.tipo)}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {approval.referencia_id || `Documento #${approval.id}`}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Solicitado por: {approval.solicitante_id || 'Usuario desconocido'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Fecha: {new Date(approval.fecha_solicitud).toLocaleDateString()}</span>
                    </div>
                    
                    {approval.datos_solicitud?.monto && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>Monto: ${approval.datos_solicitud.monto.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {approval.comentarios && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">
                        <strong>Comentarios:</strong> {approval.comentarios}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    onClick={() => {
                      setSelectedApproval(approval);
                      setShowModal(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Detalles
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalles y Aprobación */}
      {selectedApproval && (
        <ApprovalModal
          approval={selectedApproval}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedApproval(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          processing={processing}
        />
      )}
    </div>
  );
};

// Componente Modal para Detalles de Aprobación
interface ApprovalModalProps {
  approval: Approval;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string, observaciones?: string) => void;
  onReject: (id: string, observaciones: string) => void;
  processing: boolean;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({
  approval,
  isOpen,
  onClose,
  onApprove,
  onReject,
  processing
}) => {
  const [observaciones, setObservaciones] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleSubmit = () => {
    if (action === 'approve') {
      onApprove(approval.id, observaciones || undefined);
    } else if (action === 'reject') {
      if (!observaciones.trim()) {
        toast.error('Las observaciones son requeridas para rechazar');
        return;
      }
      onReject(approval.id, observaciones);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalles de Aprobación">
      <ModalDescription>
        Revisa y procesa la solicitud de aprobación con toda la información detallada
      </ModalDescription>
      <div className="space-y-6">
        {/* Información del Documento */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Información del Documento</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Tipo:</span>
              <p className="font-medium">{approval.tipo}</p>
            </div>
            <div>
              <span className="text-gray-600">Código:</span>
              <p className="font-medium">{approval.referencia_id || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600">Solicitante:</span>
              <p className="font-medium">{approval.solicitante_id || 'Usuario desconocido'}</p>
            </div>
            <div>
              <span className="text-gray-600">Fecha:</span>
              <p className="font-medium">{new Date(approval.fecha_solicitud).toLocaleDateString()}</p>
            </div>
            {approval.datos_solicitud?.monto && (
              <div className="col-span-2">
                <span className="text-gray-600">Monto:</span>
                <p className="font-medium text-lg">${approval.datos_solicitud.monto.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Observaciones del Documento */}
        {approval.comentarios && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Comentarios del Documento</h4>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{approval.comentarios}</p>
          </div>
        )}

        {/* Observaciones de Aprobación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones de Aprobación {action === 'reject' && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder={action === 'reject' ? 'Especifique el motivo del rechazo...' : 'Observaciones adicionales (opcional)...'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={processing}
          >
            Cancelar
          </Button>
          
          <Button
            onClick={() => {
              setAction('reject');
              handleSubmit();
            }}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
            disabled={processing}
          >
            {processing && action === 'reject' ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar
              </>
            )}
          </Button>
          
          <Button
            onClick={() => {
              setAction('approve');
              handleSubmit();
            }}
            className="bg-green-600 hover:bg-green-700"
            disabled={processing}
          >
            {processing && action === 'approve' ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprobar
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};