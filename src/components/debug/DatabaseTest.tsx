import React, { useEffect, useState } from 'react'
import { localDB } from '../../lib/localDB'

interface DatabaseStats {
  solicitudes: number
  requerimientos: number
  materiales: number
  rqSc: number
  sampleSolicitudes: any[]
}

export default function DatabaseTest() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        console.log('🔍 Iniciando prueba de base de datos...')
        
        // Esperar un poco para asegurar que la DB esté inicializada
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const solicitudes = await localDB.get('solicitudes_compra')
        const requerimientos = await localDB.get('requerimientos')
        const materiales = await localDB.get('materiales')
        const rqSc = await localDB.get('rq_sc')
        
        console.log('📊 Estadísticas de DB:')
        console.log('- Solicitudes:', solicitudes.length)
        console.log('- Requerimientos:', requerimientos.length)
        console.log('- Materiales:', materiales.length)
        console.log('- RQ-SC:', rqSc.length)
        
        const sampleSolicitudes = solicitudes.slice(0, 5).map(s => ({
          id: s.id,
          numero_sc: s.numero_sc,
          proveedor: s.proveedor,
          estado: s.estado
        }))
        
        console.log('📋 Muestra de solicitudes:', sampleSolicitudes)
        
        setStats({
          solicitudes: solicitudes.length,
          requerimientos: requerimientos.length,
          materiales: materiales.length,
          rqSc: rqSc.length,
          sampleSolicitudes
        })
        
        setLoading(false)
      } catch (err) {
        console.error('❌ Error en prueba de DB:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setLoading(false)
      }
    }
    
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-bold text-yellow-800">🔄 Cargando datos de prueba...</h3>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="font-bold text-red-800">❌ Error en base de datos</h3>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-bold text-gray-800">⚠️ No hay datos disponibles</h3>
      </div>
    )
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="font-bold text-green-800 mb-3">✅ Estado de la Base de Datos</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.solicitudes}</div>
          <div className="text-sm text-gray-600">Solicitudes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.requerimientos}</div>
          <div className="text-sm text-gray-600">Requerimientos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.materiales}</div>
          <div className="text-sm text-gray-600">Materiales</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.rqSc}</div>
          <div className="text-sm text-gray-600">Relaciones RQ-SC</div>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold text-gray-800 mb-2">Muestra de Solicitudes de Compra:</h4>
        <div className="space-y-1">
          {stats.sampleSolicitudes.map((sc) => (
            <div key={sc.id} className="text-sm bg-white p-2 rounded border">
              <span className="font-mono text-blue-600">{sc.numero_sc}</span> - 
              <span className="text-gray-600">{sc.proveedor}</span> - 
              <span className={`px-2 py-1 rounded text-xs ${
                sc.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                sc.estado === 'ASIGNADA' ? 'bg-blue-100 text-blue-800' :
                sc.estado === 'ATENDIDA' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {sc.estado}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}