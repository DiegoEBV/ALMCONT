import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { RequerimientoMaterial, DetalleRequerimiento } from '../types'
import { Button } from '../components/ui/Button'
import LoadingOverlay from '../components/ui/LoadingOverlay'
import { toast } from 'sonner'
import { requerimientosMaterialesService } from '../services/requerimientosMateriales'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileText,
  AlertCircle
} from 'lucide-react'
import { Textarea } from '../components/ui/textarea'

const ResidentDashboard: React.FC = () => {
  const { user } = useAuth()
  const [reqs, setReqs] = useState<RequerimientoMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [commentEdits, setCommentEdits] = useState<Record<string, string>>({})

  const loadRequerimientos = useCallback(async () => {
    try {
      setLoading(true)
      // En un escenario real, filtraríamos por obra del residente si aplica
      const data = await requerimientosMaterialesService.getAll()

      // Filtrar requerimientos relevantes para el residente
      // Principalmente PENDIENTES para aprobar, pero también mostrar historial
      const filtered = data.filter(r =>
        (!user?.obra_id || r.obra_id === user.obra_id)
      )

      setReqs(filtered)
    } catch (e) {
      console.error('Error cargando requerimientos:', e)
      toast.error('Error cargando requerimientos')
    } finally {
      setLoading(false)
    }
  }, [user?.obra_id])

  useEffect(() => { loadRequerimientos() }, [loadRequerimientos])

  const handleStatusChange = async (req: RequerimientoMaterial, newStatus: 'APROBADO' | 'RECHAZADO') => {
    try {
      setProcessingId(req.id)

      // Usar el nuevo método de aprobación/rechazo
      const accion = newStatus === 'APROBADO' ? 'APROBAR' : 'RECHAZAR'
      await requerimientosMaterialesService.aprobarRechazar(req.id, accion)

      toast.success(`Requerimiento ${newStatus === 'APROBADO' ? 'aprobado' : 'rechazado'} exitosamente`)
      await loadRequerimientos()

      if (expandedId === req.id) setExpandedId(null)

    } catch (e: any) {
      console.error('Error actualizando estado:', e)
      const errorMessage = e?.message || 'No se pudo actualizar el estado del requerimiento'
      toast.error(errorMessage)
    } finally {
      setProcessingId(null)
    }
  }

  const toggleDetalle = async (req: RequerimientoMaterial) => {
    if (expandedId === req.id) {
      setExpandedId(null)
      return
    }

    setExpandedId(req.id)

    // Si no tiene detalles cargados (aunque getAll ya los trae), podríamos cargarlos aquí
    // Pero asumiendo que getAll trae todo:
    if (!req.detalles) {
      const full = await requerimientosMaterialesService.getById(req.id)
      if (full) {
        setReqs(prev => prev.map(r => (r.id === req.id ? full : r)))
      }
    }
  }

  const handleCommentChange = (detalleId: string, value: string) => {
    setCommentEdits(prev => ({ ...prev, [detalleId]: value }))
  }

  const saveComment = async (detalleId: string) => {
    try {
      const comment = commentEdits[detalleId]
      if (comment === undefined) return // No changes

      await requerimientosMaterialesService.updateDetalle(detalleId, { comentarios: comment })

      // Actualizar estado local
      setReqs(prev => prev.map(req => ({
        ...req,
        detalles: req.detalles?.map(d =>
          d.id === detalleId ? { ...d, comentarios: comment } : d
        )
      })))

      toast.success('Comentario actualizado')

      // Limpiar estado de edición para este item
      setCommentEdits(prev => {
        const newState = { ...prev }
        delete newState[detalleId]
        return newState
      })

    } catch (e) {
      console.error('Error guardando comentario:', e)
      toast.error('Error al guardar comentario')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDIENTE': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pendiente</Badge>
      case 'APROBADO': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Aprobado</Badge>
      case 'RECHAZADO': return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rechazado</Badge>
      case 'ATENDIDO': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Atendido</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const pendientes = reqs.filter(r => r.estado === 'PENDIENTE')
  const historial = reqs.filter(r => r.estado !== 'PENDIENTE')

  const RequirementCard = ({ req }: { req: RequerimientoMaterial }) => (
    <Card className="mb-4 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-lg text-gray-900">{req.codigo || 'S/N'}</span>
              {getStatusBadge(req.estado)}
              {req.prioridad === 'URGENTE' && (
                <Badge variant="destructive" className="animate-pulse">URGENTE</Badge>
              )}
            </div>
            <div className="text-sm text-gray-600 flex flex-col sm:flex-row sm:gap-4">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(req.fecha_solicitud).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Solicitante: {req.solicitante?.nombre || 'Desconocido'}
              </span>
            </div>
            {req.comentarios && (
              <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                <span className="font-semibold">Nota:</span> {req.comentarios}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="ghost"
              onClick={() => toggleDetalle(req)}
              className="flex-1 md:flex-none"
            >
              {expandedId === req.id ? 'Ocultar' : 'Ver Detalle'}
              {expandedId === req.id ? <ChevronUp className="ml-2 w-4 h-4" /> : <ChevronDown className="ml-2 w-4 h-4" />}
            </Button>

            {req.estado === 'PENDIENTE' && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 flex-1 md:flex-none"
                  onClick={() => handleStatusChange(req, 'RECHAZADO')}
                  disabled={!!processingId}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                  onClick={() => handleStatusChange(req, 'APROBADO')}
                  disabled={!!processingId}
                >
                  {processingId === req.id ? 'Procesando...' : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {expandedId === req.id && (
          <div className="border-t bg-gray-50 p-4 animate-in slide-in-from-top-2 duration-200">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <PackageIcon className="w-4 h-4" />
              Materiales Solicitados
            </h4>
            <div className="space-y-3">
              {req.detalles?.map((detalle, idx) => (
                <div key={detalle.id || idx} className="bg-white p-3 rounded border shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-900">{detalle.material?.nombre}</div>
                      <div className="text-xs text-gray-500 font-mono">{detalle.material?.codigo}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {detalle.cantidad} <span className="text-xs font-normal text-gray-500">{detalle.material?.unidad}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Comentarios / Observaciones
                    </label>
                    <div className="flex gap-2">
                      <Textarea
                        className="min-h-[60px] text-sm resize-none"
                        placeholder="Agregar observaciones para logística..."
                        value={commentEdits[detalle.id] !== undefined ? commentEdits[detalle.id] : (detalle.comentarios || '')}
                        onChange={(e) => handleCommentChange(detalle.id, e.target.value)}
                        disabled={req.estado !== 'PENDIENTE'}
                      />
                      {req.estado === 'PENDIENTE' && commentEdits[detalle.id] !== undefined && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-auto"
                          onClick={() => saveComment(detalle.id)}
                        >
                          Guardar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Icon component helper
  const PackageIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 21.29 7" />
      <polyline points="12 22 12 12" />
    </svg>
  )

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Panel del Residente</h1>
        <p className="text-gray-500 mt-1">Gestión y aprobación de requerimientos de obra</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingOverlay title="Cargando..." />
        </div>
      ) : (
        <Tabs defaultValue="pendientes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="pendientes" className="text-base">
              Pendientes de Aprobación
              {pendientes.length > 0 && (
                <Badge variant="destructive" className="ml-2 rounded-full px-2 py-0.5 text-xs">
                  {pendientes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="historial" className="text-base">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="pendientes" className="space-y-4">
            {pendientes.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-medium text-gray-900">Todo al día</h3>
                <p className="text-gray-500">No hay requerimientos pendientes de revisión.</p>
              </div>
            ) : (
              pendientes.map(req => <RequirementCard key={req.id} req={req} />)
            )}
          </TabsContent>

          <TabsContent value="historial" className="space-y-4">
            {historial.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-medium text-gray-900">Sin historial</h3>
                <p className="text-gray-500">No hay requerimientos procesados anteriormente.</p>
              </div>
            ) : (
              historial.map(req => <RequirementCard key={req.id} req={req} />)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default ResidentDashboard
