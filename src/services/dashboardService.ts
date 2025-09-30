import { supabase } from '../lib/supabase';

export interface DashboardStats {
  requerimientosPendientes: number
  stockBajo: number
  entradasMes: number
  salidasMes: number
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    console.log('📊 DashboardService: Iniciando getStats...')
    console.log('📊 Supabase client configurado:', !!supabase)
    
    try {
      // Obtener requerimientos pendientes
      console.log('📊 Consultando requerimientos pendientes...')
      const { data: requerimientos, error: reqError } = await supabase
        .from('requerimiento_materiales')
        .select('id, estado')
        .eq('estado', 'PENDIENTE')
      
      if (reqError) {
        console.error('❌ Error consultando requerimientos:', reqError)
        console.error('❌ Detalles del error:', JSON.stringify(reqError, null, 2))
      } else {
        console.log('✅ Requerimientos obtenidos:', requerimientos?.length || 0)
        console.log('✅ Datos requerimientos:', requerimientos)
      }

      // Obtener stock bajo (menos de 10 unidades)
      console.log('📊 Consultando stock bajo...')
      const { data: stockBajo, error: stockError } = await supabase
        .from('stock_obra_material')
        .select('id, stock_actual')
        .lt('stock_actual', 10)
      
      if (stockError) {
        console.error('❌ Error consultando stock:', stockError)
        console.error('❌ Detalles del error:', JSON.stringify(stockError, null, 2))
      } else {
        console.log('✅ Items con stock bajo:', stockBajo?.length || 0)
        console.log('✅ Datos stock bajo:', stockBajo)
      }

      // Obtener entradas del mes actual
      console.log('📊 Consultando entradas del mes...')
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)
      console.log('📊 Fecha inicio mes:', inicioMes.toISOString())
      
      const { data: entradas, error: entradasError } = await supabase
        .from('entradas')
        .select('id, created_at')
        .gte('created_at', inicioMes.toISOString())
      
      if (entradasError) {
        console.error('❌ Error consultando entradas:', entradasError)
        console.error('❌ Detalles del error:', JSON.stringify(entradasError, null, 2))
      } else {
        console.log('✅ Entradas del mes:', entradas?.length || 0)
        console.log('✅ Datos entradas:', entradas)
      }

      // Obtener salidas del mes actual
      console.log('📊 Consultando salidas del mes...')
      const { data: salidas, error: salidasError } = await supabase
        .from('salidas')
        .select('id, created_at')
        .gte('created_at', inicioMes.toISOString())
      
      if (salidasError) {
        console.error('❌ Error consultando salidas:', salidasError)
        console.error('❌ Detalles del error:', JSON.stringify(salidasError, null, 2))
      } else {
        console.log('✅ Salidas del mes:', salidas?.length || 0)
        console.log('✅ Datos salidas:', salidas)
      }

      const stats = {
        requerimientosPendientes: requerimientos?.length || 0,
        stockBajo: stockBajo?.length || 0,
        entradasMes: entradas?.length || 0,
        salidasMes: salidas?.length || 0
      }
      
      console.log('📊 Stats finales calculadas:', stats)
      
      return stats
    } catch (error) {
      console.error('❌ Error general en getStats:', error)
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack available')
      return {
        requerimientosPendientes: 0,
        stockBajo: 0,
        entradasMes: 0,
        salidasMes: 0
      }
    }
  },

  async getRecentActivity() {
    try {
      // Obtener requerimientos recientes (últimos 10)
      const { data: requerimientos, error: reqError } = await supabase
        .from('requerimiento_materiales')
        .select(`
          id,
          codigo,
          estado,
          comentarios,
          created_at,
          fecha_solicitud
        `)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (reqError) throw reqError
      
      // Obtener entradas recientes (últimas 10) con items
      const { data: entradas, error: entradasError } = await supabase
        .from('entradas')
        .select(`
          id,
          numero_entrada,
          proveedor,
          created_at,
          recibido_por
        `)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (entradasError) throw entradasError
      
      return {
        requerimientos: requerimientos || [],
        entradas: entradas || []
      }
    } catch (error) {
      console.error('Error obteniendo actividad reciente:', error)
      return {
        requerimientos: [],
        entradas: []
      }
    }
  },

  isUsingMockData: () => false // Ahora usando Supabase
}