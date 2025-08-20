import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, BarChart3, Search, Plus, Eye, Edit3, FileText, Save, TrendingUp, TrendingDown, X } from 'lucide-react';
import { CyclicInventoryService, CountTask, CountResult, CountSummary } from '../services/cyclicInventoryService';
import { Database } from '../types/database';

type CyclicCount = Database['public']['Tables']['conteos_ciclicos']['Row'];
import { Button } from './ui/button';
import LoadingSpinner from './ui/LoadingSpinner';


import { toast } from 'sonner';

// Utility functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'programado': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'en_proceso': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'completado': return 'text-green-600 bg-green-50 border-green-200';
    case 'cancelado': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'programado': return <Calendar className="w-4 h-4" />;
    case 'en_proceso': return <Clock className="w-4 h-4" />;
    case 'completado': return <CheckCircle className="w-4 h-4" />;
    case 'cancelado': return <AlertTriangle className="w-4 h-4" />;
    default: return <Calendar className="w-4 h-4" />;
  }
};

const getClassificationColor = (classification: string) => {
  switch (classification) {
    case 'A': return 'text-red-600 bg-red-50 border-red-200';
    case 'B': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'C': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

interface CyclicInventoryProps {
  className?: string;
}

type TabType = 'schedule' | 'tasks' | 'history' | 'reports';

interface ScheduleData {
  clasificacion: 'A' | 'B' | 'C';
  fecha_inicio: string;
  fecha_fin: string;
  ubicaciones: string[];
  materiales: string[];
}

interface CountData {
  cantidad_contada: number;
  observaciones: string;
}

export const CyclicInventory: React.FC<CyclicInventoryProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [counts, setCounts] = useState<CyclicCount[]>([]);
  const [tasks, setTasks] = useState<CountTask[]>([]);
  const [summary, setSummary] = useState<CountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [selectedCount, setSelectedCount] = useState<CyclicCount | null>(null);
  const [selectedTask, setSelectedTask] = useState<CountTask | null>(null);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'programado' | 'en_proceso' | 'completado' | 'cancelado'>('all');
  const [filterClassification, setFilterClassification] = useState<'all' | 'A' | 'B' | 'C'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Usar métodos que existen en el servicio
      const countsData = await CyclicInventoryService.getCountHistory();
      
      setCounts(countsData);
      setTasks([]); // Por ahora vacío hasta implementar
      setSummary(null); // Por ahora null hasta implementar
    } catch (error) {
      console.error('Error loading cyclic inventory data:', error);
      toast.error('Error al cargar datos de inventario cíclico');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCount = async (scheduleData: {
    clasificacion: 'A' | 'B' | 'C';
    fecha_inicio: string;
    fecha_fin: string;
    ubicaciones: string[];
    materiales: string[];
  }) => {
    try {
      setProcessing(true);
      // Por ahora mostrar mensaje de funcionalidad en desarrollo
      toast.info('Funcionalidad de programación en desarrollo');
      setShowScheduleModal(false);
    } catch (error) {
      console.error('Error scheduling count:', error);
      toast.error('Error al programar conteo');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartCount = async (countId: string) => {
    try {
      setProcessing(true);
      const result = await CyclicInventoryService.startCount(countId, 'user-id');
      
      if (result.success) {
        toast.success(result.message);
        await loadData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error starting count:', error);
      toast.error('Error al iniciar conteo');
    } finally {
      setProcessing(false);
    }
  };

  const handleRecordCount = async (taskId: string, countData: {
    cantidad_contada: number;
    observaciones?: string;
  }) => {
    try {
      setProcessing(true);
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        toast.error('Tarea no encontrada');
        return;
      }
      
      const results: CountResult[] = task.ubicaciones_asignadas?.map(ubicacion => ({
         material_id: task.material_id || '',
         ubicacion_id: ubicacion.ubicacion_id,
         stock_teorico: ubicacion.stock_teorico,
         stock_fisico: countData.cantidad_contada,
         diferencia: countData.cantidad_contada - ubicacion.stock_teorico,
         tipo_diferencia: countData.cantidad_contada === ubicacion.stock_teorico ? 'correcto' : 
                         countData.cantidad_contada < ubicacion.stock_teorico ? 'faltante' : 'sobrante',
         observaciones: countData.observaciones
       })) || [];
      
      const result = await CyclicInventoryService.recordCountResults(
        taskId,
        results,
        'user-id'
      );
      
      if (result.success) {
        toast.success(result.message);
        await loadData();
        setShowCountModal(false);
        setSelectedTask(null);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error recording count:', error);
      toast.error('Error al registrar conteo');
    } finally {
      setProcessing(false);
    }
  };



  const filteredCounts = counts.filter(count => {
    const matchesSearch = count.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         count.tipo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || count.estado === filterStatus;
    const matchesClassification = filterClassification === 'all' || count.tipo === filterClassification;
    return matchesSearch && matchesStatus && matchesClassification;
  });

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.material_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.material_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
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
          <h2 className="text-2xl font-bold text-gray-900">Inventario Cíclico</h2>
          <p className="text-gray-600 mt-1">
            Gestión automatizada de conteos cíclicos por clasificación ABC
          </p>
        </div>
        
        <Button
          onClick={() => setShowScheduleModal(true)}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Programar Conteo
        </Button>
      </div>

      {/* Resumen */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conteos Programados</p>
                <p className="text-2xl font-bold text-blue-600">{summary.total_materiales}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Proceso</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.total_materiales - summary.materiales_correctos - summary.materiales_con_diferencias}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completados</p>
                <p className="text-2xl font-bold text-green-600">{summary.materiales_correctos}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Diferencias</p>
                <p className="text-2xl font-bold text-red-600">{summary.materiales_con_diferencias}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'schedule', label: 'Programación', icon: Calendar },
            { id: 'tasks', label: 'Tareas Pendientes', icon: Clock },
            { id: 'history', label: 'Historial', icon: FileText },
            { id: 'reports', label: 'Reportes', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar conteos o materiales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {activeTab === 'schedule' && (
          <>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="programado">Programado</option>
              <option value="en_proceso">En Proceso</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            
            <select
              value={filterClassification}
              onChange={(e) => setFilterClassification(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las clasificaciones</option>
              <option value="A">Clasificación A</option>
              <option value="B">Clasificación B</option>
              <option value="C">Clasificación C</option>
            </select>
          </>
        )}
      </div>

      {/* Contenido por Tab */}
      {activeTab === 'schedule' && (
        <ScheduleView
          counts={filteredCounts}
          onStartCount={handleStartCount}
          onViewDetails={(count) => {
            setSelectedCount(count);
            // Aquí se podría abrir un modal de detalles
          }}
          processing={processing}
        />
      )}

      {activeTab === 'tasks' && (
        <TasksView
          tasks={filteredTasks}
          onRecordCount={(task) => {
            setSelectedTask(task);
            setShowCountModal(true);
          }}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView />
      )}

      {activeTab === 'reports' && (
        <ReportsView summary={summary} />
      )}

      {/* Modal de Programación */}
      {showScheduleModal && (
        <ScheduleModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={handleScheduleCount}
          processing={processing}
        />
      )}

      {/* Modal de Conteo */}
      {showCountModal && selectedTask && (
        <CountModal
          task={selectedTask}
          isOpen={showCountModal}
          onClose={() => {
            setShowCountModal(false);
            setSelectedTask(null);
          }}
          onRecord={handleRecordCount}
          processing={processing}
        />
      )}
    </div>
  );
};

// Vista de Programación
interface ScheduleViewProps {
  counts: CyclicCount[];
  onStartCount: (countId: string) => void;
  onViewDetails: (count: CyclicCount) => void;
  processing: boolean;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ counts, onStartCount, onViewDetails, processing }) => {
  if (counts.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay conteos programados</h3>
        <p className="text-gray-600">Programa un nuevo conteo cíclico para comenzar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Clasificación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Programada
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frecuencia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asignado a
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {counts.map((count) => (
              <tr key={count.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getClassificationColor(count.tipo || '')}`}>
                    {count.tipo}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {count.fecha_programada ? new Date(count.fecha_programada).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {count.descripcion || 'Sin descripción'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(count.estado || 'programado')}`}>
                    {getStatusIcon(count.estado || 'programado')}
                    {(count.estado || 'programado').toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {count.usuario_responsable || 'Sin asignar'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Button
                    onClick={() => onViewDetails(count)}
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                  
                  {count.estado === 'programado' && (
                    <Button
                      onClick={() => onStartCount(count.id)}
                      size="sm"
                      disabled={processing}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Iniciar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Vista de Tareas
interface TasksViewProps {
  tasks: CountTask[];
  onRecordCount: (task: CountTask) => void;
}

const TasksView: React.FC<TasksViewProps> = ({ tasks, onRecordCount }) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay tareas pendientes</h3>
        <p className="text-gray-600">Todas las tareas de conteo han sido completadas.</p>
      </div>
    );
  }

  return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{task.material_nombre}</h3>
              <p className="text-sm text-gray-600">{task.material_id}</p>
              </div>
              <span className="text-xs text-gray-500">
                {task.fecha_programada ? new Date(task.fecha_programada).toLocaleDateString() : ''}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex justify-between">
                <span>Ubicaciones:</span>
                <span className="font-medium">{task.ubicaciones_asignadas?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Prioridad:</span>
                <span className={`font-medium ${
                  task.prioridad === 'alta' ? 'text-red-600' :
                  task.prioridad === 'media' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {task.prioridad?.toUpperCase()}
                </span>
              </div>
            </div>
            
            <Button
              onClick={() => onRecordCount(task)}
              size="sm"
              className="w-full"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Registrar Conteo
            </Button>
          </div>
        ))}
      </div>
    );
   };

  // Modal para Programar Conteo
  interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (data: ScheduleData) => void;
    processing: boolean;
  }

  const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onSchedule, processing }) => {
    const [formData, setFormData] = useState<ScheduleData>({
      clasificacion: 'A',
      fecha_inicio: '',
      fecha_fin: '',
      ubicaciones: [],
      materiales: []
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSchedule(formData);
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Programar Conteo Cíclico</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clasificación ABC
              </label>
              <select
                value={formData.clasificacion}
                onChange={(e) => setFormData({ ...formData, clasificacion: e.target.value as 'A' | 'B' | 'C' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="A">Clasificación A (Alta rotación)</option>
                <option value="B">Clasificación B (Media rotación)</option>
                <option value="C">Clasificación C (Baja rotación)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Fin
              </label>
              <input
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={processing}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Programar
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Modal para Registrar Conteo
  interface CountModalProps {
    isOpen: boolean;
    task: CountTask | null;
    onClose: () => void;
    onRecord: (taskId: string, data: CountData) => void;
    processing: boolean;
  }

  const CountModal: React.FC<CountModalProps> = ({ isOpen, task, onClose, onRecord, processing }) => {
    const [formData, setFormData] = useState<CountData>({
      cantidad_contada: 0,
      observaciones: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (task) {
        onRecord(task.id, formData);
        onClose();
      }
    };

    if (!isOpen || !task) return null;

    const diferencia = formData.cantidad_contada - 0; // Sin cantidad esperada disponible

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Registrar Conteo</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Material:</span>
                <div className="font-medium">{task.material_nombre}</div>
              </div>
              <div>
                <span className="text-gray-600">ID Material:</span>
                <div className="font-medium">{task.material_id}</div>
              </div>
              <div>
                <span className="text-gray-600">Ubicaciones:</span>
                <div className="font-medium">{task.ubicaciones_asignadas?.length || 0}</div>
              </div>
              <div>
                <span className="text-gray-600">Prioridad:</span>
                <div className={`font-medium ${
                  task.prioridad === 'alta' ? 'text-red-600' :
                  task.prioridad === 'media' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {task.prioridad?.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad Contada *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.cantidad_contada}
                onChange={(e) => setFormData({ ...formData, cantidad_contada: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {diferencia !== 0 && (
              <div className={`p-3 rounded-lg ${
                diferencia > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {diferencia > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    diferencia > 0 ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Diferencia: {diferencia > 0 ? '+' : ''}{diferencia}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones adicionales sobre el conteo..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Registrar
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Componente HistoryView
  const HistoryView: React.FC = () => {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Historial de conteos próximamente disponible</p>
        </div>
      </div>
    );
  };

  // Componente ReportsView
  const ReportsView: React.FC<{ summary: CountSummary | null }> = ({ summary }) => {
    if (!summary) {
      return (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay datos de resumen disponibles</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Programados</p>
                <p className="text-2xl font-bold text-blue-900">{summary.total_materiales}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">En Proceso</p>
                <p className="text-2xl font-bold text-yellow-900">{summary.materiales_con_diferencias}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Completados</p>
                <p className="text-2xl font-bold text-green-900">{summary.materiales_correctos}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Con Diferencias</p>
                <p className="text-2xl font-bold text-red-900">{summary.valor_diferencias}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis por Clasificación</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['A', 'B', 'C'].map((classification) => (
              <div key={classification} className="text-center p-4 border border-gray-200 rounded-lg">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                  classification === 'A' ? 'bg-red-100 text-red-600' :
                  classification === 'B' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                }`}>
                  <span className="font-bold text-lg">{classification}</span>
                </div>
                <p className="text-sm text-gray-600">Clasificación {classification}</p>
                <p className="text-lg font-semibold text-gray-900">0</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };



export default CyclicInventory;