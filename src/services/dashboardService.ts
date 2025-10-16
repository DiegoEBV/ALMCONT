import { supabase } from '../lib/supabase';
import { localAuth } from './localAuth';

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
      // Obtener usuario actual para filtrar por obra
      const currentUser = localAuth.getCurrentUser()
      const userObraId = currentUser?.obra_id
      console.log('📊 Usuario actual obra_id:', userObraId)
      
      // Obtener requerimientos pendientes filtrados por obra
      console.log('📊 Consultando requerimientos pendientes...')
      let requerimientosQuery = supabase
        .from('requerimiento_materiales')
        .select('id, estado')
        .eq('estado', 'PENDIENTE')
      
      // Filtrar por obra si el usuario tiene una asignada
      if (userObraId) {
        requerimientosQuery = requerimientosQuery.eq('obra_id', userObraId)
        console.log('📊 Filtrando requerimientos por obra:', userObraId)
      }
      
      const { data: requerimientos, error: reqError } = await requerimientosQuery
      
      if (reqError) {
        console.error('❌ Error consultando requerimientos:', reqError)
        console.error('❌ Detalles del error:', JSON.stringify(reqError, null, 2))
      } else {
        console.log('✅ Requerimientos obtenidos:', requerimientos?.length || 0)
        console.log('✅ Datos requerimientos:', requerimientos)
      }

      // Obtener stock bajo (menos de 10 unidades) filtrado por obra
      console.log('📊 Consultando stock bajo...')
      let stockQuery = supabase
        .from('stock_obra_material')
        .select('id, stock_actual')
        .lt('stock_actual', 10)
      
      // Filtrar por obra si el usuario tiene una asignada
      if (userObraId) {
        stockQuery = stockQuery.eq('obra_id', userObraId)
        console.log('📊 Filtrando stock por obra:', userObraId)
      }
      
      const { data: stockBajo, error: stockError } = await stockQuery
      
      if (stockError) {
        console.error('❌ Error consultando stock:', stockError)
        console.error('❌ Detalles del error:', JSON.stringify(stockError, null, 2))
      } else {
        console.log('✅ Items con stock bajo:', stockBajo?.length || 0)
        console.log('✅ Datos stock bajo:', stockBajo)
      }

      // Obtener entradas del mes actual filtradas por obra
      console.log('📊 Consultando entradas del mes...')
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)
      console.log('📊 Fecha inicio mes:', inicioMes.toISOString())
      
      let entradasQuery = supabase
        .from('entradas')
        .select('id, created_at')
        .gte('created_at', inicioMes.toISOString())
      
      // Filtrar por obra si el usuario tiene una asignada
      if (userObraId) {
        entradasQuery = entradasQuery.eq('obra_id', userObraId)
        console.log('📊 Filtrando entradas por obra:', userObraId)
      }
      
      const { data: entradas, error: entradasError } = await entradasQuery
      
      if (entradasError) {
        console.error('❌ Error consultando entradas:', entradasError)
        console.error('❌ Detalles del error:', JSON.stringify(entradasError, null, 2))
      } else {
        console.log('✅ Entradas del mes:', entradas?.length || 0)
        console.log('✅ Datos entradas:', entradas)
      }

      // Obtener salidas del mes actual filtradas por obra
      console.log('📊 Consultando salidas del mes...')
      let salidasQuery = supabase
        .from('salidas')
        .select('id, created_at')
        .gte('created_at', inicioMes.toISOString())
      
      // Filtrar por obra si el usuario tiene una asignada
      if (userObraId) {
        salidasQuery = salidasQuery.eq('obra_id', userObraId)
        console.log('📊 Filtrando salidas por obra:', userObraId)
      }
      
      const { data: salidas, error: salidasError } = await salidasQuery
      
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
      // Obtener usuario actual para filtrar por obra
      const currentUser = localAuth.getCurrentUser()
      const userObraId = currentUser?.obra_id
      console.log('📊 Filtrando actividad reciente por obra:', userObraId)
      
      // Obtener requerimientos recientes (últimos 10) filtrados por obra
      let requerimientosQuery = supabase
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
      
      // Filtrar por obra si el usuario tiene una asignada
      if (userObraId) {
        requerimientosQuery = requerimientosQuery.eq('obra_id', userObraId)
      }
      
      const { data: requerimientos, error: reqError } = await requerimientosQuery
      
      if (reqError) throw reqError
      
      // Obtener entradas recientes (últimas 10) filtradas por obra
      let entradasQuery = supabase
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
      
      // Filtrar por obra si el usuario tiene una asignada
      if (userObraId) {
        entradasQuery = entradasQuery.eq('obra_id', userObraId)
      }
      
      const { data: entradas, error: entradasError } = await entradasQuery
      
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