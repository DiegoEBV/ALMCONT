import { supabase } from '@/lib/supabase';

// Interfaces para el dashboard de logística
export interface DeliveryLocation {
  id: string;
  workId: string;
  workName: string;
  address: string;
  latitude: number;
  longitude: number;
  priority: 'high' | 'medium' | 'low';
  estimatedDeliveryTime: number;
  materials: {
    materialId: string;
    materialName: string;
    quantity: number;
    weight: number;
  }[];
}

export interface PriceComparison {
  materialId: string;
  materialName: string;
  suppliers: {
    supplierId: string;
    supplierName: string;
    price: number;
    availability: boolean;
    deliveryTime: number;
  }[];
  bestPrice: number;
  savings: number;
}

export interface FrameworkContract {
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

export interface OptimizedRoute {
  id: string;
  locations: DeliveryLocation[];
  totalDistance: number;
  estimatedTime: number;
  vehicleCapacity: number;
  totalWeight: number;
  route: string[];
  savings: {
    distance: number;
    time: number;
    fuel: number;
  };
}

class LogisticsService {
  // Obtener ubicaciones de entrega basadas en obras activas
  async getDeliveryLocations(): Promise<DeliveryLocation[]> {
    try {
      const { data: obras, error: obrasError } = await supabase
        .from('obras')
        .select(`
          id,
          nombre,
          direccion,
          estado,
          requerimientos (
            id,
            cantidad_solicitada,
            estado,
            materiales (
              id,
              nombre,
              peso_unitario
            )
          )
        `)
        .eq('estado', 'ACTIVA');

      if (obrasError) throw obrasError;

      const locations: DeliveryLocation[] = (obras || []).map((obra, index) => {
        const requerimientos = obra.requerimientos || [];
        const materials = requerimientos.map(req => {
          const material = Array.isArray(req.materiales) ? req.materiales[0] : req.materiales;
          return {
            materialId: material?.id || '',
            materialName: material?.nombre || 'Material desconocido',
            quantity: req.cantidad_solicitada || 0,
            weight: (req.cantidad_solicitada || 0) * 1 // Peso simulado
          };
        });

        // Simular coordenadas para Lima, Perú
        const baseLatitude = -12.0464;
        const baseLongitude = -77.0428;
        const randomOffset = () => (Math.random() - 0.5) * 0.1;

        return {
          id: obra.id,
          workId: obra.id,
          workName: obra.nombre,
          address: obra.direccion || 'Dirección no especificada',
          latitude: baseLatitude + randomOffset(),
          longitude: baseLongitude + randomOffset(),
          priority: index % 3 === 0 ? 'high' : index % 2 === 0 ? 'medium' : 'low',
          estimatedDeliveryTime: Math.floor(Math.random() * 120) + 30, // 30-150 minutos
          materials
        };
      });

      return locations;
    } catch (error) {
      console.error('Error fetching delivery locations:', error);
      return [];
    }
  }

  // Obtener comparaciones de precios basadas en materiales y proveedores
  async getSupplierPrices(): Promise<PriceComparison[]> {
    try {
      const { data: materiales, error: materialesError } = await supabase
        .from('materiales')
        .select('id, nombre, precio_unitario')
        .limit(10);

      if (materialesError) throw materialesError;

      const { data: proveedores, error: proveedoresError } = await supabase
        .from('proveedores')
        .select('id, nombre, contacto')
        .limit(5);

      if (proveedoresError) throw proveedoresError;

      const priceComparisons: PriceComparison[] = (materiales || []).map(material => {
        const basePrice = material.precio_unitario || 100;
        const suppliers = (proveedores || []).map(proveedor => {
          const priceVariation = (Math.random() - 0.5) * 0.3; // ±15% variación
          const price = basePrice * (1 + priceVariation);
          
          return {
            supplierId: proveedor.id,
            supplierName: proveedor.nombre,
            price: Math.round(price * 100) / 100,
            availability: Math.random() > 0.2, // 80% disponibilidad
            deliveryTime: Math.floor(Math.random() * 14) + 1 // 1-14 días
          };
        });

        const availableSuppliers = suppliers.filter(s => s.availability);
        const bestPrice = availableSuppliers.length > 0 
          ? Math.min(...availableSuppliers.map(s => s.price))
          : basePrice;
        const savings = basePrice - bestPrice;

        return {
          materialId: material.id,
          materialName: material.nombre,
          suppliers,
          bestPrice,
          savings: Math.max(0, savings)
        };
      });

      return priceComparisons;
    } catch (error) {
      console.error('Error fetching supplier prices:', error);
      return [];
    }
  }

  // Obtener contratos marco (simulados por ahora)
  async getFrameworkContracts(): Promise<FrameworkContract[]> {
    try {
      const { data: proveedores, error } = await supabase
        .from('proveedores')
        .select('id, nombre')
        .limit(3);

      if (error) throw error;

      const contracts: FrameworkContract[] = (proveedores || []).map((proveedor, index) => {
        const contractNumber = `CTR-2024-${String(index + 1).padStart(3, '0')}`;
        const startDate = new Date(2024, 0, 1).toISOString().split('T')[0];
        const endDate = new Date(2024, 11, 31).toISOString().split('T')[0];
        
        return {
          id: proveedor.id,
          contractNumber,
          supplierName: proveedor.nombre,
          supplierId: proveedor.id,
          startDate,
          endDate,
          status: 'active',
          totalValue: Math.floor(Math.random() * 500000) + 100000,
          materials: [
            {
              materialId: 'MAT-001',
              materialName: 'Cemento Portland',
              agreedPrice: 24.50,
              currentMarketPrice: 25.50,
              savings: 1.00,
              quantity: 1000
            }
          ],
          terms: {
            paymentTerms: '30 días',
            deliveryTerms: 'FOB Almacén',
            qualityStandards: 'ISO 9001',
            penalties: '2% por retraso'
          },
          performance: {
            onTimeDelivery: Math.floor(Math.random() * 20) + 80,
            qualityScore: Math.floor(Math.random() * 15) + 85,
            complianceScore: Math.floor(Math.random() * 25) + 75
          }
        };
      });

      return contracts;
    } catch (error) {
      console.error('Error fetching framework contracts:', error);
      return [];
    }
  }

  // Optimizar ruta (simulado)
  async optimizeRoute(locationIds: string[], vehicleCapacity: number): Promise<OptimizedRoute | null> {
    try {
      const locations = await this.getDeliveryLocations();
      const selectedLocations = locations.filter(loc => locationIds.includes(loc.id));
      
      if (selectedLocations.length === 0) return null;

      const totalWeight = selectedLocations.reduce((sum, loc) => 
        sum + loc.materials.reduce((matSum, mat) => matSum + mat.weight, 0), 0
      );

      if (totalWeight > vehicleCapacity) {
        throw new Error('El peso total excede la capacidad del vehículo');
      }

      // Simular optimización de ruta
      const optimizedRoute: OptimizedRoute = {
        id: crypto.randomUUID(),
        locations: selectedLocations,
        totalDistance: Math.floor(Math.random() * 100) + 20, // 20-120 km
        estimatedTime: Math.floor(Math.random() * 180) + 60, // 60-240 minutos
        vehicleCapacity,
        totalWeight,
        route: selectedLocations.map(loc => loc.id),
        savings: {
          distance: Math.floor(Math.random() * 30) + 10, // 10-40 km ahorrados
          time: Math.floor(Math.random() * 60) + 20, // 20-80 minutos ahorrados
          fuel: Math.floor(Math.random() * 50) + 15 // 15-65 litros ahorrados
        }
      };

      return optimizedRoute;
    } catch (error) {
      console.error('Error optimizing route:', error);
      throw error;
    }
  }

  // Crear nuevo contrato
  async createContract(contractData: Partial<FrameworkContract>): Promise<FrameworkContract> {
    try {
      // Por ahora simulamos la creación del contrato
      const newContract: FrameworkContract = {
        id: crypto.randomUUID(),
        contractNumber: `CTR-2024-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
        supplierName: contractData.supplierName || 'Proveedor Nuevo',
        supplierId: contractData.supplierId || crypto.randomUUID(),
        startDate: contractData.startDate || new Date().toISOString().split('T')[0],
        endDate: contractData.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        totalValue: contractData.totalValue || 0,
        materials: contractData.materials || [],
        terms: contractData.terms || {
          paymentTerms: '30 días',
          deliveryTerms: 'FOB Almacén',
          qualityStandards: 'ISO 9001',
          penalties: '2% por retraso'
        },
        performance: {
          onTimeDelivery: 0,
          qualityScore: 0,
          complianceScore: 0
        }
      };

      return newContract;
    } catch (error) {
      console.error('Error creating contract:', error);
      throw error;
    }
  }
}

export default new LogisticsService();