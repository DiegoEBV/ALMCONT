import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DeliveryLocation {
  id: string;
  workId: string;
  workName: string;
  address: string;
  latitude: number;
  longitude: number;
  priority: 'high' | 'medium' | 'low';
  estimatedDeliveryTime: number; // minutes
  materials: {
    materialId: string;
    materialName: string;
    quantity: number;
    weight: number;
  }[];
}

interface OptimizedRoute {
  id: string;
  name: string;
  totalDistance: number;
  totalTime: number;
  totalWeight: number;
  vehicleCapacity: number;
  stops: {
    order: number;
    location: DeliveryLocation;
    arrivalTime: string;
    departureTime: string;
    travelTimeFromPrevious: number;
  }[];
  efficiency: number;
}

interface SupplierPrice {
  supplierId: string;
  supplierName: string;
  materialId: string;
  materialName: string;
  currentPrice: number;
  previousPrice: number;
  priceChange: number;
  priceChangePercent: number;
  lastUpdated: string;
  availability: 'available' | 'limited' | 'unavailable';
  leadTime: number; // days
  minimumOrder: number;
}

interface PriceComparison {
  materialId: string;
  materialName: string;
  suppliers: SupplierPrice[];
  bestPrice: {
    supplierId: string;
    supplierName: string;
    price: number;
    savings: number;
    savingsPercent: number;
  };
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
}

interface FrameworkContract {
  id: string;
  contractNumber: string;
  supplierName: string;
  supplierId: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  totalValue: number;
  materials: {
    materialId: string;
    materialName: string;
    agreedPrice: number;
    currentMarketPrice: number;
    savings: number;
    quantity: number;
  }[];
  terms: {
    paymentTerms: string;
    deliveryTerms: string;
    qualityStandards: string;
    penalties: string;
  };
  performance: {
    onTimeDelivery: number;
    qualityScore: number;
    complianceScore: number;
  };
}

export class LogisticsService {
  // Route Optimization
  static async getDeliveryLocations(): Promise<DeliveryLocation[]> {
    try {
      const { data: obras, error: obrasError } = await supabase
        .from('obras')
        .select(`
          id,
          nombre,
          direccion,
          latitud,
          longitud,
          requerimientos (
            id,
            prioridad,
            materiales (
              id,
              nombre,
              peso_unitario
            ),
            cantidad
          )
        `)
        .eq('estado', 'activa');

      if (obrasError) throw obrasError;

      return obras?.map(obra => ({
        id: obra.id,
        workId: obra.id,
        workName: obra.nombre,
        address: obra.direccion,
        latitude: obra.latitud || 0,
        longitude: obra.longitud || 0,
        priority: this.calculatePriority(obra.requerimientos),
        estimatedDeliveryTime: this.estimateDeliveryTime(obra.requerimientos),
        materials: obra.requerimientos?.map((req: any) => ({
          materialId: req.materiales.id,
          materialName: req.materiales.nombre,
          quantity: req.cantidad,
          weight: req.materiales.peso_unitario * req.cantidad
        })) || []
      })) || [];
    } catch (error) {
      console.error('Error fetching delivery locations:', error);
      throw new Error('Error al obtener ubicaciones de entrega');
    }
  }

  static async optimizeRoute(locations: DeliveryLocation[], vehicleCapacity: number = 5000): Promise<OptimizedRoute> {
    try {
      // Implementación básica del algoritmo de optimización de rutas
      // En un entorno real, se usaría Google Maps API o similar
      
      const depot = { latitude: -12.0464, longitude: -77.0428 }; // Lima centro como depósito
      
      // Ordenar por prioridad y proximidad
      const sortedLocations = this.sortLocationsByPriorityAndDistance(locations, depot);
      
      let currentWeight = 0;
      let currentTime = 0;
      const stops = [];
      let totalDistance = 0;
      
      for (let i = 0; i < sortedLocations.length; i++) {
        const location = sortedLocations[i];
        const totalLocationWeight = location.materials.reduce((sum, mat) => sum + mat.weight, 0);
        
        if (currentWeight + totalLocationWeight > vehicleCapacity) {
          break; // No cabe más en el vehículo
        }
        
        const travelTime = i === 0 
          ? this.calculateTravelTime(depot, location)
          : this.calculateTravelTime(sortedLocations[i-1], location);
        
        currentTime += travelTime;
        currentWeight += totalLocationWeight;
        totalDistance += this.calculateDistance(
          i === 0 ? depot : sortedLocations[i-1],
          location
        );
        
        stops.push({
          order: i + 1,
          location,
          arrivalTime: new Date(Date.now() + currentTime * 60000).toISOString(),
          departureTime: new Date(Date.now() + (currentTime + location.estimatedDeliveryTime) * 60000).toISOString(),
          travelTimeFromPrevious: travelTime
        });
        
        currentTime += location.estimatedDeliveryTime;
      }
      
      const efficiency = this.calculateRouteEfficiency(stops, totalDistance, currentTime);
      
      const optimizedRoute: OptimizedRoute = {
        id: `route_${Date.now()}`,
        name: `Ruta Optimizada ${new Date().toLocaleDateString()}`,
        totalDistance,
        totalTime: currentTime,
        totalWeight: currentWeight,
        vehicleCapacity,
        stops,
        efficiency
      };
      
      // Guardar la ruta en la base de datos
      await this.saveOptimizedRoute(optimizedRoute);
      
      return optimizedRoute;
    } catch (error) {
      console.error('Error optimizing route:', error);
      throw new Error('Error al optimizar la ruta');
    }
  }

  // Price Comparison
  static async getSupplierPrices(materialIds?: string[]): Promise<PriceComparison[]> {
    try {
      let query = supabase
        .from('supplier_price_history')
        .select(`
          material_id,
          supplier_id,
          price,
          recorded_at,
          availability,
          lead_time_days,
          minimum_order_quantity,
          materiales (
            id,
            nombre
          ),
          proveedores:supplier_id (
            id,
            nombre
          )
        `)
        .order('recorded_at', { ascending: false });
      
      if (materialIds && materialIds.length > 0) {
        query = query.in('material_id', materialIds);
      }
      
      const { data: priceHistory, error } = await query;
      
      if (error) throw error;
      
      // Agrupar por material y obtener precios más recientes por proveedor
      const materialGroups = this.groupPricesByMaterial(priceHistory || []);
      
      const comparisons: PriceComparison[] = [];
      
      for (const [materialId, prices] of Object.entries(materialGroups)) {
        const suppliers = prices.map(price => {
          const previousPrice = this.getPreviousPrice(priceHistory || [], price.supplier_id, materialId);
          return {
            supplierId: price.supplier_id,
            supplierName: price.proveedores?.nombre || 'Proveedor Desconocido',
            materialId: price.material_id,
            materialName: price.materiales?.nombre || 'Material Desconocido',
            currentPrice: price.price,
            previousPrice: previousPrice || price.price,
            priceChange: price.price - (previousPrice || price.price),
            priceChangePercent: previousPrice ? ((price.price - previousPrice) / previousPrice) * 100 : 0,
            lastUpdated: price.recorded_at,
            availability: price.availability as 'available' | 'limited' | 'unavailable',
            leadTime: price.lead_time_days,
            minimumOrder: price.minimum_order_quantity
          };
        });
        
        const sortedSuppliers = suppliers.sort((a, b) => a.currentPrice - b.currentPrice);
        const bestPrice = sortedSuppliers[0];
        const averagePrice = suppliers.reduce((sum, s) => sum + s.currentPrice, 0) / suppliers.length;
        const prices_only = suppliers.map(s => s.currentPrice);
        
        comparisons.push({
          materialId,
          materialName: suppliers[0]?.materialName || 'Material Desconocido',
          suppliers: sortedSuppliers,
          bestPrice: {
            supplierId: bestPrice.supplierId,
            supplierName: bestPrice.supplierName,
            price: bestPrice.currentPrice,
            savings: averagePrice - bestPrice.currentPrice,
            savingsPercent: ((averagePrice - bestPrice.currentPrice) / averagePrice) * 100
          },
          averagePrice,
          priceRange: {
            min: Math.min(...prices_only),
            max: Math.max(...prices_only)
          }
        });
      }
      
      return comparisons;
    } catch (error) {
      console.error('Error fetching supplier prices:', error);
      throw new Error('Error al obtener precios de proveedores');
    }
  }

  // Contract Management
  static async getFrameworkContracts(): Promise<FrameworkContract[]> {
    try {
      const { data: contracts, error } = await supabase
        .from('framework_contracts')
        .select(`
          id,
          contract_number,
          supplier_id,
          start_date,
          end_date,
          status,
          total_value,
          payment_terms,
          delivery_terms,
          quality_standards,
          penalties,
          on_time_delivery_rate,
          quality_score,
          compliance_score,
          proveedores:supplier_id (
            id,
            nombre
          )
        `)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      
      const contractsWithMaterials = await Promise.all(
        (contracts || []).map(async (contract) => {
          // Obtener materiales del contrato
          const { data: materials } = await supabase
            .from('supplier_price_history')
            .select(`
              material_id,
              price,
              materiales (
                id,
                nombre
              )
            `)
            .eq('supplier_id', contract.supplier_id)
            .order('recorded_at', { ascending: false });
          
          // Obtener precios de mercado actuales
          const materialIds = materials?.map(m => m.material_id) || [];
          const { data: marketPrices } = await supabase
            .from('supplier_price_history')
            .select('material_id, price')
            .in('material_id', materialIds)
            .order('recorded_at', { ascending: false });
          
          const contractMaterials = materials?.map(material => {
            const marketPrice = this.getAverageMarketPrice(marketPrices || [], material.material_id);
            const savings = marketPrice - material.price;
            
            return {
              materialId: material.material_id,
              materialName: material.materiales?.[0]?.nombre || 'Material Desconocido',
              agreedPrice: material.price,
              currentMarketPrice: marketPrice,
              savings: savings > 0 ? savings : 0,
              quantity: 0 // Se debería obtener de otra tabla
            };
          }) || [];
          
          return {
            id: contract.id,
            contractNumber: contract.contract_number,
            supplierName: contract.proveedores?.[0]?.nombre || 'Proveedor Desconocido',
            supplierId: contract.supplier_id,
            startDate: contract.start_date,
            endDate: contract.end_date,
            status: contract.status as 'active' | 'expired' | 'pending' | 'cancelled',
            totalValue: contract.total_value,
            materials: contractMaterials,
            terms: {
              paymentTerms: contract.payment_terms,
              deliveryTerms: contract.delivery_terms,
              qualityStandards: contract.quality_standards,
              penalties: contract.penalties
            },
            performance: {
              onTimeDelivery: contract.on_time_delivery_rate,
              qualityScore: contract.quality_score,
              complianceScore: contract.compliance_score
            }
          };
        })
      );
      
      return contractsWithMaterials;
    } catch (error) {
      console.error('Error fetching framework contracts:', error);
      throw new Error('Error al obtener contratos marco');
    }
  }

  static async createFrameworkContract(contractData: Partial<FrameworkContract>): Promise<FrameworkContract> {
    try {
      const { data: contract, error } = await supabase
        .from('framework_contracts')
        .insert({
          contract_number: contractData.contractNumber,
          supplier_id: contractData.supplierId,
          start_date: contractData.startDate,
          end_date: contractData.endDate,
          status: contractData.status || 'pending',
          total_value: contractData.totalValue,
          payment_terms: contractData.terms?.paymentTerms,
          delivery_terms: contractData.terms?.deliveryTerms,
          quality_standards: contractData.terms?.qualityStandards,
          penalties: contractData.terms?.penalties,
          on_time_delivery_rate: contractData.performance?.onTimeDelivery || 0,
          quality_score: contractData.performance?.qualityScore || 0,
          compliance_score: contractData.performance?.complianceScore || 0
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return await this.getFrameworkContracts().then(contracts => 
        contracts.find(c => c.id === contract.id)!
      );
    } catch (error) {
      console.error('Error creating framework contract:', error);
      throw new Error('Error al crear contrato marco');
    }
  }

  // Helper methods
  private static calculatePriority(requerimientos: any[]): 'high' | 'medium' | 'low' {
    if (!requerimientos || requerimientos.length === 0) return 'low';
    
    const highPriorityCount = requerimientos.filter(req => req.prioridad === 'alta').length;
    const totalCount = requerimientos.length;
    
    if (highPriorityCount / totalCount > 0.5) return 'high';
    if (highPriorityCount > 0) return 'medium';
    return 'low';
  }

  private static estimateDeliveryTime(requerimientos: any[]): number {
    if (!requerimientos || requerimientos.length === 0) return 30;
    
    // Estimar tiempo basado en cantidad de materiales
    const totalItems = requerimientos.reduce((sum, req) => sum + req.cantidad, 0);
    return Math.max(30, Math.min(120, totalItems * 2)); // Entre 30 y 120 minutos
  }

  private static sortLocationsByPriorityAndDistance(locations: DeliveryLocation[], depot: any): DeliveryLocation[] {
    return locations.sort((a, b) => {
      // Primero por prioridad
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Luego por distancia
      const distanceA = this.calculateDistance(depot, a);
      const distanceB = this.calculateDistance(depot, b);
      return distanceA - distanceB;
    });
  }

  private static calculateDistance(point1: any, point2: any): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(point2.latitude - point1.latitude);
    const dLon = this.deg2rad(point2.longitude - point1.longitude);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(point1.latitude)) * Math.cos(this.deg2rad(point2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private static calculateTravelTime(point1: any, point2: any): number {
    const distance = this.calculateDistance(point1, point2);
    const averageSpeed = 30; // km/h en ciudad
    return (distance / averageSpeed) * 60; // minutos
  }

  private static calculateRouteEfficiency(stops: any[], totalDistance: number, totalTime: number): number {
    if (stops.length === 0) return 0;
    
    const baseEfficiency = 100;
    const distancePenalty = Math.min(totalDistance * 0.5, 20); // Penalizar rutas muy largas
    const timePenalty = Math.min(totalTime * 0.1, 15); // Penalizar rutas muy lentas
    
    return Math.max(0, baseEfficiency - distancePenalty - timePenalty);
  }

  private static async saveOptimizedRoute(route: OptimizedRoute): Promise<void> {
    try {
      const { error } = await supabase
        .from('delivery_routes')
        .insert({
          name: route.name,
          total_distance: route.totalDistance,
          total_time: route.totalTime,
          total_weight: route.totalWeight,
          vehicle_capacity: route.vehicleCapacity,
          efficiency_score: route.efficiency,
          route_data: JSON.stringify(route.stops)
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving optimized route:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  private static groupPricesByMaterial(prices: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    for (const price of prices) {
      if (!groups[price.material_id]) {
        groups[price.material_id] = [];
      }
      
      // Solo mantener el precio más reciente por proveedor
      const existingIndex = groups[price.material_id].findIndex(
        p => p.supplier_id === price.supplier_id
      );
      
      if (existingIndex === -1) {
        groups[price.material_id].push(price);
      } else if (new Date(price.recorded_at) > new Date(groups[price.material_id][existingIndex].recorded_at)) {
        groups[price.material_id][existingIndex] = price;
      }
    }
    
    return groups;
  }

  private static getPreviousPrice(prices: any[], supplierId: string, materialId: string): number | null {
    const supplierPrices = prices
      .filter(p => p.supplier_id === supplierId && p.material_id === materialId)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    
    return supplierPrices.length > 1 ? supplierPrices[1].price : null;
  }

  private static getAverageMarketPrice(marketPrices: any[], materialId: string): number {
    const materialPrices = marketPrices.filter(p => p.material_id === materialId);
    if (materialPrices.length === 0) return 0;
    
    return materialPrices.reduce((sum, p) => sum + p.price, 0) / materialPrices.length;
  }
}