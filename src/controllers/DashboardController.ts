import { Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService';

export class DashboardController {
  /**
   * Get dashboard statistics
   * GET /api/dashboard/stats
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const storeId = req.params['storeId'];
      const userRole = (req as any).user?.role;

      if (!storeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_STORE_ID',
            message: 'Store ID is required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const stats = await DashboardService.getDashboardStats(storeId, userRole);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('DashboardController.getStats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch dashboard statistics'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get inventory statistics for all stores owned by the user
   * GET /api/dashboard/stores-inventory
   */
  static async getOwnerStoresInventory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      // Only owners can access this endpoint
      if (userRole !== 'owner') {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only owners can access stores inventory statistics'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const storesStats = await DashboardService.getOwnerStoresInventoryStats(userId);

      res.json({
        success: true,
        data: storesStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('DashboardController.getOwnerStoresInventory error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch stores inventory statistics'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get defective products for a store
   * GET /api/dashboard/defective-products/:storeId
   */
  static async getDefectiveProducts(req: Request, res: Response): Promise<void> {
    try {
      const storeId = req.params['storeId'];

      if (!storeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_STORE_ID',
            message: 'Store ID is required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const defectiveProducts = await DashboardService.getDefectiveProducts(storeId);

      res.json({
        success: true,
        data: defectiveProducts,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('DashboardController.getDefectiveProducts error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch defective products'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get global summary for all owned stores
   * GET /api/dashboard/global-summary
   */
  static async getGlobalSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      // Only owners can access this endpoint
      if (userRole !== 'owner') {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only owners can access global summary'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const summary = await DashboardService.getGlobalSummary(userId);

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('DashboardController.getGlobalSummary error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch global summary'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}
