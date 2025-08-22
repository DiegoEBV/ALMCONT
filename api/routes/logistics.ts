import express from 'express';
import { LogisticsService } from '../services/LogisticsService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Route Optimization Endpoints

/**
 * GET /api/logistics/delivery-locations
 * Obtener todas las ubicaciones de entrega disponibles
 */
router.get('/delivery-locations', async (req, res) => {
  try {
    const locations = await LogisticsService.getDeliveryLocations();
    
    res.json({
      success: true,
      data: locations,
      message: 'Ubicaciones de entrega obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error fetching delivery locations:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * POST /api/logistics/optimize-route
 * Optimizar ruta de entrega
 * Body: { locationIds: string[], vehicleCapacity?: number }
 */
router.post('/optimize-route', async (req, res) => {
  try {
    const { locationIds, vehicleCapacity = 5000 } = req.body;
    
    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        message: 'Se requiere un array de IDs de ubicaciones'
      });
    }
    
    // Obtener todas las ubicaciones y filtrar por IDs solicitados
    const allLocations = await LogisticsService.getDeliveryLocations();
    const selectedLocations = allLocations.filter(loc => locationIds.includes(loc.id));
    
    if (selectedLocations.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ubicaciones no encontradas',
        message: 'No se encontraron ubicaciones válidas para los IDs proporcionados'
      });
    }
    
    const optimizedRoute = await LogisticsService.optimizeRoute(selectedLocations, vehicleCapacity);
    
    res.json({
      success: true,
      data: optimizedRoute,
      message: 'Ruta optimizada exitosamente'
    });
  } catch (error) {
    console.error('Error optimizing route:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Price Comparison Endpoints

/**
 * GET /api/logistics/supplier-prices
 * Obtener comparación de precios de proveedores
 * Query params: materialIds (comma-separated string, optional)
 */
router.get('/supplier-prices', async (req, res) => {
  try {
    const { materialIds } = req.query;
    
    let materialIdArray: string[] | undefined;
    if (materialIds && typeof materialIds === 'string') {
      materialIdArray = materialIds.split(',').filter(id => id.trim().length > 0);
    }
    
    const priceComparisons = await LogisticsService.getSupplierPrices(materialIdArray);
    
    res.json({
      success: true,
      data: priceComparisons,
      message: 'Comparación de precios obtenida exitosamente'
    });
  } catch (error) {
    console.error('Error fetching supplier prices:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/logistics/price-analysis/:materialId
 * Obtener análisis detallado de precios para un material específico
 */
router.get('/price-analysis/:materialId', async (req, res) => {
  try {
    const { materialId } = req.params;
    
    if (!materialId) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido',
        message: 'Se requiere el ID del material'
      });
    }
    
    const priceComparisons = await LogisticsService.getSupplierPrices([materialId]);
    
    if (priceComparisons.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Material no encontrado',
        message: 'No se encontraron datos de precios para el material especificado'
      });
    }
    
    const analysis = priceComparisons[0];
    
    // Agregar análisis adicional
    const enhancedAnalysis = {
      ...analysis,
      insights: {
        totalSuppliers: analysis.suppliers.length,
        availableSuppliers: analysis.suppliers.filter(s => s.availability === 'available').length,
        priceVolatility: calculatePriceVolatility(analysis.suppliers),
        recommendedSupplier: getRecommendedSupplier(analysis.suppliers),
        marketTrend: analyzePriceTrend(analysis.suppliers)
      }
    };
    
    res.json({
      success: true,
      data: enhancedAnalysis,
      message: 'Análisis de precios obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error fetching price analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Contract Management Endpoints

/**
 * GET /api/logistics/contracts
 * Obtener todos los contratos marco
 */
router.get('/contracts', async (req, res) => {
  try {
    const contracts = await LogisticsService.getFrameworkContracts();
    
    res.json({
      success: true,
      data: contracts,
      message: 'Contratos marco obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * POST /api/logistics/contracts
 * Crear un nuevo contrato marco
 */
router.post('/contracts', async (req, res) => {
  try {
    const contractData = req.body;
    
    // Validaciones básicas
    if (!contractData.contractNumber || !contractData.supplierId) {
      return res.status(400).json({
        success: false,
        error: 'Datos requeridos',
        message: 'Se requieren número de contrato y ID del proveedor'
      });
    }
    
    const newContract = await LogisticsService.createFrameworkContract(contractData);
    
    res.status(201).json({
      success: true,
      data: newContract,
      message: 'Contrato marco creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/logistics/contracts/:contractId
 * Obtener detalles de un contrato específico
 */
router.get('/contracts/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const contracts = await LogisticsService.getFrameworkContracts();
    const contract = contracts.find(c => c.id === contractId);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado',
        message: 'No se encontró el contrato especificado'
      });
    }
    
    res.json({
      success: true,
      data: contract,
      message: 'Contrato obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/logistics/contracts/performance/summary
 * Obtener resumen de rendimiento de contratos
 */
router.get('/contracts/performance/summary', async (req, res) => {
  try {
    const contracts = await LogisticsService.getFrameworkContracts();
    
    const summary = {
      totalContracts: contracts.length,
      activeContracts: contracts.filter(c => c.status === 'active').length,
      expiredContracts: contracts.filter(c => c.status === 'expired').length,
      totalValue: contracts.reduce((sum, c) => sum + c.totalValue, 0),
      averagePerformance: {
        onTimeDelivery: contracts.reduce((sum, c) => sum + c.performance.onTimeDelivery, 0) / contracts.length,
        qualityScore: contracts.reduce((sum, c) => sum + c.performance.qualityScore, 0) / contracts.length,
        complianceScore: contracts.reduce((sum, c) => sum + c.performance.complianceScore, 0) / contracts.length
      },
      topPerformers: contracts
        .sort((a, b) => {
          const scoreA = (a.performance.onTimeDelivery + a.performance.qualityScore + a.performance.complianceScore) / 3;
          const scoreB = (b.performance.onTimeDelivery + b.performance.qualityScore + b.performance.complianceScore) / 3;
          return scoreB - scoreA;
        })
        .slice(0, 5)
        .map(c => ({
          contractId: c.id,
          supplierName: c.supplierName,
          overallScore: (c.performance.onTimeDelivery + c.performance.qualityScore + c.performance.complianceScore) / 3
        }))
    };
    
    res.json({
      success: true,
      data: summary,
      message: 'Resumen de rendimiento obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error fetching contract performance summary:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Helper functions for price analysis
interface SupplierPriceData {
  currentPrice: number;
  availability: 'available' | 'limited' | 'unavailable';
  leadTime: number;
  priceChangePercent: number;
  [key: string]: any;
}

function calculatePriceVolatility(suppliers: SupplierPriceData[]): number {
  if (suppliers.length < 2) return 0;
  
  const prices = suppliers.map(s => s.currentPrice);
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  const standardDeviation = Math.sqrt(variance);
  
  return (standardDeviation / mean) * 100; // Coefficient of variation as percentage
}

function getRecommendedSupplier(suppliers: SupplierPriceData[]): SupplierPriceData & { score: number } {
  // Scoring algorithm considering price, availability, and lead time
  const scoredSuppliers = suppliers.map(supplier => {
    let score = 0;
    
    // Price score (lower is better, max 40 points)
    const minPrice = Math.min(...suppliers.map(s => s.currentPrice));
    const priceScore = supplier.currentPrice === minPrice ? 40 : 40 * (minPrice / supplier.currentPrice);
    score += priceScore;
    
    // Availability score (max 30 points)
    const availabilityScore = supplier.availability === 'available' ? 30 : 
                             supplier.availability === 'limited' ? 15 : 0;
    score += availabilityScore;
    
    // Lead time score (lower is better, max 20 points)
    const maxLeadTime = Math.max(...suppliers.map(s => s.leadTime));
    const leadTimeScore = maxLeadTime === 0 ? 20 : 20 * (1 - (supplier.leadTime / maxLeadTime));
    score += leadTimeScore;
    
    // Price trend score (max 10 points)
    const trendScore = supplier.priceChangePercent <= 0 ? 10 : 
                      supplier.priceChangePercent < 5 ? 5 : 0;
    score += trendScore;
    
    return { ...supplier, score };
  });
  
  return scoredSuppliers.sort((a, b) => b.score - a.score)[0];
}

function analyzePriceTrend(suppliers: SupplierPriceData[]): 'increasing' | 'decreasing' | 'stable' {
  const avgPriceChange = suppliers.reduce((sum, s) => sum + s.priceChangePercent, 0) / suppliers.length;
  
  if (avgPriceChange > 2) return 'increasing';
  if (avgPriceChange < -2) return 'decreasing';
  return 'stable';
}

export default router;