import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import logisticsService from '../services/logisticsService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MapPin,
  Route,
  Clock,
  Truck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Package,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryLocation {
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

interface OptimizedRoute {
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

interface PriceComparison {
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

const LogisticsDashboard: React.FC = () => {
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [priceComparisons, setPriceComparisons] = useState<PriceComparison[]>([]);
  const [contracts, setContracts] = useState<FrameworkContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [vehicleCapacity, setVehicleCapacity] = useState(5000);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewContractDialog, setShowNewContractDialog] = useState(false);
  const [newContract, setNewContract] = useState<Partial<FrameworkContract>>({});
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (!mountedRef.current) return;

      // Fetch delivery locations
      const locationsResponse = await logisticsService.getDeliveryLocations();
      if (mountedRef.current) {
        setDeliveryLocations(locationsResponse || []);
      }

      // Fetch price comparisons
      const pricesResponse = await logisticsService.getSupplierPrices();
      if (mountedRef.current) {
        setPriceComparisons(pricesResponse || []);
      }

      // Mock contracts data since we don't have a backend endpoint
      const mockContracts: FrameworkContract[] = [
        {
          id: '1',
          contractNumber: 'CTR-2024-001',
          supplierName: 'Proveedor ABC',
          supplierId: 'SUP-001',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          status: 'active',
          totalValue: 150000,
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
            onTimeDelivery: 95,
            qualityScore: 98,
            complianceScore: 92
          }
        }
      ];
      if (mountedRef.current) {
        setContracts(mockContracts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (mountedRef.current) {
        toast.error('Error al cargar los datos');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const optimizeRoute = async () => {
    if (selectedLocations.length === 0) {
      toast.error('Selecciona al menos una ubicación para optimizar la ruta');
      return;
    }

    try {
      const optimizedRoute = await logisticsService.optimizeRoute(
        selectedLocations,
        vehicleCapacity
      );
      
      setOptimizedRoute(optimizedRoute);
      toast.success('Ruta optimizada exitosamente');
    } catch (error) {
      console.error('Error optimizing route:', error);
      toast.error('Error al optimizar la ruta');
    }
  };

  const createContract = async () => {
    try {
      const response = await logisticsService.createContract(newContract);
      setContracts([...contracts, response]);
      setShowNewContractDialog(false);
      setNewContract({});
      toast.success('Contrato creado exitosamente');
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('Error al crear el contrato');
    }
  };

  const handleLocationSelection = (locationId: string, checked: boolean) => {
    if (checked) {
      setSelectedLocations([...selectedLocations, locationId]);
    } else {
      setSelectedLocations(selectedLocations.filter(id => id !== locationId));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPriceComparisons = priceComparisons.filter(comparison =>
    comparison.materialName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    mountedRef.current = true;
    
    const loadData = async () => {
      if (!mountedRef.current) return;
      
      try {
        await fetchData();
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadData();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Logística</h1>
          <p className="text-gray-600 mt-1">Optimización de rutas, precios y contratos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="routes">Optimización de Rutas</TabsTrigger>
          <TabsTrigger value="prices">Comparador de Precios</TabsTrigger>
          <TabsTrigger value="contracts">Gestión de Contratos</TabsTrigger>
        </TabsList>

        {/* Route Optimization Tab */}
        <TabsContent value="routes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Location Selection */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Ubicaciones de Entrega
                  </CardTitle>
                  <CardDescription>
                    Selecciona las ubicaciones para optimizar la ruta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="capacity">Capacidad del Vehículo (kg)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={vehicleCapacity}
                      onChange={(e) => setVehicleCapacity(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {deliveryLocations.map((location) => (
                      <div key={location.id} className="flex items-center space-x-2 p-2 border rounded">
                        <Checkbox
                          id={location.id}
                          checked={selectedLocations.includes(location.id)}
                          onCheckedChange={(checked) => 
                            handleLocationSelection(location.id, checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          <Label htmlFor={location.id} className="text-sm font-medium">
                            {location.workName}
                          </Label>
                          <p className="text-xs text-gray-500">{location.address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getPriorityColor(location.priority)}>
                              {location.priority}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {location.materials.length} materiales
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={optimizeRoute} 
                    className="w-full"
                    disabled={selectedLocations.length === 0}
                  >
                    <Route className="h-4 w-4 mr-2" />
                    Optimizar Ruta
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Optimized Route Display */}
            <div className="lg:col-span-2">
              {optimizedRoute ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Ruta Optimizada
                    </CardTitle>
                    <CardDescription>
                      Ruta optimizada para {optimizedRoute.locations.length} ubicaciones
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Route Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {optimizedRoute.totalDistance.toFixed(1)} km
                        </p>
                        <p className="text-sm text-gray-500">Distancia Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {Math.round(optimizedRoute.estimatedTime)} min
                        </p>
                        <p className="text-sm text-gray-500">Tiempo Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {optimizedRoute.totalWeight.toFixed(0)} kg
                        </p>
                        <p className="text-sm text-gray-500">Peso Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">
                          {optimizedRoute.savings.fuel.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-500">Eficiencia</p>
                      </div>
                    </div>

                    {/* Route Stops */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">Paradas de la Ruta</h4>
                      {optimizedRoute.locations.map((location, index) => (
                        <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {index + 1}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{location.workName}</p>
                            <p className="text-sm text-gray-500">{location.address}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                Tiempo estimado: {location.estimatedDeliveryTime} min
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getPriorityColor(location.priority)}>
                              {location.priority}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {location.materials.length} materiales
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <Route className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No hay ruta optimizada
                      </h3>
                      <p className="text-gray-500">
                        Selecciona ubicaciones y optimiza una ruta para ver los resultados
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Price Comparison Tab */}
        <TabsContent value="prices" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Comparador de Precios</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Buscar material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredPriceComparisons.map((comparison) => (
              <Card key={comparison.materialId}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{comparison.materialName}</CardTitle>
                      <CardDescription>ID: {comparison.materialId}</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Mejor Precio</p>
                      <p className="text-2xl font-bold text-green-600">
                        S/ {comparison.bestPrice.toFixed(2)}
                      </p>
                      <p className="text-sm text-green-600">
                        Ahorro: S/ {comparison.savings.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                      <span>Proveedores Disponibles</span>
                      <span>{comparison.suppliers.filter(s => s.availability).length} de {comparison.suppliers.length}</span>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Disponibilidad</TableHead>
                        <TableHead>Tiempo Entrega</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.suppliers.map((supplier) => (
                        <TableRow key={supplier.supplierId}>
                          <TableCell className="font-medium">
                            {supplier.supplierName}
                            {supplier.price === comparison.bestPrice && (
                              <Badge className="ml-2 bg-green-100 text-green-800">Mejor</Badge>
                            )}
                          </TableCell>
                          <TableCell>S/ {supplier.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={`${
                              supplier.availability ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {supplier.availability ? 'Disponible' : 'No disponible'}
                            </Badge>
                          </TableCell>
                          <TableCell>{supplier.deliveryTime} días</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Contract Management Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Gestión de Contratos Marco</h3>
            <Dialog open={showNewContractDialog} onOpenChange={setShowNewContractDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Contrato
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Contrato Marco</DialogTitle>
                  <DialogDescription>
                    Ingresa los detalles del nuevo contrato marco
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contractNumber">Número de Contrato</Label>
                    <Input
                      id="contractNumber"
                      value={newContract.contractNumber || ''}
                      onChange={(e) => setNewContract({...newContract, contractNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplierId">ID del Proveedor</Label>
                    <Input
                      id="supplierId"
                      value={newContract.supplierId || ''}
                      onChange={(e) => setNewContract({...newContract, supplierId: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="startDate">Fecha de Inicio</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newContract.startDate || ''}
                      onChange={(e) => setNewContract({...newContract, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Fecha de Fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newContract.endDate || ''}
                      onChange={(e) => setNewContract({...newContract, endDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalValue">Valor Total</Label>
                    <Input
                      id="totalValue"
                      type="number"
                      value={newContract.totalValue || ''}
                      onChange={(e) => setNewContract({...newContract, totalValue: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Estado</Label>
                    <Select
                      value={newContract.status || 'pending'}
                      onValueChange={(value) => setNewContract({...newContract, status: value as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="expired">Expirado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewContractDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createContract}>
                    Crear Contrato
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {contracts.map((contract) => (
              <Card key={contract.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {contract.contractNumber}
                      </CardTitle>
                      <CardDescription>{contract.supplierName}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(contract.status)}>
                        {contract.status === 'active' ? 'Activo' :
                         contract.status === 'expired' ? 'Expirado' :
                         contract.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                      </Badge>
                      <span className="text-lg font-bold">
                        S/ {contract.totalValue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Fecha de Inicio</p>
                      <p className="font-medium">{new Date(contract.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fecha de Fin</p>
                      <p className="font-medium">{new Date(contract.endDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Materiales</p>
                      <p className="font-medium">{contract.materials.length} materiales</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {contract.performance.onTimeDelivery.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500">Entrega a Tiempo</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {contract.performance.qualityScore.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500">Calidad</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {contract.performance.complianceScore.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500">Cumplimiento</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h5 className="font-medium mb-2">Términos del Contrato</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Términos de Pago:</p>
                        <p>{contract.terms.paymentTerms}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Términos de Entrega:</p>
                        <p>{contract.terms.deliveryTerms}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LogisticsDashboard;