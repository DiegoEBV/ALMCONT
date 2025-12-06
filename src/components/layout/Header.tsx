import React, { Fragment } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useNotificationContext } from '../../context/NotificationContext'
import { Menu, Transition } from '@headlessui/react'
import {
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  ChevronDownIcon,
  CheckIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const Header: React.FC = () => {
  const { user, signOut } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotificationContext()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      console.log('🔄 Header: Iniciando logout desde Header.tsx')
      await signOut()
      console.log('✅ Header: SignOut completado, navegando a login')
      navigate('/login')
    } catch (error) {
      console.error('❌ Header: Error al cerrar sesión:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <div className="h-2 w-2 rounded-full bg-green-400" />
      case 'error':
        return <div className="h-2 w-2 rounded-full bg-red-400" />
      case 'warning':
        return <div className="h-2 w-2 rounded-full bg-yellow-400" />
      default:
        return <div className="h-2 w-2 rounded-full bg-blue-400" />
    }
  }

  if (!user) return null

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Page Title */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Bienvenido, {user.nombre}
            </h2>
            <p className="text-sm text-gray-500">
              {user.rol} - {user.obra?.nombre || 'Sin obra asignada'}
            </p>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">

            {/* Notifications Menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md">
                <span className="sr-only">Ver notificaciones</span>
                <BellIcon className="h-6 w-6" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-96 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Marcar todo leído
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No tienes notificaciones
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <Menu.Item key={notification.id}>
                          {({ active }) => (
                            <div
                              className={`
                                ${active ? 'bg-gray-50' : ''}
                                ${!notification.read ? 'bg-blue-50/50' : ''}
                                relative px-4 py-3 hover:bg-gray-50 transition-colors duration-150 ease-in-out cursor-pointer group
                              `}
                              onClick={() => markAsRead(notification.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                  <div className="mt-1.5">
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                  <div>
                                    <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                                      {notification.title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                      {notification.message}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                      {/* Usamos una función segura para la fecha */}
                                      {new Date(notification.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(notification.id);
                                  }}
                                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  )}
                </Menu.Items>
              </Transition>
            </Menu>

            {/* User menu */}
            <Menu as="div" className="relative">
              <div>
                <Menu.Button className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 p-2">
                  <span className="sr-only">Abrir menú de usuario</span>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-700">
                      {user.nombre}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                </Menu.Button>
              </div>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate('/perfil')}
                        className={`
                          ${active ? 'bg-gray-100' : ''}
                          flex w-full items-center px-4 py-2 text-sm text-gray-700
                        `}
                      >
                        <UserIcon className="mr-3 h-4 w-4" />
                        Mi Perfil
                      </button>
                    )}
                  </Menu.Item>

                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate('/configuracion')}
                        className={`
                          ${active ? 'bg-gray-100' : ''}
                          flex w-full items-center px-4 py-2 text-sm text-gray-700
                        `}
                      >
                        <Cog6ToothIcon className="mr-3 h-4 w-4" />
                        Configuración
                      </button>
                    )}
                  </Menu.Item>

                  <div className="border-t border-gray-100" />

                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleSignOut}
                        className={`
                          ${active ? 'bg-gray-100' : ''}
                          flex w-full items-center px-4 py-2 text-sm text-gray-700
                        `}
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                        Cerrar Sesión
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header