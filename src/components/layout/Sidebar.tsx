import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  HomeIcon,
  DocumentTextIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  CubeIcon,
  UserIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  MapPinIcon,
  ClipboardDocumentCheckIcon,
  ArrowUturnLeftIcon,
  DocumentDuplicateIcon,
  PresentationChartBarIcon,
  TruckIcon as LogisticsIcon,
  BuildingStorefrontIcon,
  ChartPieIcon,
  BuildingOfficeIcon,
  UsersIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { UserRole } from '../../types'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  roles: UserRole[]
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    roles: ['COORDINACION', 'LOGISTICA', 'ALMACENERO']
  },
  {
    name: 'Panel Ejecutivo',
    href: '/oficina/dashboard',
    icon: PresentationChartBarIcon,
    roles: ['COORDINACION']
  },
  {
    name: 'Requerimientos',
    href: '/oficina/requerimientos',
    icon: DocumentTextIcon,
    roles: ['COORDINACION']
  },
  {
    name: 'Panel Logística',
    href: '/logistica/dashboard',
    icon: LogisticsIcon,
    roles: ['LOGISTICA']
  },
  {
    name: 'Solicitudes de Compra',
    href: '/logistica/solicitudes-compra',
    icon: ClipboardDocumentListIcon,
    roles: ['LOGISTICA']
  },
  {
    name: 'Órdenes de Compra',
    href: '/logistica/ordenes-compra',
    icon: TruckIcon,
    roles: ['LOGISTICA']
  },
  {
    name: 'Panel Almacén',
    href: '/almacen/dashboard',
    icon: BuildingStorefrontIcon,
    roles: ['ALMACENERO']
  },
  {
    name: 'Entradas',
    href: '/almacen/entradas',
    icon: ArrowRightOnRectangleIcon,
    roles: ['ALMACENERO']
  },
  {
    name: 'Salidas',
    href: '/almacen/salidas',
    icon: ArrowLeftOnRectangleIcon,
    roles: ['ALMACENERO']
  },
  {
    name: 'Stock/Kardex',
    href: '/stock/kardex',
    icon: CubeIcon,
    roles: ['COORDINACION', 'LOGISTICA', 'ALMACENERO']
  },
  {
    name: 'Flujo de Aprobaciones',
    href: '/advanced/approvals',
    icon: CheckCircleIcon,
    roles: ['COORDINACION', 'LOGISTICA']
  },
  {
    name: 'Configuración de Reorden',
    href: '/advanced/reorder',
    icon: ArrowPathIcon,
    roles: ['LOGISTICA', 'ALMACENERO']
  },
  {
    name: 'Gestión de Ubicaciones',
    href: '/advanced/locations',
    icon: MapPinIcon,
    roles: ['ALMACENERO']
  },
  {
    name: 'Inventario Cíclico',
    href: '/advanced/cyclic-inventory',
    icon: ClipboardDocumentCheckIcon,
    roles: ['ALMACENERO']
  },
  {
    name: 'Gestión de Devoluciones',
    href: '/advanced/returns',
    icon: ArrowUturnLeftIcon,
    roles: ['ALMACENERO', 'LOGISTICA']
  },
  {
    name: 'Reportes',
    href: '/reportes',
    icon: ChartBarIcon,
    roles: ['COORDINACION', 'LOGISTICA']
  },
  {
    name: 'Analytics Avanzado',
    href: '/analytics',
    icon: ChartPieIcon,
    roles: ['COORDINACION', 'LOGISTICA', 'ALMACENERO']
  },
  {
    name: 'Templates',
    href: '/templates',
    icon: DocumentDuplicateIcon,
    roles: ['COORDINACION', 'LOGISTICA', 'ALMACENERO']
  },
  {
    name: 'Perfil',
    href: '/perfil',
    icon: UserIcon,
    roles: ['COORDINACION', 'LOGISTICA', 'ALMACENERO']
  },
  {
    name: 'Administración de Obras',
    href: '/admin/obras',
    icon: BuildingOfficeIcon,
    roles: ['COORDINACION']
  },
  {
    name: 'Gestión de Usuarios',
    href: '/admin/usuarios',
    icon: UsersIcon,
    roles: ['COORDINACION']
  }
]

const Sidebar: React.FC = () => {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return null

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.rol)
  )

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">
          Sistema de Almacén
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {user.obra?.nombre || 'Sin obra asignada'}
        </p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.nombre}
            </p>
            <p className="text-xs text-gray-500">
              {user.rol}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0
                  ${
                    isActive
                      ? 'text-blue-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }
                `}
                aria-hidden="true"
              />
              {item.name}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          © 2024 Sistema de Almacén
        </p>
      </div>
    </div>
  )
}

export default Sidebar