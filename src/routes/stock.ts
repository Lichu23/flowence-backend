/**
 * Stock routes
 * Handle dual-stock operations with role-based permissions
 */

import express from 'express';
import { StockController } from '../controllers/StockController';
import { authenticate } from '../middleware/auth';
import { validateStoreAccess } from '../middleware/storeAccess';

const router = express.Router();

/**
 * Stock operation routes
 * All routes require authentication and store access validation
 */

// Restock product: Move stock from warehouse to sales floor
// Available to: employee, owner
router.post(
  '/stores/:storeId/products/:productId/restock',
  authenticate,
  validateStoreAccess,
  StockController.restockProduct
);

// Fill warehouse stock: Add inventory to warehouse
// Available to: owner
router.post(
  '/stores/:storeId/products/:productId/stock/warehouse/fill',
  authenticate,
  validateStoreAccess,
  StockController.fillWarehouseStock
);

// Update sales floor stock: Edit sales floor stock quantity
// Available to: employee, owner
router.put(
  '/stores/:storeId/products/:productId/stock/sales/update',
  authenticate,
  validateStoreAccess,
  StockController.updateSalesFloorStock
);

// Adjust warehouse stock
// Available to: admin, manager, owner
router.put(
  '/stores/:storeId/products/:productId/stock/warehouse',
  authenticate,
  validateStoreAccess,
  StockController.adjustWarehouseStock
);

// Adjust sales floor stock
// Available to: admin, manager, owner
router.put(
  '/stores/:storeId/products/:productId/stock/sales',
  authenticate,
  validateStoreAccess,
  StockController.adjustSalesStock
);

// Get stock movement history for a product
// Available to: all authenticated users with store access
router.get(
  '/stores/:storeId/products/:productId/stock/movements',
  authenticate,
  validateStoreAccess,
  StockController.getStockMovements
);

// Get low stock alerts for a store
// Available to: all authenticated users with store access
router.get(
  '/stores/:storeId/stock/alerts',
  authenticate,
  validateStoreAccess,
  StockController.getLowStockAlerts
);

export default router;
