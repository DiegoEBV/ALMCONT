import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Edit, Trash2, Search, Filter, Shield, Building2, Mail, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { usuariosService } from '../services/usuarios';
import { obrasService } from '../services/obras';
import { useAuth } from '../hooks/useAuth';
import type { Usuario, UserRole, Obra } from '../types';
import { toast } from 'sonner';

interface UsuarioFormData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
  obra_id: string;
  activo: boolean;
}

const AdminUsuarios: React.FC = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState<string>('TODOS');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [formData, setFormData] = useState<UsuarioFormData>({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    rol: 'ALMACENERO',
    obra_id: '',
    activo: true
  });

  // Verificar permisos
  if (user?.rol !== 'COORDINACION') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 mb-4">
            <Users className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a la administración de usuarios.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usuariosData, obrasData] = await Promise.all([
        usuariosService.getAll(),
        obrasService.getAll()
      ]);
      setUsuarios(usuariosData);
      setObras(obrasData.filter(obra => obra.estado === 'ACTIVA'));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUsuario) {
        const updateData = { ...formData };
        // No actualizar password si está vacío
        if (!updateData.password) {
          delete (updateData as any).password;
        }
        await usuariosService.update(editingUsuario.id, updateData);
        toast.success('Usuario actualizado exitosamente');
      } else {
        await usuariosService.create(formData);
        toast.success('Usuario creado exitosamente');
      }
      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving usuario:', error);
      toast.error(editingUsuario ? 'Error al actualizar usuario' : 'Error al crear usuario');
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      email: usuario.email,
      password: '', // No mostrar password actual
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
      obra_id: usuario.obra_id,
      activo: usuario.activo
    });
    setShowModal(true);
  };

  const handleDelete = async (usuario: Usuario) => {
    if (usuario.id === user?.id) {
      toast.error('No puedes eliminar tu propio usuario');
      return;
    }
    
    if (window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${usuario.nombre} ${usuario.apellido}"?`)) {
      try {
        await usuariosService.delete(usuario.id);
        toast.success('Usuario eliminado exitosamente');
        await loadData();
      } catch (error) {
        console.error('Error deleting usuario:', error);
        toast.error('Error al eliminar usuario');
      }
    }
  };

  const handleToggleActive = async (usuario: Usuario) => {
    if (usuario.id === user?.id) {
      toast.error('No puedes desactivar tu propio usuario');
      return;
    }

    try {
      await usuariosService.update(usuario.id, { activo: !usuario.activo });
      toast.success(`Usuario ${!usuario.activo ? 'activado' : 'desactivado'} exitosamente`);
      await loadData();
    } catch (error) {
      console.error('Error toggling usuario status:', error);
      toast.error('Error al cambiar el estado del usuario');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUsuario(null);
    setFormData({
      email: '',
      password: '',
      nombre: '',
      apellido: '',
      rol: 'ALMACENERO',
      obra_id: '',
      activo: true
    });
  };

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRol = filterRol === 'TODOS' || usuario.rol === filterRol;
    const matchesEstado = filterEstado === 'TODOS' || 
                         (filterEstado === 'ACTIVO' && usuario.activo) ||
                         (filterEstado === 'INACTIVO' && !usuario.activo);
    return matchesSearch && matchesRol && matchesEstado;
  });

  const getRolBadge = (rol: UserRole) => {
    const colors = {
      COORDINACION: 'bg-purple-100 text-purple-800',
      LOGISTICA: 'bg-blue-100 text-blue-800',
      ALMACENERO: 'bg-green-100 text-green-800'
    };
    return colors[rol] || 'bg-gray-100 text-gray-800';
  };

  const getRolIcon = (rol: UserRole) => {
    switch (rol) {
      case 'COORDINACION':
        return <Shield className="h-4 w-4" />;
      case 'LOGISTICA':
        return <Users className="h-4 w-4" />;
      case 'ALMACENERO':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getObraNombre = (obraId: string) => {
    const obra = obras.find(o => o.id === obraId);
    return obra ? obra.nombre : 'Sin asignar';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando usuarios...</p>
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
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
                <p className="text-gray-600">Administra usuarios, roles y permisos del sistema</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              <span>Nuevo Usuario</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filterRol}
                  onChange={(e) => setFilterRol(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="TODOS">Todos los roles</option>
                  <option value="COORDINACION">Coordinación</option>
                  <option value="LOGISTICA">Logística</option>
                  <option value="ALMACENERO">Almacenero</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="ACTIVO">Activos</option>
                  <option value="INACTIVO">Inactivos</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {filteredUsuarios.length} usuario{filteredUsuarios.length !== 1 ? 's' : ''} encontrado{filteredUsuarios.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Usuarios Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Obra Asignada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Creación
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {usuario.nombre.charAt(0)}{usuario.apellido.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {usuario.nombre} {usuario.apellido}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {usuario.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRolBadge(usuario.rol)}`}>
                        {getRolIcon(usuario.rol)}
                        <span className="ml-1">{usuario.rol}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                        {getObraNombre(usuario.obra_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(usuario)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          usuario.activo
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                        disabled={usuario.id === user?.id}
                      >
                        {usuario.activo ? (
                          <ToggleRight className="h-4 w-4 mr-1" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 mr-1" />
                        )}
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(usuario.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(usuario)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar usuario"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(usuario)}
                          disabled={usuario.id === user?.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsuarios.length === 0 && (
            <div className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron usuarios</h3>
              <p className="text-gray-600 mb-6">No hay usuarios que coincidan con los criterios de búsqueda.</p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
              >
                <UserPlus className="h-5 w-5" />
                <span>Crear Primer Usuario</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                    placeholder="Nombre del usuario"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Apellido del usuario"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña {editingUsuario ? '(dejar vacío para mantener actual)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingUsuario}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={editingUsuario ? "Nueva contraseña (opcional)" : "Contraseña"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol *
                  </label>
                  <select
                    required
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value as UserRole })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ALMACENERO">Almacenero</option>
                    <option value="LOGISTICA">Logística</option>
                    <option value="COORDINACION">Coordinación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Obra Asignada *
                  </label>
                  <select
                    required
                    value={formData.obra_id}
                    onChange={(e) => setFormData({ ...formData, obra_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar obra</option>
                    {obras.map((obra) => (
                      <option key={obra.id} value={obra.id}>
                        {obra.nombre} ({obra.codigo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="activo" className="ml-2 block text-sm text-gray-700">
                  Usuario activo
                </label>
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
                  {editingUsuario ? 'Actualizar' : 'Crear'} Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsuarios;