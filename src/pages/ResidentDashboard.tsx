import React, { useEffect, useState, useCallback } from 'react'
import { ApprovalWorkflow } from '../components/ApprovalWorkflow'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { RequerimientoMaterial } from '../types'
import { Button } from '../components/ui/Button'
import LoadingOverlay from '../components/ui/LoadingOverlay'
import { toast } from 'sonner'
import { requerimientosMaterialesService } from '../services/requerimientosMateriales'

const ResidentDashboard: React.FC = () => {
  const { user } = useAuth()
  const [reqs, setReqs] = useState<RequerimientoMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadPendientes = useCallback(async () => {
    try {
      setLoading(true)
      const data = await requerimientosMaterialesService.getAll()
      const filtered = (data || []).filter(r => r.estado === 'PENDIENTE' && (!user?.obra_id || r.obra_id === user.obra_id))
      setReqs(filtered)
    } catch (e) {
      console.error('Error cargando requerimientos pendientes:', e)
      toast.error('Error cargando requerimientos de Producción')
    } finally {
      setLoading(false)
    }
  }, [user?.obra_id])

  useEffect(() => { loadPendientes() }, [loadPendientes])

  const enviarAprobacion = async (req: RequerimientoMaterial) => {
    try {
      setSubmitting(req.id)
      const { error } = await supabase
        .from('aprobaciones')
        .insert({
          tipo: 'solicitud_compra',
          referencia_id: req.id,
          nivel_aprobacion: 1,
          solicitante_id: user?.id || null,
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString(),
          comentarios: 'Revisión del Residente',
          datos_solicitud: {
            numero_requerimiento: (req as any).codigo,
            prioridad: (req as any).prioridad || 'MEDIA',
            departamento_origen: 'PRODUCCION',
            solicitante: (req as any).solicitante?.nombre || ''
          }
        })
      if (error) throw error
      toast.success('Requerimiento enviado a aprobación')
      await loadPendientes()
    } catch (e) {
      console.error('Error enviando a aprobación:', e)
      toast.error('No se pudo enviar a aprobación')
    } finally {
      setSubmitting(null)
    }
  }

  const toggleDetalle = async (req: RequerimientoMaterial) => {
    try {
      if (expandedId === req.id) {
        setExpandedId(null)
        return
      }
      setExpandedId(req.id)
      if (!(req as any).detalles || (req as any).detalles.length === 0) {
        const full = await requerimientosMaterialesService.getById(req.id)
        if (full) {
          setReqs(prev => prev.map(r => (r.id === req.id ? full : r)))
        }
      }
    } catch {}
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel del Residente</h1>
        <p className="text-gray-600">Revise y apruebe los requerimientos generados por Producción</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Requerimientos de Producción pendientes</h2>
        {loading ? (
          <LoadingOverlay title="Cargando requerimientos" message="Obteniendo pendientes de Producción" />
        ) : reqs.length === 0 ? (
          <p className="text-gray-600">No hay requerimientos pendientes.</p>
        ) : (
          <div className="space-y-3">
            {reqs.map(req => (
              <div key={req.id} className="border rounded-md p-4">
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold">{(req as any).codigo || 'REQ'}</div>
                    <div className="text-sm text-gray-600">Solicitante: {(req as any).solicitante?.nombre || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Prioridad: {(req as any).prioridad || 'MEDIA'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => toggleDetalle(req)}>
                      {expandedId === req.id ? 'Ocultar Detalle' : 'Ver Detalle'}
                    </Button>
                    <Button onClick={() => enviarAprobacion(req)} disabled={!!submitting}>
                      {submitting === req.id ? 'Enviando...' : 'Enviar a Aprobación'}
                    </Button>
                  </div>
                </div>
                {expandedId === req.id && (
                  <div className="mt-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="py-2 pr-4">Material</th>
                            <th className="py-2 pr-4">Cantidad</th>
                            <th className="py-2 pr-4">Unidad</th>
                            <th className="py-2">Comentarios</th>
                          </tr>
                        </thead>
                        <tbody>
                          {((req as any).detalles || []).map((d: any, idx: number) => (
                            <tr key={idx} className="border-t">
                              <td className="py-2 pr-4">{d.material?.nombre || 'Material'}</td>
                              <td className="py-2 pr-4">{d.cantidad}</td>
                              <td className="py-2 pr-4">{d.material?.unidad || d.unidad || ''}</td>
                              <td className="py-2">{d.comentarios || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ApprovalWorkflow />
    </div>
  )
}

export default ResidentDashboard
