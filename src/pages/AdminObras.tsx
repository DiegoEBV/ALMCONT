import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Building2, Calendar, MapPin, User, DollarSign } from 'lucide-react';
import { obrasService } from '../services/obras';
import { useAuth } from '../hooks/useAuth';
import type { Obra } from '../types';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

interface ObraFormData {
  nombre: string;
  codigo: string;
  ubicacion: string;
  fecha_inicio: string;
  fecha_fin_estimada?: string;
  estado: 'ACTIVA' | 'PAUSADA' | 'FINALIZADA' | 'CANCELADA';
  presupuesto?: number;
  responsable_id?: string;
  responsable?: string;
  descripcion?: string;
}

const AdminObras: React.FC = () => {
  const { user } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingObra, setEditingObra] = useState<Obra | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [formData, setFormData] = useState<ObraFormData>({
    nombre: '',
    codigo: '',
    ubicacion: '',
    fecha_inicio: '',
    fecha_fin_estimada: '',
    estado: 'ACTIVA',
    presupuesto: undefined,
    responsable_id: undefined,
    responsable: '',
    descripcion: ''
  });

  // Todos los hooks deben estar antes de cualquier return condicional
  const loadObras = useCallback(async () => {
    try {
      setLoading(true);
      const data = await obrasService.getAll();
      setObras(data);
    } catch (error) {
      console.error('Error loading obras:', error);
      toast.error('Error al cargar las obras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadObras();
  }, [loadObras]);

  // Verificar permisos después de todos los hooks
  if (user?.rol !== 'COORDINACION') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 mb-4">
            <Building2 className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a la administración de obras.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Iniciando operación:', editingObra ? 'actualización' : 'creación');
      console.log('Datos del formulario:', formData);
      
      if (editingObra) {
        console.log('Actualizando obra con ID:', editingObra.id);
        
        // Verificar que el ID existe
        if (!editingObra.id) {
          throw new Error('ID de obra no válido para actualización');
        }
        
        const result = await obrasService.update(editingObra.id, formData);
        console.log('Resultado de actualización:', result);
        toast.success(`Obra "${formData.nombre}" actualizada exitosamente`);
      } else {
        console.log('Creando nueva obra');
        const result = await obrasService.create(formData);
        console.log('Resultado de creación:', result);
        toast.success(`Obra "${formData.nombre}" creada exitosamente`);
      }
      
      await loadObras();
      console.log('Lista de obras recargada después de la operación');
      handleCloseModal();
    } catch (error: any) {
      console.error('Error detallado al guardar obra:', {
        error,
        operacion: editingObra ? 'actualización' : 'creación',
        obraId: editingObra?.id,
        formData,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint
      });
      
      let errorMessage = editingObra ? 'Error al actualizar obra' : 'Error al crear obra';
      if (error?.message) {
        errorMessage += `: ${error.message}`;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleEdit = (obra: Obra) => {
    try {
      console.log('Editando obra:', obra);
      setEditingObra(obra);
      setFormData({
        nombre: obra.nombre,
        codigo: obra.codigo,
        ubicacion: obra.ubicacion,
        fecha_inicio: obra.fecha_inicio ? obra.fecha_inicio.split('T')[0] : '',
        fecha_fin_estimada: obra.fecha_fin_estimada ? obra.fecha_fin_estimada.split('T')[0] : '',
        estado: obra.estado,
        presupuesto: obra.presupuesto,
        responsable_id: obra.responsable_id,
        responsable: obra.responsable || '',
        descripcion: obra.descripcion || ''
      });
      setShowModal(true);
      console.log('Modal de edición abierto correctamente');
    } catch (error) {
      console.error('Error al preparar edición de obra:', error);
      toast.error('Error al abrir el formulario de edición');
    }
  };

  const handleDelete = async (obra: Obra) => {
    try {
      // Primero verificar si la obra tiene dependencias
      console.log('Verificando dependencias para obra:', obra.id, obra.nombre);
      
      // Verificar usuarios asignados con detalles
      const { data: usuariosAsignados, error: errorUsuarios } = await supabase
        .from('usuarios')
        .select('id, email, nombre, apellido')
        .eq('obra_id', obra.id);
      
      if (errorUsuarios) {
        console.error('Error verificando usuarios:', errorUsuarios);
        toast.error('Error al verificar dependencias de la obra');
        return;
      }

      // Verificar otras dependencias críticas con conteos exactos
      const { data: ordenes, error: errorOrdenes } = await supabase
        .from('ordenes_compra')
        .select('id, numero_orden')
        .eq('obra_id', obra.id);

      const { data: entradas, error: errorEntradas } = await supabase
        .from('entradas')
        .select('id, numero_entrada, fecha')
        .eq('obra_id', obra.id);

      const { data: salidas, error: errorSalidas } = await supabase
        .from('salidas')
        .select('id, numero_salida, fecha')
        .eq('obra_id', obra.id);

      const { data: stock, error: errorStock } = await supabase
        .from('stock_obra_material')
        .select('id, cantidad')
        .eq('obra_id', obra.id)
        .gt('cantidad', 0);

      const { data: requerimientos, error: errorRequerimientos } = await supabase
        .from('requerimiento_materiales')
        .select('id, numero_requerimiento')
        .eq('obra_id', obra.id);

      const { data: solicitudesCompra, error: errorSolicitudes } = await supabase
        .from('solicitudes_compra')
        .select('id, numero_sc')
        .eq('obra_id', obra.id);

      if (errorOrdenes || errorEntradas || errorSalidas || errorStock || errorRequerimientos || errorSolicitudes) {
        console.error('Error verificando dependencias:', { 
          errorOrdenes, errorEntradas, errorSalidas, errorStock, errorRequerimientos, errorSolicitudes 
        });
        toast.error('Error al verificar dependencias de la obra');
        return;
      }

      // Construir mensaje detallado con información específica de dependencias
      const dependenciasDetalladas = [];
      let totalDependencias = 0;
      
      if (usuariosAsignados && usuariosAsignados.length > 0) {
        totalDependencias += usuariosAsignados.length;
        const usuarios = usuariosAsignados.map(u => `${u.nombre} ${u.apellido} (${u.email})`).join(', ');
        dependenciasDetalladas.push(`👥 ${usuariosAsignados.length} usuario(s): ${usuarios}`);
      }
      
      if (ordenes && ordenes.length > 0) {
        totalDependencias += ordenes.length;
        const numerosOrdenes = ordenes.slice(0, 3).map(o => o.numero_orden).join(', ');
        const extra = ordenes.length > 3 ? ` y ${ordenes.length - 3} más` : '';
        dependenciasDetalladas.push(`📋 ${ordenes.length} orden(es) de compra: ${numerosOrdenes}${extra}`);
      }
      
      if (entradas && entradas.length > 0) {
        totalDependencias += entradas.length;
        const numerosEntradas = entradas.slice(0, 3).map(e => e.numero_entrada).join(', ');
        const extra = entradas.length > 3 ? ` y ${entradas.length - 3} más` : '';
        dependenciasDetalladas.push(`📦 ${entradas.length} entrada(s) de materiales: ${numerosEntradas}${extra}`);
      }
      
      if (salidas && salidas.length > 0) {
        totalDependencias += salidas.length;
        const numerosSalidas = salidas.slice(0, 3).map(s => s.numero_salida).join(', ');
        const extra = salidas.length > 3 ? ` y ${salidas.length - 3} más` : '';
        dependenciasDetalladas.push(`📤 ${salidas.length} salida(s) de materiales: ${numerosSalidas}${extra}`);
      }
      
      if (stock && stock.length > 0) {
        totalDependencias += stock.length;
        dependenciasDetalladas.push(`📊 ${stock.length} material(es) con stock activo`);
      }

      if (requerimientos && requerimientos.length > 0) {
        totalDependencias += requerimientos.length;
        const numerosReq = requerimientos.slice(0, 3).map(r => r.numero_requerimiento).join(', ');
        const extra = requerimientos.length > 3 ? ` y ${requerimientos.length - 3} más` : '';
        dependenciasDetalladas.push(`📝 ${requerimientos.length} requerimiento(s): ${numerosReq}${extra}`);
      }

      if (solicitudesCompra && solicitudesCompra.length > 0) {
        totalDependencias += solicitudesCompra.length;
        const numerosSC = solicitudesCompra.slice(0, 3).map(s => s.numero_sc).join(', ');
        const extra = solicitudesCompra.length > 3 ? ` y ${solicitudesCompra.length - 3} más` : '';
        dependenciasDetalladas.push(`🛒 ${solicitudesCompra.length} solicitud(es) de compra: ${numerosSC}${extra}`);
      }

      if (totalDependencias > 0) {
        const mensaje = `🚨 ELIMINACIÓN BLOQUEADA 🚨\n\n` +
          `La obra "${obra.nombre}" NO se puede eliminar porque tiene ${totalDependencias} registro(s) relacionado(s):\n\n` +
          `${dependenciasDetalladas.join('\n\n')}\n\n` +
          `💡 SOLUCIONES POSIBLES:\n` +
          `• Reasignar usuarios a otra obra\n` +
          `• Completar o cancelar órdenes de compra pendientes\n` +
          `• Transferir stock a otra obra\n` +
          `• Contactar al administrador del sistema\n\n` +
          `❌ Esta obra no se puede eliminar hasta resolver estas dependencias.`;
        
        toast.error('No se puede eliminar la obra - Tiene registros relacionados', {
          duration: 8000,
        });
        
        alert(mensaje);
        return;
      } else {
        const confirmMessage = `¿Estás seguro de que deseas eliminar la obra "${obra.nombre}"?\n\n` +
          `✅ Esta obra no tiene registros relacionados.\n` +
          `⚠️ Esta acción no se puede deshacer.`;
        
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }

      console.log('Iniciando eliminación de obra:', obra.id, obra.nombre);
      
      // Verificar que el ID existe
      if (!obra.id) {
        throw new Error('ID de obra no válido');
      }
      
      const result = await obrasService.delete(obra.id);
      console.log('Resultado de eliminación:', result);
      
      toast.success(`Obra "${obra.nombre}" eliminada exitosamente`);
      await loadObras();
      console.log('Lista de obras recargada después de eliminación');
      
    } catch (error: any) {
      console.error('Error detallado al eliminar obra:', {
        error,
        obraId: obra.id,
        obraNombre: obra.nombre,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint,
        errorCode: error?.code
      });
      
      let errorMessage = 'Error al eliminar obra';
      let errorDetails = '';
      
      // Mensajes más específicos según el tipo de error
      if (error?.code === '23503') {
        errorMessage = '🚫 ELIMINACIÓN BLOQUEADA';
        errorDetails = 'La obra tiene registros relacionados que impiden su eliminación.\n\n' +
          'Esto puede deberse a:\n' +
          '• Usuarios asignados a la obra\n' +
          '• Órdenes de compra activas\n' +
          '• Entradas o salidas de materiales\n' +
          '• Stock de materiales\n' +
          '• Requerimientos o solicitudes\n\n' +
          'Contacta al administrador del sistema para resolver estas dependencias.';
      } else if (error?.message?.includes('foreign key')) {
        errorMessage = '🔗 Error de Integridad de Datos';
        errorDetails = 'La obra está siendo utilizada en otros registros del sistema.';
      } else if (error?.message?.includes('permission') || error?.message?.includes('RLS')) {
        errorMessage = '🔒 Sin Permisos';
        errorDetails = 'No tienes permisos suficientes para eliminar esta obra.';
      } else if (error?.message?.includes('not found')) {
        errorMessage = '❓ Obra No Encontrada';
        errorDetails = 'La obra que intentas eliminar ya no existe.';
      } else if (error?.message) {
        errorDetails = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 6000,
      });
      
      if (errorDetails) {
        // Mostrar detalles adicionales en un alert
        setTimeout(() => {
          alert(`${errorMessage}\n\n${errorDetails}`);
        }, 500);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingObra(null);
    setFormData({
      nombre: '',
      codigo: '',
      ubicacion: '',
      fecha_inicio: '',
      fecha_fin_estimada: '',
      estado: 'ACTIVA',
      presupuesto: undefined,
      responsable_id: undefined,
      responsable: '',
      descripcion: ''
    });
  };

  const filteredObras = obras.filter(obra => {
    const matchesSearch = obra.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         obra.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         obra.ubicacion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterEstado === 'TODOS' || obra.estado === filterEstado;
    return matchesSearch && matchesFilter;
  });

  const getEstadoBadge = (estado: string) => {
    const colors = {
      ACTIVA: 'bg-green-100 text-green-800',
      PAUSADA: 'bg-yellow-100 text-yellow-800',
      FINALIZADA: 'bg-gray-100 text-gray-800',
      CANCELADA: 'bg-red-100 text-red-800'
    };
    return colors[estado as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando obras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Administración de Obras</h1>
                <p className="text-gray-600">Gestiona las obras del sistema</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Nueva Obra</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar obras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="ACTIVA">Activa</option>
                  <option value="PAUSADA">Pausada</option>
                  <option value="FINALIZADA">Finalizada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {filteredObras.length} obra{filteredObras.length !== 1 ? 's' : ''} encontrada{filteredObras.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Obras Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredObras.map((obra) => (
            <div key={obra.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{obra.nombre}</h3>
                    <p className="text-sm text-gray-600 mb-2">Código: {obra.codigo}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(obra.estado)}`}>
                      {obra.estado}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(obra)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar obra"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(obra)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar obra"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{obra.ubicacion}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{obra.responsable}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Inicio: {new Date(obra.fecha_inicio).toLocaleDateString()}</span>
                  </div>
                  {obra.fecha_fin_estimada && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Fin estimado: {new Date(obra.fecha_fin_estimada).toLocaleDateString()}</span>
                    </div>
                  )}
                  {obra.presupuesto && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Presupuesto: ${obra.presupuesto.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {obra.descripcion && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600 line-clamp-2">{obra.descripcion}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredObras.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron obras</h3>
            <p className="text-gray-600 mb-6">No hay obras que coincidan con los criterios de búsqueda.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Crear Primera Obra</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingObra ? 'Editar Obra' : 'Nueva Obra'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre de la obra"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Código único"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubicación *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ubicación de la obra"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsable *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Responsable de la obra"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Fin Estimada
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_fin_estimada}
                    onChange={(e) => setFormData({ ...formData, fecha_fin_estimada: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <select
                    required
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'ACTIVA' | 'PAUSADA' | 'FINALIZADA' | 'CANCELADA' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ACTIVA">Activa</option>
                    <option value="PAUSADA">Pausada</option>
                    <option value="FINALIZADA">Finalizada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Presupuesto
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.presupuesto || ''}
                    onChange={(e) => setFormData({ ...formData, presupuesto: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descripción de la obra (opcional)"
                />
              </div>



              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingObra ? 'Actualizar' : 'Crear'} Obra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminObras;