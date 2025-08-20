import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PickingListItem {
  id: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  quantity: number;
  unit: string;
  location: {
    zone: string;
    aisle: string;
    shelf: string;
    position: string;
    coordinates?: {
      x: number;
      y: number;
      z: number;
    };
  };
  priority: 'high' | 'medium' | 'low';
  workId: string;
  workName: string;
  requestDate: string;
  estimatedPickTime: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  specialInstructions?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

interface OptimizedPickingList {
  id: string;
  warehouseWorkerId: string;
  workerId: string;
  workerName: string;
  createdAt: string;
  estimatedCompletionTime: number;
  totalItems: number;
  totalWeight: number;
  route: {
    startLocation: string;
    endLocation: string;
    totalDistance: number;
    estimatedTime: number;
    waypoints: {
      order: number;
      location: string;
      items: PickingListItem[];
      estimatedArrivalTime: number;
      pickingTime: number;
    }[];
  };
  items: PickingListItem[];
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  efficiency: {
    routeOptimization: number;
    timeEstimation: number;
    loadBalance: number;
    overall: number;
  };
}

interface LocationAlert {
  id: string;
  type: 'low_stock' | 'misplaced_item' | 'location_full' | 'maintenance_required' | 'temperature_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  materialId?: string;
  materialName?: string;
  location: {
    zone: string;
    aisle: string;
    shelf: string;
    position: string;
  };
  message: string;
  description: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  assignedTo?: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  metadata?: {
    currentStock?: number;
    minimumStock?: number;
    temperature?: number;
    humidity?: number;
    lastMovement?: string;
  };
}

interface WorkerPerformance {
  workerId: string;
  workerName: string;
  shift: 'morning' | 'afternoon' | 'night';
  date: string;
  metrics: {
    itemsPicked: number;
    listsCompleted: number;
    averagePickTime: number;
    accuracy: number;
    efficiency: number;
    totalDistance: number;
    totalTime: number;
  };
  alerts: {
    generated: number;
    resolved: number;
    responseTime: number;
  };
}

export class WarehouseService {
  // Get pending picking lists for optimization
  static async getPendingPickingItems(workId?: string): Promise<PickingListItem[]> {
    try {
      let query = supabase
        .from('requerimientos')
        .select(`
          id,
          obra_id,
          material_id,
          cantidad_requerida,
          fecha_requerimiento,
          prioridad,
          estado,
          obras!inner(nombre),
          materiales!inner(
            nombre,
            codigo,
            unidad,
            peso_unitario,
            dimensiones,
            ubicacion_almacen
          )
        `)
        .in('estado', ['pendiente', 'aprobado'])
        .order('prioridad', { ascending: false })
        .order('fecha_requerimiento', { ascending: true });

      if (workId) {
        query = query.eq('obra_id', workId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        materialId: item.material_id,
        materialName: item.materiales?.[0]?.nombre || 'Unknown',
        materialCode: item.materiales?.[0]?.codigo || 'N/A',
        quantity: item.cantidad_requerida,
        unit: item.materiales?.[0]?.unidad || 'unit',
        location: this.parseLocation(item.materiales?.[0]?.ubicacion_almacen),
        priority: this.mapPriority(item.prioridad),
        workId: item.obra_id,
        workName: item.obras?.[0]?.nombre || 'Unknown Work',
        requestDate: item.fecha_requerimiento,
        estimatedPickTime: this.calculatePickTime(item.cantidad_requerida, item.materiales?.[0]?.peso_unitario || 1),
        weight: (item.materiales?.[0]?.peso_unitario || 1) * item.cantidad_requerida,
        dimensions: null, // Campo no disponible en la tabla materiales
        status: 'pending'
      })) || [];
    } catch (error) {
      console.error('Error fetching pending picking items:', error);
      throw error;
    }
  }

  // Generate optimized picking list for a worker
  static async generateOptimizedPickingList(
    workerId: string,
    items: PickingListItem[],
    maxWeight: number = 50,
    maxItems: number = 20
  ): Promise<OptimizedPickingList> {
    try {
      // Get worker information
      const { data: worker } = await supabase
        .from('usuarios')
        .select('nombre')
        .eq('id', workerId)
        .single();

      // Sort items by priority and location for optimal routing
      const sortedItems = this.optimizePickingRoute(items, maxWeight, maxItems);
      
      // Calculate route and timing
      const route = this.calculateOptimalRoute(sortedItems);
      
      // Calculate efficiency metrics
      const efficiency = this.calculateEfficiency(sortedItems, route);

      const optimizedList: OptimizedPickingList = {
        id: `picking_${Date.now()}_${workerId}`,
        warehouseWorkerId: workerId,
        workerId: workerId,
        workerName: worker?.nombre || 'Unknown Worker',
        createdAt: new Date().toISOString(),
        estimatedCompletionTime: route.estimatedTime,
        totalItems: sortedItems.length,
        totalWeight: sortedItems.reduce((sum, item) => sum + (item.weight || 0), 0),
        route,
        items: sortedItems,
        status: 'pending',
        efficiency
      };

      // Save to database
      await this.savePickingList(optimizedList);

      return optimizedList;
    } catch (error) {
      console.error('Error generating optimized picking list:', error);
      throw error;
    }
  }

  // Get active picking lists for a worker
  static async getWorkerPickingLists(workerId: string): Promise<OptimizedPickingList[]> {
    try {
      const { data, error } = await supabase
        .from('picking_lists')
        .select('*')
        .eq('worker_id', workerId)
        .in('status', ['pending', 'assigned', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(list => ({
        ...list,
        items: JSON.parse(list.items || '[]'),
        route: JSON.parse(list.route || '{}'),
        efficiency: JSON.parse(list.efficiency || '{}')
      })) || [];
    } catch (error) {
      console.error('Error fetching worker picking lists:', error);
      throw error;
    }
  }

  // Update picking list item status
  static async updatePickingItemStatus(
    listId: string,
    itemId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
    actualQuantity?: number
  ): Promise<void> {
    try {
      // Get current picking list
      const { data: pickingList, error: fetchError } = await supabase
        .from('picking_lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (fetchError) throw fetchError;

      const items: PickingListItem[] = JSON.parse(pickingList.items || '[]');
      const itemIndex = items.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        throw new Error('Item not found in picking list');
      }

      // Update item status
      items[itemIndex].status = status;
      
      // Update requirement status in database
      if (status === 'completed') {
        await supabase
          .from('requerimientos')
          .update({ 
            estado: 'en_proceso',
            cantidad_asignada: actualQuantity || items[itemIndex].quantity
          })
          .eq('id', itemId);
      }

      // Update picking list
      const { error: updateError } = await supabase
        .from('picking_lists')
        .update({ 
          items: JSON.stringify(items),
          updated_at: new Date().toISOString()
        })
        .eq('id', listId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating picking item status:', error);
      throw error;
    }
  }

  // Get location alerts
  static async getLocationAlerts(
    workerId?: string,
    severity?: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<LocationAlert[]> {
    try {
      let query = supabase
        .from('location_alerts')
        .select('*')
        .eq('status', 'active')
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (workerId) {
        query = query.or(`assigned_to.eq.${workerId},assigned_to.is.null`);
      }

      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(alert => ({
        ...alert,
        location: JSON.parse(alert.location || '{}'),
        metadata: JSON.parse(alert.metadata || '{}')
      })) || [];
    } catch (error) {
      console.error('Error fetching location alerts:', error);
      throw error;
    }
  }

  // Create location alert
  static async createLocationAlert(alert: Omit<LocationAlert, 'id' | 'createdAt' | 'status'>): Promise<LocationAlert> {
    try {
      const newAlert = {
        ...alert,
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        status: 'active',
        location: JSON.stringify(alert.location),
        metadata: JSON.stringify(alert.metadata || {})
      };

      const { data, error } = await supabase
        .from('location_alerts')
        .insert(newAlert)
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        location: JSON.parse(data.location),
        metadata: JSON.parse(data.metadata || '{}')
      };
    } catch (error) {
      console.error('Error creating location alert:', error);
      throw error;
    }
  }

  // Acknowledge alert
  static async acknowledgeAlert(alertId: string, workerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('location_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          assigned_to: workerId
        })
        .eq('id', alertId);

      if (error) throw error;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  // Resolve alert
  static async resolveAlert(alertId: string, workerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('location_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          assigned_to: workerId
        })
        .eq('id', alertId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  // Get worker performance metrics
  static async getWorkerPerformance(
    workerId: string,
    startDate: string,
    endDate: string
  ): Promise<WorkerPerformance[]> {
    try {
      // Get worker info
      const { data: worker } = await supabase
        .from('usuarios')
        .select('nombre')
        .eq('id', workerId)
        .single();

      // Get picking performance
      const { data: pickingData } = await supabase
        .from('picking_lists')
        .select('*')
        .eq('worker_id', workerId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'completed');

      // Get alerts performance
      const { data: alertsData } = await supabase
        .from('location_alerts')
        .select('*')
        .eq('assigned_to', workerId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Calculate daily performance
      const performanceByDate = new Map<string, WorkerPerformance>();
      
      pickingData?.forEach(list => {
        const date = new Date(list.created_at).toISOString().split('T')[0];
        const items = JSON.parse(list.items || '[]');
        const efficiency = JSON.parse(list.efficiency || '{}');
        
        if (!performanceByDate.has(date)) {
          performanceByDate.set(date, {
            workerId,
            workerName: worker?.nombre || 'Unknown',
            shift: this.getShiftFromTime(list.created_at),
            date,
            metrics: {
              itemsPicked: 0,
              listsCompleted: 0,
              averagePickTime: 0,
              accuracy: 0,
              efficiency: 0,
              totalDistance: 0,
              totalTime: 0
            },
            alerts: {
              generated: 0,
              resolved: 0,
              responseTime: 0
            }
          });
        }
        
        const performance = performanceByDate.get(date)!;
        performance.metrics.itemsPicked += items.length;
        performance.metrics.listsCompleted += 1;
        performance.metrics.efficiency += efficiency.overall || 0;
        performance.metrics.totalTime += list.estimated_completion_time || 0;
      });

      // Add alerts performance
      alertsData?.forEach(alert => {
        const date = new Date(alert.created_at).toISOString().split('T')[0];
        const performance = performanceByDate.get(date);
        
        if (performance) {
          performance.alerts.generated += 1;
          if (alert.status === 'resolved') {
            performance.alerts.resolved += 1;
            if (alert.acknowledged_at && alert.resolved_at) {
              const responseTime = new Date(alert.resolved_at).getTime() - new Date(alert.acknowledged_at).getTime();
              performance.alerts.responseTime += responseTime / (1000 * 60); // minutes
            }
          }
        }
      });

      // Calculate averages
      Array.from(performanceByDate.values()).forEach(performance => {
        if (performance.metrics.listsCompleted > 0) {
          performance.metrics.averagePickTime = performance.metrics.totalTime / performance.metrics.itemsPicked;
          performance.metrics.efficiency = performance.metrics.efficiency / performance.metrics.listsCompleted;
          performance.metrics.accuracy = 95; // Placeholder - would need actual accuracy data
        }
        
        if (performance.alerts.resolved > 0) {
          performance.alerts.responseTime = performance.alerts.responseTime / performance.alerts.resolved;
        }
      });

      return Array.from(performanceByDate.values());
    } catch (error) {
      console.error('Error fetching worker performance:', error);
      throw error;
    }
  }

  // Helper methods
  private static parseLocation(locationString: string): PickingListItem['location'] {
    try {
      const parsed = JSON.parse(locationString || '{}');
      return {
        zone: parsed.zone || 'A',
        aisle: parsed.aisle || '1',
        shelf: parsed.shelf || '1',
        position: parsed.position || '1',
        coordinates: parsed.coordinates
      };
    } catch {
      return {
        zone: 'A',
        aisle: '1',
        shelf: '1',
        position: '1'
      };
    }
  }

  private static mapPriority(priority: string): 'high' | 'medium' | 'low' {
    switch (priority?.toLowerCase()) {
      case 'alta': return 'high';
      case 'media': return 'medium';
      case 'baja': return 'low';
      default: return 'medium';
    }
  }

  private static calculatePickTime(quantity: number, weight: number): number {
    // Base time per item + weight factor
    const baseTime = 30; // seconds per item
    const weightFactor = weight > 10 ? 1.5 : 1;
    return Math.round(quantity * baseTime * weightFactor);
  }

  private static optimizePickingRoute(
    items: PickingListItem[],
    maxWeight: number,
    maxItems: number
  ): PickingListItem[] {
    // Sort by priority first, then by location for optimal routing
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return items
      .sort((a, b) => {
        // Priority first
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by location (zone, aisle, shelf, position)
        if (a.location.zone !== b.location.zone) {
          return a.location.zone.localeCompare(b.location.zone);
        }
        if (a.location.aisle !== b.location.aisle) {
          return parseInt(a.location.aisle) - parseInt(b.location.aisle);
        }
        if (a.location.shelf !== b.location.shelf) {
          return parseInt(a.location.shelf) - parseInt(b.location.shelf);
        }
        return parseInt(a.location.position) - parseInt(b.location.position);
      })
      .slice(0, maxItems)
      .filter((item, index, arr) => {
        const totalWeight = arr.slice(0, index + 1).reduce((sum, i) => sum + (i.weight || 0), 0);
        return totalWeight <= maxWeight;
      });
  }

  private static calculateOptimalRoute(items: PickingListItem[]): OptimizedPickingList['route'] {
    const waypoints = [];
    let currentTime = 0;
    let totalDistance = 0;
    
    // Group items by location
    const locationGroups = new Map<string, PickingListItem[]>();
    items.forEach(item => {
      const locationKey = `${item.location.zone}-${item.location.aisle}-${item.location.shelf}`;
      if (!locationGroups.has(locationKey)) {
        locationGroups.set(locationKey, []);
      }
      locationGroups.get(locationKey)!.push(item);
    });

    // Create waypoints
    let order = 1;
    for (const [location, locationItems] of locationGroups) {
      const pickingTime = locationItems.reduce((sum, item) => sum + item.estimatedPickTime, 0);
      const travelTime = order === 1 ? 120 : 60; // seconds
      
      waypoints.push({
        order,
        location,
        items: locationItems,
        estimatedArrivalTime: currentTime + travelTime,
        pickingTime
      });
      
      currentTime += travelTime + pickingTime;
      totalDistance += order === 1 ? 50 : 25; // meters
      order++;
    }

    return {
      startLocation: 'Entrada Principal',
      endLocation: 'Área de Despacho',
      totalDistance,
      estimatedTime: currentTime,
      waypoints
    };
  }

  private static calculateEfficiency(
    items: PickingListItem[],
    route: OptimizedPickingList['route']
  ): OptimizedPickingList['efficiency'] {
    const routeOptimization = Math.min(100, (1000 / route.totalDistance) * 100);
    const timeEstimation = Math.min(100, (items.length * 60 / route.estimatedTime) * 100);
    const loadBalance = Math.min(100, (items.length / 20) * 100);
    const overall = (routeOptimization + timeEstimation + loadBalance) / 3;

    return {
      routeOptimization: Math.round(routeOptimization),
      timeEstimation: Math.round(timeEstimation),
      loadBalance: Math.round(loadBalance),
      overall: Math.round(overall)
    };
  }

  private static async savePickingList(pickingList: OptimizedPickingList): Promise<void> {
    const { error } = await supabase
      .from('picking_lists')
      .insert({
        id: pickingList.id,
        worker_id: pickingList.workerId,
        worker_name: pickingList.workerName,
        created_at: pickingList.createdAt,
        estimated_completion_time: pickingList.estimatedCompletionTime,
        total_items: pickingList.totalItems,
        total_weight: pickingList.totalWeight,
        route: JSON.stringify(pickingList.route),
        items: JSON.stringify(pickingList.items),
        status: pickingList.status,
        efficiency: JSON.stringify(pickingList.efficiency)
      });

    if (error) throw error;
  }

  private static getShiftFromTime(timestamp: string): 'morning' | 'afternoon' | 'night' {
    const hour = new Date(timestamp).getHours();
    if (hour >= 6 && hour < 14) return 'morning';
    if (hour >= 14 && hour < 22) return 'afternoon';
    return 'night';
  }
}