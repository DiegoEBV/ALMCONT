import { localAuth } from './localAuth';
import { localDB } from '../lib/localDB';

// Interfaz para métricas del dashboard de coordinación
export interface DashboardMetrics {
  kpis: {
    totalWorks: number;
    activeWorks: number;
    totalStock: number;
    totalMaterials: number;
    pendingRequests: number;
    completedOrders: number;
    averageProcessingTime: number;
    stockTurnover: number;
  };
  workComparisons: Array<{
    workId: string;
    workName: string;
    efficiency: number;
    completedTasks: number;
    totalTasks: number;
  }>;
  workerEfficiency: Array<{
    workerId: string;
    workerName: string;
    efficiency: number;
    tasksCompleted: number;
    averageTime: number;
  }>;
  trends: Array<{
    date: string;
    requests: number;
    completions: number;
    efficiency: number;
  }>;
}

// Servicio HTTP que maneja la autenticación local
class HttpService {
  private baseURL = '/api';

  // Verificar si el usuario está autenticado
  private isAuthenticated(): boolean {
    return localAuth.isAuthenticated();
  }

  // Obtener headers de autenticación
  private getAuthHeaders(): Record<string, string> {
    const session = localAuth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': session ? `Bearer ${session.token}` : ''
    };
  }

  // Simular petición HTTP con datos locales
  private async simulateRequest<T>(endpoint: string, mockData: T): Promise<{ success: boolean; data: T }> {
    // Verificar autenticación
    if (!this.isAuthenticated()) {
      throw new Error('Usuario no autenticado');
    }

    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      data: mockData
    };
  }

  // Obtener métricas del dashboard de coordinación
  async getAnalyticsDashboard(): Promise<{ success: boolean; data: DashboardMetrics }> {
    try {
      // Obtener datos de la base de datos local
      const [obras, requerimientos, stockItems, usuarios] = await Promise.all([
        localDB.get('obras'),
        localDB.get('requerimientos'),
        localDB.get('stock_obra_material'),
        localDB.get('usuarios')
      ]);

      // Calcular KPIs
      const totalWorks = obras.length;
      const activeWorks = obras.filter(obra => obra.estado === 'ACTIVA').length;
      const totalStock = stockItems.reduce((sum, item) => sum + (item.cantidad_actual || 0), 0);
      const totalMaterials = stockItems.length;
      const pendingRequests = requerimientos.filter(req => req.estado === 'PENDIENTE').length;
      const completedOrders = requerimientos.filter(req => req.estado === 'ATENDIDO').length;
      const averageProcessingTime = 2.5; // Simulado
      const stockTurnover = 85.2; // Simulado

      // Generar comparaciones de obras
      const workComparisons = obras.slice(0, 5).map((obra, index) => ({
        workId: obra.id,
        workName: obra.nombre,
        efficiency: Math.random() * 40 + 60, // 60-100%
        completedTasks: Math.floor(Math.random() * 50) + 10,
        totalTasks: Math.floor(Math.random() * 20) + 60
      }));

      // Generar eficiencia de trabajadores
      const almaceneros = usuarios.filter(user => user.rol === 'ALMACENERO');
      const workerEfficiency = almaceneros.slice(0, 5).map(user => ({
        workerId: user.id,
        workerName: `${user.nombre} ${user.apellido}`,
        efficiency: Math.random() * 30 + 70, // 70-100%
        tasksCompleted: Math.floor(Math.random() * 100) + 50,
        averageTime: Math.random() * 2 + 1 // 1-3 horas
      }));

      // Generar tendencias (últimos 7 días)
      const trends = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toISOString().split('T')[0],
          requests: Math.floor(Math.random() * 20) + 5,
          completions: Math.floor(Math.random() * 15) + 3,
          efficiency: Math.random() * 20 + 75 // 75-95%
        };
      });

      const metrics: DashboardMetrics = {
        kpis: {
          totalWorks,
          activeWorks,
          totalStock,
          totalMaterials,
          pendingRequests,
          completedOrders,
          averageProcessingTime,
          stockTurnover
        },
        workComparisons,
        workerEfficiency,
        trends
      };

      return this.simulateRequest('/analytics/dashboard', metrics);
    } catch (error) {
      console.error('Error obteniendo métricas del dashboard:', error);
      throw error;
    }
  }

  // Obtener ubicaciones de entrega para logística
  async getDeliveryLocations(): Promise<{ success: boolean; data: any[] }> {
    const mockLocations = [
      { id: '1', name: 'Almacén Central', address: 'Av. Principal 123', lat: -12.0464, lng: -77.0428 },
      { id: '2', name: 'Obra Norte', address: 'Jr. Los Pinos 456', lat: -12.0264, lng: -77.0328 },
      { id: '3', name: 'Obra Sur', address: 'Av. Los Olivos 789', lat: -12.0664, lng: -77.0528 }
    ];
    return this.simulateRequest('/logistics/delivery-locations', mockLocations);
  }

  // Obtener comparaciones de precios de proveedores
  async getSupplierPrices(): Promise<{ success: boolean; data: any[] }> {
    const mockPrices = [
      { material: 'Cemento Portland', supplier1: 25.50, supplier2: 26.00, supplier3: 24.80, bestPrice: 24.80 },
      { material: 'Acero Corrugado', supplier1: 3.20, supplier2: 3.15, supplier3: 3.25, bestPrice: 3.15 },
      { material: 'Arena Gruesa', supplier1: 45.00, supplier2: 44.50, supplier3: 46.00, bestPrice: 44.50 }
    ];
    return this.simulateRequest('/logistics/supplier-prices', mockPrices);
  }

  // Obtener listas de picking para almaceneros
  async getPickingLists(workerId: string): Promise<{ success: boolean; data: any[] }> {
    const mockPickingLists = [
      {
        id: '1',
        requestId: 'REQ-001',
        priority: 'high',
        items: [
          { material: 'Cemento Portland', quantity: 10, location: 'A-01-01' },
          { material: 'Arena Gruesa', quantity: 5, location: 'B-02-03' }
        ],
        status: 'pending'
      },
      {
        id: '2',
        requestId: 'REQ-002',
        priority: 'medium',
        items: [
          { material: 'Acero Corrugado', quantity: 20, location: 'C-01-02' }
        ],
        status: 'in_progress'
      }
    ];
    return this.simulateRequest(`/warehouse/picking-lists/worker/${workerId}`, mockPickingLists);
  }

  // Obtener alertas de almacén
  async getWarehouseAlerts(workerId: string): Promise<{ success: boolean; data: any[] }> {
    const mockAlerts = [
      {
        id: '1',
        type: 'low_stock',
        message: 'Stock bajo: Cemento Portland',
        priority: 'high',
        location: 'A-01-01',
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        type: 'location_issue',
        message: 'Revisar ubicación B-02-03',
        priority: 'medium',
        location: 'B-02-03',
        timestamp: new Date().toISOString()
      }
    ];
    return this.simulateRequest(`/warehouse/alerts?workerId=${workerId}`, mockAlerts);
  }

  // Obtener rendimiento de almacenero
  async getWorkerPerformance(workerId: string, startDate: string, endDate: string): Promise<{ success: boolean; data: any }> {
    const mockPerformance = {
      tasksCompleted: Math.floor(Math.random() * 50) + 20,
      averageTime: Math.random() * 2 + 1,
      efficiency: Math.random() * 20 + 75,
      accuracy: Math.random() * 10 + 90
    };
    return this.simulateRequest(`/warehouse/performance/${workerId}`, mockPerformance);
  }

  // Crear contrato de logística
  async createContract(contractData: any): Promise<{ success: boolean; data: any }> {
    const mockContract = {
      id: crypto.randomUUID(),
      ...contractData,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    return this.simulateRequest('/logistics/contracts', mockContract);
  }

  // Reconocer alerta
  async acknowledgeAlert(alertId: string, workerId: string): Promise<{ success: boolean; data: any }> {
    return this.simulateRequest(`/warehouse/alerts/${alertId}/acknowledge`, { acknowledged: true });
  }

  // Resolver alerta
  async resolveAlert(alertId: string, workerId: string): Promise<{ success: boolean; data: any }> {
    return this.simulateRequest(`/warehouse/alerts/${alertId}/resolve`, { resolved: true });
  }
}

// Instancia singleton del servicio HTTP
export const httpService = new HttpService();