import { supabase } from '../lib/supabase';

export interface DashboardStats {
  requerimientosPendientes: number
  stockBajo: number
  entradasMes: number
  salidasMes: number
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    try {
      // Obtener requerimientos pendientes
      const { data: requerimientos, error: reqError } = await supabase
        .from('requerimientos')
        .select('id')
        .eq('estado', 'pendiente')
      
      if (reqError) throw reqError
      
      // Obtener stock bajo (cantidad < 10)
      const { data: stockBajo, error: stockError } = await supabase
        .from('stock_obra_material')
        .select('id')
        .lt('cantidad_actual', 10)
      
      if (stockError) throw stockError
      
      // Obtener entradas del mes actual
      const currentMonth = new Date()
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const { data: entradas, error: entradasError } = await supabase
        .from('entradas')
        .select('id')
        .gte('fecha_recepcion', firstDayOfMonth.toISOString())
      
      if (entradasError) throw entradasError
      
      // Obtener salidas del mes actual
      const { data: salidas, error: salidasError } = await supabase
        .from('salidas')
        .select('id')
        .gte('fecha_entrega', firstDayOfMonth.toISOString())
      
      if (salidasError) throw salidasError
      
      return {
        requerimientosPendientes: requerimientos?.length || 0,
        stockBajo: stockBajo?.length || 0,
        entradasMes: entradas?.length || 0,
        salidasMes: salidas?.length || 0
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
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
        .from('requerimientos')
        .select(`
          *,
          obra:obras(*),
          usuario:usuarios(*)
        `)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (reqError) throw reqError
      
      // Obtener entradas recientes (últimas 10)
      const { data: entradas, error: entradasError } = await supabase
        .from('entradas')
        .select(`
          *,
          obra:obras(*),
          material:materiales(*),
          usuario:usuarios(*)
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