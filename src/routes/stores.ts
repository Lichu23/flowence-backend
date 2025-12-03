/**
 * Store Routes
 * Routes for multi-store management
 */

import { Router } from 'express';
import { storeController } from '../controllers/StoreController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All store routes require authentication
router.use(authenticate);

// Currency conversion endpoints (must come before :id routes)
router.get('/exchange-rate/:from/:to', storeController.getExchangeRate.bind(storeController));
router.post('/convert-amount', storeController.convertAmount.bind(storeController));
router.get('/supported-currencies', storeController.getSupportedCurrencies.bind(storeController));

// Get all user's stores
router.get('/', storeController.getUserStores.bind(storeController));

// Create new store (owners only)
router.post('/', storeController.createStore.bind(storeController));

// Get specific store
router.get('/:id', storeController.getStoreById.bind(storeController));

// Update store (owners only)
router.put('/:id', storeController.updateStore.bind(storeController));

// Update business size (owners only)
router.post('/:id/business-size', storeController.updateBusinessSize.bind(storeController));

// Delete store (owners only)
router.delete('/:id', storeController.deleteStore.bind(storeController));

// Get store users
router.get('/:id/users', storeController.getStoreUsers.bind(storeController));

// Get store statistics
router.get('/:id/stats', storeController.getStoreStats.bind(storeController));

// Currency conversion management
router.post('/:id/preview-conversion', storeController.previewCurrencyConversion.bind(storeController));
router.post('/:id/convert-products', storeController.convertSpecificProducts.bind(storeController));
router.post('/:id/convert-sales', storeController.convertSpecificSales.bind(storeController));

export default router;

