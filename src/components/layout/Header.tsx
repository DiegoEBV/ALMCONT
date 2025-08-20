import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Menu, Transition } from '@headlessui/react'
import {
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'

const Header: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [notifications] = useState(0) // TODO: Implementar notificaciones reales

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  if (!user) return null

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Page Title - Se puede personalizar por página */}
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
            {/* Notifications */}
            <button
              type="button"
              className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
            >
              <span className="sr-only">Ver notificaciones</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
              {notifications > 0 && (
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
              )}
            </button>

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