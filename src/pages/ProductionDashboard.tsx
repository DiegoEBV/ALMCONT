import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs'
import { 
  Package, 
  Clock, 
  AlertTriangle, 
  Plus, 
  FileText, 
  CheckCircle, 
  XCircle,
  Bell,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from "@/hooks/useAuthHook";
import { requerimientosMaterialesService } from '@/services/requerimientosMateriales'
import { alertasService } from '@/services/alertas'
import type { RequerimientoMaterial, Alerta } from '@/types'
import { useNavigate } from 'react-router-dom'

interface DashboardStats {
  total: number
  pendientes: number
  enRevision: number
  aprobados: number
  rechazados: number
  atendidos: number
}

const ProductionDashboard: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pendientes: 0,
    enRevision: 0,
    aprobados: 0,
    rechazados: 0,
    atendidos: 0
  })
  const [recentRequirements, setRecentRequirements] = useState<RequerimientoMaterial[]>([])
  const [alerts, setAlerts] = useState<Alerta[]>([])
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async () => {
    if (!user?.id) return

    try {
      setRefreshing(true)

      // Obtener estadísticas de requerimientos
      const statsData = await requerimientosMaterialesService.getEstadisticas(user.id)
      setStats(statsData)

      // Obtener requerimientos recientes
      const requirements = await requerimientosMaterialesService.getByUsuario(user.id)
      setRecentRequirements(requirements.slice(0, 5)) // Solo los 5 más recientes

      // Obtener alertas
      const userAlerts = await alertasService.getByUsuario(user.id, 10)
      setAlerts(userAlerts)

      // Contar alertas no leídas
      const unreadCount = await alertasService.countNoLeidasByUsuario(user.id)
      setUnreadAlertsCount(unreadCount)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Error al cargar datos del dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleMarkAlertAsRead = async (alertId: string) => {
    try {
      await alertasService.marcarComoLeida(alertId)
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, leida: true } : alert
      ))
      setUnreadAlertsCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking alert as read:', error)
      toast.error('Error al marcar alerta como leída')
    }
  }

  const handleMarkAllAlertsAsRead = async () => {
    if (!user?.id) return

    try {
      await alertasService.marcarTodasComoLeidas(user.id)
      setAlerts(prev => prev.map(alert => ({ ...alert, leida: true })))
      setUnreadAlertsCount(0)
      toast.success('Todas las alertas marcadas como leídas')
    } catch (error) {
      console.error('Error marking all alerts as read:', error)
      toast.error('Error al marcar todas las alertas como leídas')
    }
  }

  const getStatusColor = (estado: RequerimientoMaterial['estado']) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800'
      case 'EN_REVISION':
        return 'bg-blue-100 text-blue-800'
      case 'APROBADO':
        return 'bg-green-100 text-green-800'
      case 'RECHAZADO':
        return 'bg-red-100 text-red-800'
      case 'ATENDIDO':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAlertIcon = (tipo: Alerta['tipo']) => {
    switch (tipo) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Bell className="h-4 w-4 text-blue-500" />
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Producción</h1>
          <p className="text-gray-600 mt-1">Gestión de requerimientos de materiales</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchDashboardData}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => navigate('/produccion/crear-requerimiento')}>
          <CardContent className="flex items-center p-6">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Nuevo Requerimiento</h3>
              <p className="text-gray-600">Crear solicitud de materiales</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => navigate('/produccion/seguimiento')}>
          <CardContent className="flex items-center p-6">
            <div className="bg-green-100 p-3 rounded-full mr-4">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Mis Requerimientos</h3>
              <p className="text-gray-600">Ver estado de solicitudes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requerimientos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Todos los requerimientos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">En espera de revisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.aprobados}</div>
            <p className="text-xs text-muted-foreground">Listos para atender</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.atendidos}</div>
            <p className="text-xs text-muted-foreground">Completados</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="requirements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requirements">Requerimientos Recientes</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            Alertas
            {unreadAlertsCount > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {unreadAlertsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requerimientos Recientes</CardTitle>
              <CardDescription>
                Últimos requerimientos de materiales creados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentRequirements.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay requerimientos recientes</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => navigate('/produccion/crear-requerimiento')}
                  >
                    Crear Primer Requerimiento
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentRequirements.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{req.numero_requerimiento}</h4>
                          <Badge className={getStatusColor(req.estado)}>
                            {req.estado}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Obra: {req.obra?.nombre || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Fecha: {new Date(req.fecha_solicitud).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {req.detalles?.length || 0} materiales
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="text-center pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/produccion/seguimiento')}
                    >
                      Ver Todos los Requerimientos
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Alertas del Sistema</CardTitle>
                <CardDescription>
                  Notificaciones y actualizaciones importantes
                </CardDescription>
              </div>
              {unreadAlertsCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMarkAllAlertsAsRead}
                >
                  Marcar Todas como Leídas
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay alertas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        alert.leida ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      {getAlertIcon(alert.tipo)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{alert.titulo}</h4>
                          {!alert.leida && (
                            <Badge variant="secondary" className="text-xs">
                              Nueva
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{alert.mensaje}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.fecha_creacion).toLocaleString()}
                        </p>
                      </div>
                      {!alert.leida && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleMarkAlertAsRead(alert.id)}
                        >
                          Marcar como leída
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProductionDashboard