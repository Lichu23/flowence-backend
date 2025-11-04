/**
 * Product Routes
 * API endpoints for product management
 */

import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authenticate } from '../middleware/auth';
import { requireStoreAccess } from '../middleware/storeAccess';

const router = Router();
const productController = new ProductController();

// All routes require authentication
router.use(authenticate);

// Create product (owner only)
router.post(
  '/stores/:storeId/products',
  requireStoreAccess('owner'),
  ProductController.createProductValidation,
  productController.create.bind(productController)
);

// Get products for store (paginated with filters)
router.get(
  '/stores/:storeId/products',
  requireStoreAccess(),
  ProductController.listProductsValidation,
  productController.getByStore.bind(productController)
);

// Get categories for store
router.get(
  '/stores/:storeId/products/categories',
  requireStoreAccess(),
  productController.getCategories.bind(productController)
);

// Get product by barcode (for scanning)
router.get(
  '/stores/:storeId/products/barcode/:barcode',
  requireStoreAccess(),
  productController.getByBarcode.bind(productController)
);

// Get product by ID
router.get(
  '/stores/:storeId/products/:id',
  requireStoreAccess(),
  productController.getById.bind(productController)
);

// Update product (owner only)
router.put(
  '/stores/:storeId/products/:id',
  requireStoreAccess('owner'),
  ProductController.updateProductValidation,
  productController.update.bind(productController)
);

// Adjust stock
router.post(
  '/stores/:storeId/products/:id/adjust-stock',
  requireStoreAccess('owner'),
  ProductController.adjustStockValidation,
  productController.adjustStock.bind(productController)
);

// Delete product (owner only)
router.delete(
  '/stores/:storeId/products/:id',
  requireStoreAccess('owner'),
  productController.delete.bind(productController)
);

export default router;

