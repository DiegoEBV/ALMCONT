import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { toast } from 'sonner'
import { localAuth } from '../services/localAuth'
import NotificationConfig from '../components/NotificationConfig'

export default function Perfil() {
  const { user, refreshUser, loading: authLoading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Debug: Log user data
  React.useEffect(() => {
    console.log('Perfil - User data:', user)
    console.log('Perfil - Auth loading:', authLoading)
  }, [user, authLoading])
  
  // Estados para formulario de edición
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    email: user?.email || ''
  })
  
  // Estados para cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Actualizar formData cuando user cambie
  React.useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email
      })
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!user) return
    
    // Validaciones básicas
    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.email.trim()) {
      toast.error('Todos los campos son obligatorios')
      return
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('El formato del email no es válido')
      return
    }
    
    setLoading(true)
    try {
      const success = await localAuth.updateProfile({
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        email: formData.email.trim()
      })
      
      if (success) {
        toast.success('Perfil actualizado correctamente')
        setIsEditing(false)
        await refreshUser()
      } else {
        toast.error('Error al actualizar el perfil')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el perfil'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    // Validaciones
    if (!passwordData.currentPassword.trim()) {
      toast.error('Ingresa tu contraseña actual')
      return
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const success = await localAuth.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      )
      
      if (success) {
        toast.success('Contraseña cambiada correctamente')
        setIsChangingPassword(false)
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        toast.error('La contraseña actual es incorrecta')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    if (user) {
      setFormData({
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email
      })
    }
    setIsEditing(false)
  }

  // Mostrar loading mientras se cargan los datos
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfil de Usuario</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona tu información personal y configuración de cuenta.
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar mensaje si no hay usuario
  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfil de Usuario</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona tu información personal y configuración de cuenta.
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-500 text-center">No se pudo cargar la información del usuario.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Perfil de Usuario</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gestiona tu información personal y configuración de cuenta.
        </p>
      </div>

      {user && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Información Personal
              </h3>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  Editar
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{user.nombre}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Apellido
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{user.apellido}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Correo Electrónico
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rol
                </label>
                <p className="mt-1 text-sm text-gray-900">{user.rol}</p>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Obra Asignada
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {user.obra?.nombre || 'No asignada'}
                </p>
              </div>
            </div>
            
            {isEditing && (
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  loading={loading}
                >
                  Guardar Cambios
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cambio de contraseña */}
      {user && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Seguridad
              </h3>
              {!isChangingPassword && (
                <Button
                  onClick={() => setIsChangingPassword(true)}
                  variant="outline"
                  size="sm"
                >
                  Cambiar Contraseña
                </Button>
              )}
            </div>
            
            {isChangingPassword ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => {
                      setIsChangingPassword(false)
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      })
                    }}
                    variant="outline"
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    loading={loading}
                  >
                    Cambiar Contraseña
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Mantén tu cuenta segura cambiando tu contraseña regularmente.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Permisos por rol */}
      {user && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Permisos del Sistema
            </h3>
            
            <div className="space-y-3">
              {user.rol === 'COORDINACION' && (
                <>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Gestión completa de requerimientos</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Carga masiva de requerimientos XLSX</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Consulta de reportes y estadísticas</span>
                  </div>
                </>
              )}
              
              {user.rol === 'LOGISTICA' && (
                <>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Asignación de solicitudes de compra</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Gestión de órdenes de compra</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Auditoría de cambios</span>
                  </div>
                </>
              )}
              
              {user.rol === 'ALMACENERO' && (
                <>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Registro de entradas de materiales</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Registro de salidas de materiales</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Consulta de stock y kardex</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configuración de Notificaciones */}
      <NotificationConfig />
    </div>
  )
}