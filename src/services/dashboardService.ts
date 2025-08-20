import { localDB } from '../lib/localDB';

export interface DashboardStats {
  requerimientosPendientes: number
  stockBajo: number
  entradasMes: number
  salidasMes: number
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    try {
      return localDB.getStats()
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
      return localDB.getRecentActivity()
    } catch (error) {
      console.error('Error obteniendo actividad reciente:', error)
      return {
        requerimientos: [],
        entradas: []
      }
    }
  },

  isUsingMockData: () => true // Siempre usando datos locales
}