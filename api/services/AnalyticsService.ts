import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Removed database type references as they're not available

export interface KPIData {
  totalWorks: number;
  activeWorks: number;
  totalMaterials: number;
  totalStock: number;
  pendingRequests: number;
  completedOrders: number;
  averageProcessingTime: number;
  stockTurnover: number;
}

export interface WorkComparison {
  workId: string;
  workName: string;
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  totalMaterials: number;
  stockValue: number;
  efficiency: number;
  lastActivity: string;
}

export interface WarehouseWorkerEfficiency {
  workerId: string;
  workerName: string;
  workerEmail: string;
  totalRequests: number;
  completedRequests: number;
  averageProcessingTime: number;
  accuracy: number;
  productivity: number;
  lastActivity: string;
}

export interface DashboardMetrics {
  kpis: KPIData;
  workComparisons: WorkComparison[];
  workerEfficiency: WarehouseWorkerEfficiency[];
  trends: {
    requestsTrend: Array<{ date: string; count: number }>;
    stockTrend: Array<{ date: string; value: number }>;
    efficiencyTrend: Array<{ date: string; efficiency: number }>;
  };
}

export interface CalculatedMetric {
  id?: string;
  metric_type: string;
  entity_type: string | null;
  entity_id: string | null;
  period_start: string | null;
  period_end: string | null;
  metric_value: number;
  metadata: Record<string, unknown>;
  calculated_at?: string;
}

class AnalyticsService {
  /**
   * Obtiene los KPIs principales del sistema
   */
  async getKPIs(): Promise<KPIData> {
    try {
      // Total de obras
      const { count: totalWorks } = await supabase
        .from('obras')
        .select('*', { count: 'exact', head: true });

      // Obras activas
      const { count: activeWorks } = await supabase
        .from('obras')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activa');

      // Total de materiales
      const { count: totalMaterials } = await supabase
        .from('materiales')
        .select('*', { count: 'exact', head: true });

      // Stock total (suma de todas las cantidades)
      const { data: stockData } = await supabase
        .from('stock_obra_material')
        .select('cantidad_actual');

      const totalStock = stockData?.reduce((sum, item) => sum + (item.cantidad_actual || 0), 0) || 0;

      // Requerimientos pendientes
      const { count: pendingRequests } = await supabase
        .from('requerimientos')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      // Órdenes completadas
      const { count: completedOrders } = await supabase
        .from('ordenes_compra')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'completada');

      // Tiempo promedio de procesamiento (en días)
      const { data: processingTimes } = await supabase
        .from('requerimientos')
        .select('fecha_creacion, fecha_actualizacion')
        .not('fecha_actualizacion', 'is', null)
        .limit(100);

      let averageProcessingTime = 0;
      if (processingTimes && processingTimes.length > 0) {
        const totalDays = processingTimes.reduce((sum, req) => {
          const created = new Date(req.fecha_creacion);
          const updated = new Date(req.fecha_actualizacion!);
          const diffDays = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + diffDays;
        }, 0);
        averageProcessingTime = totalDays / processingTimes.length;
      }

      // Rotación de stock (simplificado)
      const stockTurnover = totalStock > 0 ? (completedOrders || 0) / totalStock * 100 : 0;

      return {
        totalWorks: totalWorks || 0,
        activeWorks: activeWorks || 0,
        totalMaterials: totalMaterials || 0,
        totalStock,
        pendingRequests: pendingRequests || 0,
        completedOrders: completedOrders || 0,
        averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
        stockTurnover: Math.round(stockTurnover * 100) / 100
      };
    } catch (error) {
      console.error('Error getting KPIs:', error);
      throw new Error('Failed to fetch KPI data');
    }
  }

  /**
   * Obtiene comparación entre obras
   */
  async getWorkComparisons(): Promise<WorkComparison[]> {
    try {
      const { data: obras } = await supabase
        .from('obras')
        .select(`
          id,
          nombre,
          requerimientos(id, estado),
          stock_obra_material(cantidad_actual, material:materiales(precio_unitario))
        `);

      if (!obras) return [];

      const comparisons: WorkComparison[] = obras.map(obra => {
        const requerimientos = obra.requerimientos || [];
        const stock = obra.stock_obra_material || [];
        
        const totalRequests = requerimientos.length;
        const completedRequests = requerimientos.filter(req => req.estado === 'completado').length;
        const pendingRequests = requerimientos.filter(req => req.estado === 'pendiente').length;
        
        const totalMaterials = stock.length;
        const stockValue = stock.reduce((sum, item) => {
          const precio = item.material?.[0]?.precio_unitario || 0;
          const cantidad = item.cantidad_actual || 0;
          return sum + (precio * cantidad);
        }, 0);
        
        const efficiency = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;
        
        return {
          workId: obra.id,
          workName: obra.nombre,
          totalRequests,
          completedRequests,
          pendingRequests,
          totalMaterials,
          stockValue: Math.round(stockValue * 100) / 100,
          efficiency: Math.round(efficiency * 100) / 100,
          lastActivity: new Date().toISOString() // Simplificado
        };
      });

      return comparisons.sort((a, b) => b.efficiency - a.efficiency);
    } catch (error) {
      console.error('Error getting work comparisons:', error);
      throw new Error('Failed to fetch work comparison data');
    }
  }

  /**
   * Obtiene eficiencia de almaceneros
   */
  async getWarehouseWorkerEfficiency(): Promise<WarehouseWorkerEfficiency[]> {
    try {
      const { data: workers } = await supabase
        .from('usuarios')
        .select(`
          id,
          nombre,
          email,
          requerimientos_created:requerimientos!requerimientos_creado_por_fkey(id, estado, fecha_creacion, fecha_actualizacion),
          entradas_created:entradas!entradas_creado_por_fkey(id, fecha_entrada),
          salidas_created:salidas!salidas_creado_por_fkey(id, fecha_salida)
        `)
        .eq('rol', 'almacenero');

      if (!workers) return [];

      const efficiency: WarehouseWorkerEfficiency[] = workers.map(worker => {
        const requerimientos = worker.requerimientos_created || [];
        const entradas = worker.entradas_created || [];
        const salidas = worker.salidas_created || [];
        
        const totalRequests = requerimientos.length;
        const completedRequests = requerimientos.filter(req => req.estado === 'completado').length;
        
        // Calcular tiempo promedio de procesamiento
        const processedRequests = requerimientos.filter(req => req.fecha_actualizacion);
        let averageProcessingTime = 0;
        if (processedRequests.length > 0) {
          const totalTime = processedRequests.reduce((sum, req) => {
            const created = new Date(req.fecha_creacion);
            const updated = new Date(req.fecha_actualizacion!);
            return sum + (updated.getTime() - created.getTime());
          }, 0);
          averageProcessingTime = totalTime / processedRequests.length / (1000 * 60 * 60); // en horas
        }
        
        const accuracy = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;
        const totalActivities = totalRequests + entradas.length + salidas.length;
        const productivity = totalActivities; // Simplificado
        
        // Última actividad
        const allDates = [
          ...requerimientos.map(r => r.fecha_creacion),
          ...entradas.map(e => e.fecha_entrada),
          ...salidas.map(s => s.fecha_salida)
        ].filter(Boolean);
        
        const lastActivity = allDates.length > 0 
          ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))).toISOString()
          : new Date().toISOString();
        
        return {
          workerId: worker.id,
          workerName: worker.nombre,
          workerEmail: worker.email,
          totalRequests,
          completedRequests,
          averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
          accuracy: Math.round(accuracy * 100) / 100,
          productivity,
          lastActivity
        };
      });

      return efficiency.sort((a, b) => b.productivity - a.productivity);
    } catch (error) {
      console.error('Error getting worker efficiency:', error);
      throw new Error('Failed to fetch worker efficiency data');
    }
  }

  /**
   * Obtiene tendencias históricas
   */
  async getTrends(days: number = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Tendencia de requerimientos
      const { data: requestsData } = await supabase
        .from('requerimientos')
        .select('fecha_creacion')
        .gte('fecha_creacion', startDate.toISOString())
        .lte('fecha_creacion', endDate.toISOString());

      const requestsTrend = this.groupByDate(requestsData || [], 'fecha_creacion');

      // Tendencia de stock (simplificado - valor actual)
      const { data: stockData } = await supabase
        .from('stock_obra_material')
        .select('cantidad_actual, material:materiales(precio_unitario)');

      const currentStockValue = stockData?.reduce((sum, item) => {
        const precio = item.material?.[0]?.precio_unitario || 0;
        const cantidad = item.cantidad_actual || 0;
        return sum + (precio * cantidad);
      }, 0) || 0;

      // Generar tendencia de stock (simulada para el ejemplo)
      const stockTrend = Array.from({ length: days }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return {
          date: date.toISOString().split('T')[0],
          value: currentStockValue * (0.9 + Math.random() * 0.2) // Variación simulada
        };
      });

      // Tendencia de eficiencia (simplificada)
      const efficiencyTrend = Array.from({ length: days }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return {
          date: date.toISOString().split('T')[0],
          efficiency: 75 + Math.random() * 20 // Eficiencia simulada entre 75-95%
        };
      });

      return {
        requestsTrend,
        stockTrend,
        efficiencyTrend
      };
    } catch (error) {
      console.error('Error getting trends:', error);
      throw new Error('Failed to fetch trend data');
    }
  }

  /**
   * Obtiene métricas completas del dashboard
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const [kpis, workComparisons, workerEfficiency, trends] = await Promise.all([
        this.getKPIs(),
        this.getWorkComparisons(),
        this.getWarehouseWorkerEfficiency(),
        this.getTrends()
      ]);

      return {
        kpis,
        workComparisons,
        workerEfficiency,
        trends
      };
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      throw new Error('Failed to fetch dashboard metrics');
    }
  }

  /**
   * Guarda una métrica calculada
   */
  async saveCalculatedMetric(
    metricType: string,
    entityType: string | null,
    entityId: string | null,
    periodStart: string | null,
    periodEnd: string | null,
    metricValue: number,
    metadata: Record<string, unknown> = {}
  ): Promise<CalculatedMetric> {
    try {
      const { data, error } = await supabase
        .from('calculated_metrics')
        .insert({
          metric_type: metricType,
          entity_type: entityType,
          entity_id: entityId,
          period_start: periodStart,
          period_end: periodEnd,
          metric_value: metricValue,
          metadata
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving calculated metric:', error);
      throw new Error('Failed to save calculated metric');
    }
  }

  /**
   * Obtiene métricas calculadas por tipo
   */
  async getCalculatedMetrics(
    metricType: string,
    entityType?: string,
    entityId?: string,
    limit: number = 100
  ): Promise<CalculatedMetric[]> {
    try {
      let query = supabase
        .from('calculated_metrics')
        .select('*')
        .eq('metric_type', metricType)
        .order('calculated_at', { ascending: false })
        .limit(limit);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error getting calculated metrics:', error);
      throw new Error('Failed to fetch calculated metrics');
    }
  }

  /**
   * Agrupa datos por fecha
   */
  private groupByDate(data: Record<string, unknown>[], dateField: string) {
    const grouped = data.reduce((acc, item) => {
      const dateValue = item[dateField] as string | Date;
      const date = new Date(dateValue).toISOString().split('T')[0];
      acc[date] = ((acc[date] as number) || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([date, count]) => ({ date, count: Number(count) }));
  }
}

export const analyticsService = new AnalyticsService();
export default AnalyticsService;