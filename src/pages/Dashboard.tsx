import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { dashboardService, DashboardStats } from '../services/dashboardService'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { Requerimiento, Entrada } from '../types'
import DatabaseTest from '../components/debug/DatabaseTest'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    requerimientosPendientes: 0,
    stockBajo: 0,
    entradasMes: 0,
    salidasMes: 0
  })
  const [loading, setLoading] = useState(true)
  const [usingMockData, setUsingMockData] = useState(false)
  const [recentActivity, setRecentActivity] = useState<{
    requerimientos: Array<{
      id: number;
      codigo: string;
      descripcion: string;
      estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
      fecha_creacion: string;
    }>;
    entradas: Array<{
      id: number;
      material?: {
        nombre: string;
      };
      cantidad: number;
      usuario?: {
        nombre: string;
      };
      fecha_entrada: string;
    }>;
  }>({
    requerimientos: [],
    entradas: []
  })

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const [statsData, activityData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getRecentActivity()
        ])
        setStats(statsData)
        setUsingMockData(dashboardService.isUsingMockData())
        setRecentActivity({
          requerimientos: activityData.requerimientos.map((req: Requerimiento & { 
            created_at?: string;
            fecha_requerimiento?: string;
            observaciones?: string;
          }) => ({
            id: Number(req.id),
            codigo: String(req.codigo || req.id),
            descripcion: String(req.descripcion || req.observaciones || 'Sin descripción'),
            estado: req.estado as 'PENDIENTE' | 'APROBADO' | 'RECHAZADO',
            fecha_creacion: String(req.created_at || req.fecha_requerimiento)
          })),
          entradas: activityData.entradas.map((entrada: Entrada & { 
            created_at?: string;
            fecha_entrada?: string;
            usuario_responsable?: string;
          }) => ({
            id: Number(entrada.id) || 0,
            material: { nombre: entrada.material?.nombre || 'Material desconocido' },
            cantidad: Number(entrada.cantidad_recibida) || 0,
            usuario: { nombre: entrada.usuario_responsable || 'N/A' },
            fecha_entrada: String(entrada.created_at || entrada.fecha_entrada)
          }))
        })
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen general del sistema de almacén</p>
      </div>

      {/* Componente de prueba de base de datos */}
      <DatabaseTest />

      {/* Indicador de datos mock */}
      {usingMockData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">
                Modo de Demostración
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Se están mostrando datos de la base de datos local.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Requerimientos Pendientes</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {loading ? '...' : stats.requerimientosPendientes}
          </p>
          <p className="text-sm text-gray-500 mt-1">Requieren atención</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Stock Bajo</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {loading ? '...' : stats.stockBajo}
          </p>
          <p className="text-sm text-gray-500 mt-1">Materiales &lt; 10 unidades</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Entradas del Mes</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {loading ? '...' : stats.entradasMes}
          </p>
          <p className="text-sm text-gray-500 mt-1">Ingresos registrados</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Salidas del Mes</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {loading ? '...' : stats.salidasMes}
          </p>
          <p className="text-sm text-gray-500 mt-1">Entregas realizadas</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Usuario</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Nombre</p>
            <p className="text-lg text-gray-900">{user?.nombre}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Rol</p>
            <p className="text-lg text-gray-900">{user?.rol}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-lg text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Obra</p>
            <p className="text-lg text-gray-900">{user?.obra?.nombre || 'No asignada'}</p>
          </div>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Últimos Requerimientos</h3>
          {loading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : recentActivity.requerimientos.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.requerimientos.map((req: {
                id: number;
                codigo: string;
                descripcion: string;
                estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
                fecha_creacion: string;
              }, index: number) => (
                <div key={`req-${req.id}-${index}`} className="border-l-4 border-blue-500 pl-3">
                  <p className="font-medium text-sm">{req.codigo}</p>
                  <p className="text-gray-600 text-sm">{req.descripcion}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className={`px-2 py-1 text-xs rounded ${
                      req.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                      req.estado === 'APROBADO' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {req.estado}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(req.fecha_creacion).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay requerimientos recientes</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Últimas Entradas</h3>
          {loading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : recentActivity.entradas.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.entradas.map((entrada: {
                id: number;
                material?: {
                  nombre: string;
                };
                cantidad: number;
                usuario?: {
                  nombre: string;
                };
                fecha_entrada: string;
              }, index: number) => (
                <div key={`entrada-${entrada.id}-${index}`} className="border-l-4 border-green-500 pl-3">
                  <p className="font-medium text-sm">{entrada.material?.nombre}</p>
                  <p className="text-gray-600 text-sm">Cantidad: {entrada.cantidad}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">
                      Por: {entrada.usuario?.nombre}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(entrada.fecha_entrada).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay entradas recientes</p>
          )}
        </div>
      </div>
    </div>
  )
}