/**
 * Scanner routes
 * Handle barcode scanning and product lookup operations
 */

import express from 'express';
import { ScannerController } from '../controllers/ScannerController';
import { authenticate } from '../middleware/auth';
import { validateStoreAccess } from '../middleware/storeAccess';

const router = express.Router();

/**
 * Scanner operation routes
 * All routes require authentication and store access validation
 */

// Search product by barcode
// Available to: all authenticated users with store access
router.get(
  '/stores/:storeId/products/search/barcode/:code',
  authenticate,
  validateStoreAccess,
  ScannerController.searchByBarcode
);

// Validate barcode uniqueness within store
// Available to: all authenticated users with store access
router.get(
  '/stores/:storeId/products/barcode/:code/validate',
  authenticate,
  validateStoreAccess,
  ScannerController.validateBarcode
);

// Get scanner statistics for a store
// Available to: owners only (validated within controller)
router.get(
  '/stores/:storeId/scanner/stats',
  authenticate,
  validateStoreAccess,
  ScannerController.getScannerStats
);

export default router;
