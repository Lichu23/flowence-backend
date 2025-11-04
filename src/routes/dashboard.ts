import express from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticate } from '../middleware/auth';
import { validateStoreAccess } from '../middleware/storeAccess';

const router = express.Router();

/**
 * Dashboard routes
 * All routes require authentication
 */
router.get('/stats/:storeId', authenticate, validateStoreAccess, DashboardController.getStats);

// Get inventory stats for all owned stores (owners only)
router.get('/stores-inventory', authenticate, DashboardController.getOwnerStoresInventory);

// Get defective products for a store
router.get('/defective-products/:storeId', authenticate, validateStoreAccess, DashboardController.getDefectiveProducts);

// Get global summary for all owned stores (owners only)
router.get('/global-summary', authenticate, DashboardController.getGlobalSummary);

export default router;
