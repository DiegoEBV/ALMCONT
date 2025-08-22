import { Router } from 'express';
import { analyticsService } from '../services/AnalyticsService.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRole } from '../middleware/roleValidation.js';

const router = Router();

/**
 * @route GET /api/analytics/kpis
 * @desc Obtiene los KPIs principales del sistema
 * @access Private (Coordinación)
 */
router.get('/kpis', authenticateToken, validateRole(['coordinacion', 'admin']), async (req, res) => {
  try {
    const kpis = await analyticsService.getKPIs();
    res.json({
      success: true,
      data: kpis
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los KPIs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/analytics/work-comparisons
 * @desc Obtiene comparación entre obras
 * @access Private (Coordinación)
 */
router.get('/work-comparisons', authenticateToken, validateRole(['coordinacion', 'admin']), async (req, res) => {
  try {
    const comparisons = await analyticsService.getWorkComparisons();
    res.json({
      success: true,
      data: comparisons
    });
  } catch (error) {
    console.error('Error fetching work comparisons:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener comparaciones entre obras',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/analytics/worker-efficiency
 * @desc Obtiene eficiencia de almaceneros
 * @access Private (Coordinación)
 */
router.get('/worker-efficiency', authenticateToken, validateRole(['coordinacion', 'admin']), async (req, res) => {
  try {
    const efficiency = await analyticsService.getWarehouseWorkerEfficiency();
    res.json({
      success: true,
      data: efficiency
    });
  } catch (error) {
    console.error('Error fetching worker efficiency:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener eficiencia de almaceneros',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/analytics/trends
 * @desc Obtiene tendencias históricas
 * @access Private (Coordinación)
 */
router.get('/trends', authenticateToken, validateRole(['coordinacion', 'admin']), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const trends = await analyticsService.getTrends(days);
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tendencias',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/analytics/dashboard
 * @desc Obtiene todas las métricas del dashboard
 * @access Private (Coordinación)
 */
router.get('/dashboard', authenticateToken, validateRole(['coordinacion', 'admin']), async (req, res) => {
  try {
    const metrics = await analyticsService.getDashboardMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener métricas del dashboard',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/analytics/metrics
 * @desc Guarda una métrica calculada
 * @access Private (Sistema)
 */
router.post('/metrics', authenticateToken, async (req, res) => {
  try {
    const {
      metricType,
      entityType,
      entityId,
      periodStart,
      periodEnd,
      metricValue,
      metadata
    } = req.body;

    if (!metricType || metricValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'metricType y metricValue son requeridos'
      });
    }

    const metric = await analyticsService.saveCalculatedMetric(
      metricType,
      entityType || null,
      entityId || null,
      periodStart || null,
      periodEnd || null,
      metricValue,
      metadata || {}
    );

    res.status(201).json({
      success: true,
      data: metric
    });
  } catch (error) {
    console.error('Error saving metric:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar métrica',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/analytics/metrics/:type
 * @desc Obtiene métricas calculadas por tipo
 * @access Private (Coordinación)
 */
router.get('/metrics/:type', authenticateToken, validateRole(['coordinacion', 'admin']), async (req, res) => {
  try {
    const { type } = req.params;
    const { entityType, entityId, limit } = req.query;

    const metrics = await analyticsService.getCalculatedMetrics(
      type,
      entityType as string,
      entityId as string,
      parseInt(limit as string) || 100
    );

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching calculated metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener métricas calculadas',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/analytics/reports/efficiency
 * @desc Genera reporte de eficiencia por almacenero
 * @access Private (Coordinación)
 */
router.get('/reports/efficiency', authenticateToken, validateRole(['coordinacion', 'admin']), async (req, res) => {
  try {
    const { workerId, startDate, endDate } = req.query;
    
    // Obtener eficiencia general
    const workerEfficiency = await analyticsService.getWarehouseWorkerEfficiency();
    
    // Filtrar por trabajador si se especifica
    let filteredData = workerEfficiency;
    if (workerId) {
      filteredData = workerEfficiency.filter(worker => worker.workerId === workerId);
    }
    
    // Generar reporte
    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate || 'N/A',
        end: endDate || 'N/A'
      },
      summary: {
        totalWorkers: filteredData.length,
        averageEfficiency: filteredData.length > 0 
          ? filteredData.reduce((sum, w) => sum + w.accuracy, 0) / filteredData.length 
          : 0,
        topPerformer: filteredData.length > 0 
          ? filteredData.reduce((prev, current) => 
              prev.productivity > current.productivity ? prev : current
            )
          : null
      },
      workers: filteredData
    };
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating efficiency report:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de eficiencia',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/analytics/reports/works
 * @desc Genera reporte comparativo entre obras
 * @access Private (Coordinación)
 */
router.get('/reports/works', authenticateToken, validateRole(['coordinacion', 'admin']), async (req, res) => {
  try {
    const { workIds } = req.query;
    
    // Obtener comparaciones entre obras
    let workComparisons = await analyticsService.getWorkComparisons();
    
    // Filtrar por obras específicas si se especifica
    if (workIds) {
      const ids = Array.isArray(workIds) ? workIds : [workIds];
      workComparisons = workComparisons.filter(work => ids.includes(work.workId));
    }
    
    // Generar reporte
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalWorks: workComparisons.length,
        averageEfficiency: workComparisons.length > 0 
          ? workComparisons.reduce((sum, w) => sum + w.efficiency, 0) / workComparisons.length 
          : 0,
        totalStockValue: workComparisons.reduce((sum, w) => sum + w.stockValue, 0),
        totalRequests: workComparisons.reduce((sum, w) => sum + w.totalRequests, 0),
        bestPerforming: workComparisons.length > 0 
          ? workComparisons.reduce((prev, current) => 
              prev.efficiency > current.efficiency ? prev : current
            )
          : null
      },
      works: workComparisons
    };
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating works report:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de obras',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;