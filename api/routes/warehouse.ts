import { Router } from 'express';
import { WarehouseService } from '../services/WarehouseService';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get pending picking items
router.get('/picking-items', async (req, res) => {
  try {
    const { workId } = req.query;
    const items = await WarehouseService.getPendingPickingItems(workId as string);
    
    res.json({
      success: true,
      data: items,
      message: 'Pending picking items retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching pending picking items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending picking items',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate optimized picking list
router.post('/picking-lists/generate', async (req, res) => {
  try {
    const { workerId, itemIds, maxWeight = 50, maxItems = 20 } = req.body;
    
    if (!workerId || !itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID and item IDs are required'
      });
    }

    // Get the items to include in the picking list
    const allItems = await WarehouseService.getPendingPickingItems();
    const selectedItems = allItems.filter(item => itemIds.includes(item.id));
    
    if (selectedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid items found for the provided IDs'
      });
    }

    const optimizedList = await WarehouseService.generateOptimizedPickingList(
      workerId,
      selectedItems,
      maxWeight,
      maxItems
    );
    
    res.json({
      success: true,
      data: optimizedList,
      message: 'Optimized picking list generated successfully'
    });
  } catch (error) {
    console.error('Error generating optimized picking list:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating optimized picking list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get worker's picking lists
router.get('/picking-lists/worker/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const pickingLists = await WarehouseService.getWorkerPickingLists(workerId);
    
    res.json({
      success: true,
      data: pickingLists,
      message: 'Worker picking lists retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching worker picking lists:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker picking lists',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update picking item status
router.patch('/picking-lists/:listId/items/:itemId', async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    const { status, actualQuantity } = req.body;
    
    if (!status || !['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (pending, in_progress, completed, cancelled)'
      });
    }

    await WarehouseService.updatePickingItemStatus(listId, itemId, status, actualQuantity);
    
    res.json({
      success: true,
      message: 'Picking item status updated successfully'
    });
  } catch (error) {
    console.error('Error updating picking item status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating picking item status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get location alerts
router.get('/alerts', async (req, res) => {
  try {
    const { workerId, severity } = req.query;
    const alerts = await WarehouseService.getLocationAlerts(
      workerId as string,
      severity as 'low' | 'medium' | 'high' | 'critical'
    );
    
    res.json({
      success: true,
      data: alerts,
      message: 'Location alerts retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching location alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location alerts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create location alert
router.post('/alerts', async (req, res) => {
  try {
    const alertData = req.body;
    
    // Validate required fields
    if (!alertData.type || !alertData.severity || !alertData.location || !alertData.message) {
      return res.status(400).json({
        success: false,
        message: 'Type, severity, location, and message are required'
      });
    }

    const alert = await WarehouseService.createLocationAlert(alertData);
    
    res.status(201).json({
      success: true,
      data: alert,
      message: 'Location alert created successfully'
    });
  } catch (error) {
    console.error('Error creating location alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating location alert',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Acknowledge alert
router.patch('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { workerId } = req.body;
    
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }

    await WarehouseService.acknowledgeAlert(alertId, workerId);
    
    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error acknowledging alert',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Resolve alert
router.patch('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { workerId } = req.body;
    
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }

    await WarehouseService.resolveAlert(alertId, workerId);
    
    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving alert',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get worker performance metrics
router.get('/performance/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const performance = await WarehouseService.getWorkerPerformance(
      workerId,
      startDate as string,
      endDate as string
    );
    
    res.json({
      success: true,
      data: performance,
      message: 'Worker performance metrics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching worker performance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker performance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get picking list statistics
router.get('/statistics/picking-lists', async (req, res) => {
  try {
    const { startDate, endDate, workerId } = req.query;
    
    // This would typically involve complex queries to get statistics
    // For now, returning mock data structure
    const statistics = {
      totalLists: 0,
      completedLists: 0,
      averageCompletionTime: 0,
      averageEfficiency: 0,
      totalItemsPicked: 0,
      accuracyRate: 0,
      topPerformers: [],
      dailyTrends: []
    };
    
    res.json({
      success: true,
      data: statistics,
      message: 'Picking list statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching picking list statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching picking list statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get alert statistics
router.get('/statistics/alerts', async (req, res) => {
  try {
    const { startDate, endDate, type, severity } = req.query;
    
    // This would typically involve complex queries to get statistics
    // For now, returning mock data structure
    const statistics = {
      totalAlerts: 0,
      resolvedAlerts: 0,
      averageResponseTime: 0,
      alertsByType: {},
      alertsBySeverity: {},
      alertsByLocation: {},
      trends: []
    };
    
    res.json({
      success: true,
      data: statistics,
      message: 'Alert statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching alert statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alert statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Bulk update picking items
router.patch('/picking-lists/:listId/items/bulk-update', async (req, res) => {
  try {
    const { listId } = req.params;
    const { updates } = req.body;
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates must be an array'
      });
    }

    // Process each update
    const results = [];
    for (const update of updates) {
      try {
        await WarehouseService.updatePickingItemStatus(
          listId,
          update.itemId,
          update.status,
          update.actualQuantity
        );
        results.push({ itemId: update.itemId, success: true });
      } catch (error) {
        results.push({ 
          itemId: update.itemId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      success: true,
      data: results,
      message: 'Bulk update completed'
    });
  } catch (error) {
    console.error('Error performing bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk update',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get warehouse layout information
router.get('/layout', async (req, res) => {
  try {
    // This would typically come from a warehouse layout configuration
    // For now, returning a mock structure
    const layout = {
      zones: [
        {
          id: 'A',
          name: 'Zona A - Materiales Pesados',
          aisles: [
            {
              id: '1',
              name: 'Pasillo 1',
              shelves: [
                { id: '1', name: 'Estante 1', positions: ['1', '2', '3', '4'] },
                { id: '2', name: 'Estante 2', positions: ['1', '2', '3', '4'] }
              ]
            },
            {
              id: '2',
              name: 'Pasillo 2',
              shelves: [
                { id: '1', name: 'Estante 1', positions: ['1', '2', '3', '4'] },
                { id: '2', name: 'Estante 2', positions: ['1', '2', '3', '4'] }
              ]
            }
          ]
        },
        {
          id: 'B',
          name: 'Zona B - Materiales Ligeros',
          aisles: [
            {
              id: '1',
              name: 'Pasillo 1',
              shelves: [
                { id: '1', name: 'Estante 1', positions: ['1', '2', '3', '4', '5', '6'] },
                { id: '2', name: 'Estante 2', positions: ['1', '2', '3', '4', '5', '6'] }
              ]
            }
          ]
        }
      ],
      entrances: [
        { id: 'main', name: 'Entrada Principal', coordinates: { x: 0, y: 0 } },
        { id: 'loading', name: 'Área de Carga', coordinates: { x: 100, y: 0 } }
      ],
      exits: [
        { id: 'dispatch', name: 'Área de Despacho', coordinates: { x: 50, y: 100 } }
      ]
    };
    
    res.json({
      success: true,
      data: layout,
      message: 'Warehouse layout retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching warehouse layout:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching warehouse layout',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;