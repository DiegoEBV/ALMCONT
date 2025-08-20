import { supabase } from '@/lib/supabase';

// Interfaces para el dashboard de almacén
export interface PickingItem {
  id: string;
  materialId: string;
  materialName: string;
  requestedQuantity: number;
  actualQuantity?: number;
  location: string;
  workName: string;
  status: 'pending' | 'picked' | 'cancelled';
  notes?: string;
}

export interface OptimizedPickingList {
  id: string;
  workerId: string;
  items: PickingItem[];
  totalWeight: number;
  estimatedTime: number;
  efficiency: number;
  route: string[];
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface LocationAlert {
  id: string;
  type: 'low_stock' | 'misplaced_item' | 'damaged_location' | 'access_blocked';
  message: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface WorkerPerformance {
  workerId: string;
  totalPickingLists: number;
  completedLists: number;
  averageCompletionTime: number;
  efficiency: number;
  accuracyRate: number;
  totalItemsPicked: number;
}

class WarehouseService {
  // Obtener listas de picking basadas en requerimientos pendientes
  async getPickingLists(workerId: string): Promise<OptimizedPickingList[]> {
    try {
      const { data: requerimientos, error } = await supabase
        .from('requerimientos')
        .select(`
          id,
          cantidad_solicitada,
          estado,
          fecha_requerimiento,
          materiales (
            id,
            nombre,
            peso_unitario
          ),
          obras (
            id,
            nombre
          ),
          stock_obra_material (
            ubicacion,
            cantidad_actual
          )
        `)
        .in('estado', ['PENDIENTE', 'EN_PROCESO'])
        .order('fecha_requerimiento', { ascending: true })
        .limit(10);

      if (error) throw error;

      const pickingLists: OptimizedPickingList[] = [];
      let currentList: OptimizedPickingList | null = null;
      let listCounter = 1;

      (requerimientos || []).forEach((req, index) => {
        // Crear nueva lista cada 3-5 items
        if (!currentList || currentList.items.length >= (3 + Math.floor(Math.random() * 3))) {
          if (currentList) {
            pickingLists.push(currentList);
          }
          
          currentList = {
            id: `PL-${String(listCounter).padStart(3, '0')}`,
            workerId,
            items: [],
            totalWeight: 0,
            estimatedTime: 0,
            efficiency: Math.floor(Math.random() * 20) + 80, // 80-100%
            route: [],
            status: index % 3 === 0 ? 'completed' : index % 2 === 0 ? 'in_progress' : 'pending',
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          };
          listCounter++;
        }

        const stockInfo = req.stock_obra_material?.[0];
        const location = stockInfo?.ubicacion || `${String.fromCharCode(65 + Math.floor(Math.random() * 3))}-${String(Math.floor(Math.random() * 5) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}`;
        
        const material = Array.isArray(req.materiales) ? req.materiales[0] : req.materiales;
        const obra = Array.isArray(req.obras) ? req.obras[0] : req.obras;
        
        const pickingItem: PickingItem = {
          id: req.id,
          materialId: material?.id || '',
          materialName: material?.nombre || 'Material desconocido',
          requestedQuantity: req.cantidad_solicitada || 0,
          location,
          workName: obra?.nombre || 'Obra desconocida',
          status: req.estado === 'PENDIENTE' ? 'pending' : 'picked'
        };

        currentList.items.push(pickingItem);
        currentList.totalWeight += (req.cantidad_solicitada || 0) * 1; // Peso simulado
        currentList.estimatedTime += Math.floor(Math.random() * 15) + 5; // 5-20 minutos por item
        currentList.route.push(location);
      });

      if (currentList && currentList.items.length > 0) {
        pickingLists.push(currentList);
      }

      return pickingLists;
    } catch (error) {
      console.error('Error fetching picking lists:', error);
      return [];
    }
  }

  // Obtener alertas de almacén basadas en stock bajo y otros problemas
  async getWarehouseAlerts(workerId: string): Promise<LocationAlert[]> {
    try {
      const { data: stockItems, error } = await supabase
        .from('stock_obra_material')
        .select(`
          id,
          cantidad_actual,
          cantidad_minima,
          ubicacion,
          materiales (
            id,
            nombre
          ),
          obras (
            id,
            nombre
          )
        `)
        .not('cantidad_actual', 'is', null) // Filtrar valores no nulos
        .order('cantidad_actual', { ascending: true })
        .limit(20);

      if (error) throw error;

      const alerts: LocationAlert[] = (stockItems || []).map((item, index) => {
        const severity = item.cantidad_actual <= (item.cantidad_minima || 0) 
          ? 'critical' 
          : item.cantidad_actual <= (item.cantidad_minima || 0) * 1.1 
          ? 'high' 
          : 'medium';

        const alertTypes = ['low_stock', 'misplaced_item', 'damaged_location', 'access_blocked'] as const;
        const alertType = index === 0 ? 'low_stock' : alertTypes[Math.floor(Math.random() * alertTypes.length)];
        
        let message = '';
        switch (alertType) {
          case 'low_stock':
            message = `Stock bajo: ${(item.materiales as any)?.nombre || 'Material'} (${item.cantidad_actual}/${item.cantidad_minima || 0})`;
            break;
          case 'misplaced_item':
            message = `Posible material mal ubicado en ${item.ubicacion}`;
            break;
          case 'damaged_location':
            message = `Revisar condición de ubicación ${item.ubicacion}`;
            break;
          case 'access_blocked':
            message = `Acceso bloqueado a ubicación ${item.ubicacion}`;
            break;
        }

        return {
          id: `ALERT-${item.id}`,
          type: alertType,
          message,
          location: item.ubicacion || 'Ubicación desconocida',
          severity,
          status: Math.random() > 0.7 ? 'acknowledged' : 'active',
          createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          acknowledgedAt: Math.random() > 0.8 ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString() : undefined
        };
      });

      // Agregar algunas alertas adicionales simuladas
      const additionalAlerts: LocationAlert[] = [
        {
          id: 'ALERT-SYS-001',
          type: 'access_blocked',
          message: 'Mantenimiento programado en sector C',
          location: 'C-01-*',
          severity: 'medium',
          status: 'active',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'ALERT-SYS-002',
          type: 'damaged_location',
          message: 'Estantería dañada requiere reparación',
          location: 'B-03-05',
          severity: 'high',
          status: 'acknowledged',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          acknowledgedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        }
      ];

      return [...alerts, ...additionalAlerts];
    } catch (error) {
      console.error('Error fetching warehouse alerts:', error);
      return [];
    }
  }

  // Obtener rendimiento del trabajador
  async getWorkerPerformance(workerId: string, startDate: string, endDate: string): Promise<WorkerPerformance> {
    try {
      // Por ahora simulamos el rendimiento basado en datos reales cuando sea posible
      const { data: requerimientos, error } = await supabase
        .from('requerimientos')
        .select('id, estado, fecha_requerimiento')
        .gte('fecha_requerimiento', startDate)
        .lte('fecha_requerimiento', endDate);

      if (error) throw error;

      const totalRequests = requerimientos?.length || 0;
      const completedRequests = requerimientos?.filter(req => req.estado === 'ATENDIDO').length || 0;
      
      // Simular métricas adicionales
      const performance: WorkerPerformance = {
        workerId,
        totalPickingLists: Math.floor(totalRequests / 3) + Math.floor(Math.random() * 10) + 5,
        completedLists: Math.floor(completedRequests / 3) + Math.floor(Math.random() * 8) + 3,
        averageCompletionTime: Math.random() * 30 + 15, // 15-45 minutos
        efficiency: Math.random() * 25 + 75, // 75-100%
        accuracyRate: Math.random() * 15 + 85, // 85-100%
        totalItemsPicked: completedRequests * 2 + Math.floor(Math.random() * 50) + 20
      };

      return performance;
    } catch (error) {
      console.error('Error fetching worker performance:', error);
      return {
        workerId,
        totalPickingLists: 0,
        completedLists: 0,
        averageCompletionTime: 0,
        efficiency: 0,
        accuracyRate: 0,
        totalItemsPicked: 0
      };
    }
  }

  // Actualizar estado de item en lista de picking
  async updateItemStatus(listId: string, itemId: string, status: string, actualQuantity?: number): Promise<boolean> {
    try {
      // Por ahora simulamos la actualización
      // En una implementación real, actualizaríamos la base de datos
      console.log(`Updating item ${itemId} in list ${listId} to status ${status}`, { actualQuantity });
      return true;
    } catch (error) {
      console.error('Error updating item status:', error);
      return false;
    }
  }

  // Reconocer alerta
  async acknowledgeAlert(alertId: string, workerId: string): Promise<boolean> {
    try {
      // Por ahora simulamos el reconocimiento
      console.log(`Alert ${alertId} acknowledged by worker ${workerId}`);
      return true;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return false;
    }
  }

  // Resolver alerta
  async resolveAlert(alertId: string, workerId: string): Promise<boolean> {
    try {
      // Por ahora simulamos la resolución
      console.log(`Alert ${alertId} resolved by worker ${workerId}`);
      return true;
    } catch (error) {
      console.error('Error resolving alert:', error);
      return false;
    }
  }

  // Obtener estadísticas generales del almacén
  async getWarehouseStats(): Promise<{
    totalLocations: number;
    occupiedLocations: number;
    totalItems: number;
    lowStockItems: number;
    alertsCount: number;
  }> {
    try {
      const { data: stockItems, error } = await supabase
        .from('stock_obra_material')
        .select('id, cantidad_actual, cantidad_minima, ubicacion');

      if (error) throw error;

      const totalItems = stockItems?.reduce((sum, item) => sum + (item.cantidad_actual || 0), 0) || 0;
      const lowStockItems = stockItems?.filter(item => 
        (item.cantidad_actual || 0) <= (item.cantidad_minima || 0)
      ).length || 0;
      
      const uniqueLocations = new Set(stockItems?.map(item => item.ubicacion).filter(Boolean));
      
      return {
        totalLocations: uniqueLocations.size + Math.floor(Math.random() * 50) + 100, // Simular ubicaciones totales
        occupiedLocations: uniqueLocations.size,
        totalItems,
        lowStockItems,
        alertsCount: lowStockItems + Math.floor(Math.random() * 5) // Alertas adicionales
      };
    } catch (error) {
      console.error('Error fetching warehouse stats:', error);
      return {
        totalLocations: 0,
        occupiedLocations: 0,
        totalItems: 0,
        lowStockItems: 0,
        alertsCount: 0
      };
    }
  }
}

// Instancia singleton del servicio de almacén
export const warehouseService = new WarehouseService();