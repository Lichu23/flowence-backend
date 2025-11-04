/**
 * Stock Controller
 * Handles dual-stock operations with role-based permissions
 */

import { Request, Response } from 'express';
import { StockService } from '../services/StockService';
import { RestockOperation, StockAdjustment } from '../types/product';

export class StockController {
  private static stockService = new StockService();

  /**
   * Restock product: Move stock from warehouse to sales floor
   * POST /api/products/:productId/restock
   * Available to: employee, owner
   */
  static async restockProduct(req: Request, res: Response): Promise<void> {
    try {
      const { productId, storeId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).storeRole;
      const { quantity, notes } = req.body;

      // Validate inputs
      if (!productId || !storeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Product ID and Store ID are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!quantity || quantity <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Quantity must be a positive number'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check permissions
      if (!StockService.validateStockPermissions(userRole, 'restock')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to restock products'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const operation: RestockOperation = {
        product_id: productId,
        quantity: parseInt(quantity),
        performed_by: userId,
        notes: notes
      };

      const result = await StockController.stockService.restockProduct(
        productId,
        storeId,
        operation
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'RESTOCK_FAILED',
            message: result.message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: {
          product: result.updated_product,
          movement_id: result.movement_id,
          message: result.message
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('StockController.restockProduct error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to restock product'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Adjust warehouse stock
   * PUT /api/products/:productId/stock/warehouse
   * Available to: owner
   */
  static async adjustWarehouseStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId, storeId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).storeRole;
      const { adjustment_type, quantity, reason, notes } = req.body;

      // Validate inputs
      if (!productId || !storeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Product ID and Store ID are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!adjustment_type || !['increase', 'decrease', 'set'].includes(adjustment_type)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ADJUSTMENT_TYPE',
            message: 'Adjustment type must be: increase, decrease, or set'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!quantity || quantity < 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Quantity must be a non-negative number'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!reason || reason.trim() === '') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REASON',
            message: 'Reason is required for stock adjustments'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check permissions
      if (!StockService.validateStockPermissions(userRole, 'adjust_warehouse')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only owners can adjust warehouse stock'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const adjustment: StockAdjustment = {
        product_id: productId,
        stock_type: 'deposito',
        adjustment_type,
        quantity: parseInt(quantity),
        reason: reason.trim(),
        performed_by: userId,
        notes: notes
      };

      const result = await StockController.stockService.adjustWarehouseStock(
        productId,
        storeId,
        adjustment,
        userRole
      );

      res.json({
        success: true,
        data: {
          product: result.updated_product,
          movement_id: result.movement_id,
          message: result.message
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('StockController.adjustWarehouseStock error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to adjust warehouse stock'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Adjust sales floor stock
   * PUT /api/products/:productId/stock/sales
   * Available to: owner
   */
  static async adjustSalesStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId, storeId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).storeRole;
      const { adjustment_type, quantity, reason, notes } = req.body;

      // Validate inputs
      if (!productId || !storeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Product ID and Store ID are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!adjustment_type || !['increase', 'decrease', 'set'].includes(adjustment_type)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ADJUSTMENT_TYPE',
            message: 'Adjustment type must be: increase, decrease, or set'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!quantity || quantity < 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Quantity must be a non-negative number'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!reason || reason.trim() === '') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REASON',
            message: 'Reason is required for stock adjustments'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check permissions
      if (!StockService.validateStockPermissions(userRole, 'adjust_sales')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only owners can adjust sales floor stock'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const adjustment: StockAdjustment = {
        product_id: productId,
        stock_type: 'venta',
        adjustment_type,
        quantity: parseInt(quantity),
        reason: reason.trim(),
        performed_by: userId,
        notes: notes
      };

      const result = await StockController.stockService.adjustSalesStock(
        productId,
        storeId,
        adjustment,
        userRole
      );

      res.json({
        success: true,
        data: {
          product: result.updated_product,
          movement_id: result.movement_id,
          message: result.message
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('StockController.adjustSalesStock error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to adjust sales floor stock'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get stock movement history for a product
   * GET /api/products/:productId/stock/movements
   * Available to: all authenticated users with store access
   */
  static async getStockMovements(req: Request, res: Response): Promise<void> {
    try {
      const { productId, storeId } = req.params;
      const { limit } = req.query;

      // Validate inputs
      if (!productId || !storeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Product ID and Store ID are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const movementLimit = limit ? parseInt(limit as string) : 50;
      const movements = await StockController.stockService.getStockMovements(
        productId,
        storeId,
        movementLimit
      );

      res.json({
        success: true,
        data: movements,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('StockController.getStockMovements error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch stock movements'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Fill warehouse stock: Simple endpoint for owners to add inventory
   * POST /api/products/:productId/stock/warehouse/fill
   * Available to: owner
   */
  static async fillWarehouseStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId, storeId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).storeRole;
      const { quantity, reason, notes } = req.body;

      // Validate inputs
      if (!productId || !storeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Product ID and Store ID are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!quantity || quantity <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Quantity must be a positive number'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!reason || reason.trim() === '') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REASON',
            message: 'Reason is required for warehouse stock additions'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check permissions
      if (!StockService.validateStockPermissions(userRole, 'fill_warehouse')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only owners can add stock to warehouse'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await StockController.stockService.fillWarehouseStock(
        productId,
        storeId,
        parseInt(quantity),
        reason.trim(),
        userId,
        notes
      );

      res.json({
        success: true,
        data: {
          product: result.updated_product,
          movement_id: result.movement_id,
          message: result.message
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('StockController.fillWarehouseStock error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fill warehouse stock'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update sales floor stock: For employees to edit product sales floor stock
   * PUT /api/products/:productId/stock/sales/update
   * Available to: employee, owner
   */
  static async updateSalesFloorStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId, storeId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).storeRole;
      const { quantity, reason, notes } = req.body;

      // Validate inputs
      if (!productId || !storeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Product ID and Store ID are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (quantity === undefined || quantity < 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Quantity must be a non-negative number'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!reason || reason.trim() === '') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REASON',
            message: 'Reason is required for stock updates'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check permissions
      if (!StockService.validateStockPermissions(userRole, 'update_sales')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to update sales floor stock'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await StockController.stockService.updateSalesFloorStock(
        productId,
        storeId,
        parseInt(quantity),
        reason.trim(),
        userId,
        notes
      );

      res.json({
        success: true,
        data: {
          product: result.updated_product,
          movement_id: result.movement_id,
          message: result.message
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('StockController.updateSalesFloorStock error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update sales floor stock'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get low stock alerts for a store
   * GET /api/stores/:storeId/stock/alerts
   * Available to: all authenticated users with store access
   */
  static async getLowStockAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;

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

      const lowStockProducts = await StockController.stockService.getLowStockAlerts(storeId);

      res.json({
        success: true,
        data: {
          products: lowStockProducts,
          count: lowStockProducts.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('StockController.getLowStockAlerts error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch low stock alerts'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}
