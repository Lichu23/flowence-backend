/**
 * Product Controller
 * Handles HTTP requests for product management
 */

import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { ProductService } from '../services/ProductService';
import { ApiResponse } from '../types';
import { ProductFilters } from '../types/product';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  // Validation rules
  static createProductValidation = [
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Product name is required and must be less than 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('barcode')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Barcode must be less than 100 characters'),
    body('sku')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('SKU must be less than 100 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Category must be less than 100 characters'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number')
      .toFloat(),
    body('cost')
      .isFloat({ min: 0 })
      .withMessage('Cost must be a positive number')
      .toFloat(),
    body('stock')
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer')
      .toInt(),
    body('min_stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Minimum stock must be a non-negative integer')
      .toInt(),
    body('unit')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Unit must be less than 50 characters'),
    body('image_url')
      .optional()
      .trim()
      .isURL()
      .withMessage('Image URL must be a valid URL'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean')
      .toBoolean()
  ];

  static updateProductValidation = [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Product name must be between 1 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('barcode')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Barcode must be less than 100 characters'),
    body('sku')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('SKU must be less than 100 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Category must be less than 100 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number')
      .toFloat(),
    body('cost')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Cost must be a positive number')
      .toFloat(),
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer')
      .toInt(),
    body('min_stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Minimum stock must be a non-negative integer')
      .toInt(),
    body('unit')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Unit must be less than 50 characters'),
    body('image_url')
      .optional()
      .trim()
      .isURL()
      .withMessage('Image URL must be a valid URL'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean')
      .toBoolean()
  ];

  static adjustStockValidation = [
    body('adjustment')
      .isInt({ min: -100000, max: 100000 })
      .withMessage('Adjustment must be an integer between -100000 and 100000')
      .toInt(),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Reason must be less than 255 characters')
  ];

  static listProductsValidation = [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Search term must be less than 255 characters'),
    query('category')
      .optional()
      .trim(),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean')
      .toBoolean(),
    query('low_stock')
      .optional()
      .isBoolean()
      .withMessage('low_stock must be a boolean')
      .toBoolean(),
    query('sort_by')
      .optional()
      .isIn(['name', 'price', 'stock', 'created_at'])
      .withMessage('sort_by must be one of: name, price, stock, created_at'),
    query('sort_order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sort_order must be asc or desc')
  ];

  /**
   * Create a new product
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array().map(error => ({
              field: error.type === 'field' ? error.path : 'unknown',
              message: error.msg,
              value: error.type === 'field' ? error.value : undefined
            }))
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const storeId = req.body.store_id || req.params['storeId'];

      const product = await this.productService.createProduct({
        ...req.body,
        store_id: storeId
      });

      const response: ApiResponse = {
        success: true,
        data: product,
        message: 'Product created successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Product creation error:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'PRODUCT_EXISTS',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'PRODUCT_CREATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create product'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get products for a store
   */
  async getByStore(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array().map(error => ({
              field: error.type === 'field' ? error.path : 'unknown',
              message: error.msg
            }))
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const storeId = req.params['storeId'] as string;
      const filters: ProductFilters = {
        store_id: storeId,
        search: req.query['search'] as string,
        category: req.query['category'] as string,
        is_active: req.query['is_active'] ? req.query['is_active'] === 'true' : undefined,
        low_stock: req.query['low_stock'] ? req.query['low_stock'] === 'true' : undefined,
        page: req.query['page'] ? parseInt(req.query['page'] as string) : undefined,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined,
        sort_by: req.query['sort_by'] as any,
        sort_order: req.query['sort_order'] as any
      };

      const result = await this.productService.getProducts(filters);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Products retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching products:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'PRODUCTS_FETCH_FAILED',
          message: 'Failed to fetch products'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get product by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const storeId = req.params['storeId'] as string;

      const product = await this.productService.getProductById(id, storeId);

      const response: ApiResponse = {
        success: true,
        data: product,
        message: 'Product retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching product:', error);

      if (error instanceof Error && error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'PRODUCT_FETCH_FAILED',
          message: 'Failed to fetch product'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get product by barcode
   */
  async getByBarcode(req: Request, res: Response): Promise<void> {
    try {
      const storeId = req.params['storeId'] as string;
      const barcode = req.params['barcode'] as string;

      const product = await this.productService.getProductByBarcode(barcode, storeId);

      const response: ApiResponse = {
        success: true,
        data: product,
        message: 'Product retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching product by barcode:', error);

      if (error instanceof Error && error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'PRODUCT_FETCH_FAILED',
          message: 'Failed to fetch product'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get categories for a store
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const storeId = req.params['storeId'] as string;

      const categories = await this.productService.getCategories(storeId);

      const response: ApiResponse = {
        success: true,
        data: categories,
        message: 'Categories retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching categories:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'CATEGORIES_FETCH_FAILED',
          message: 'Failed to fetch categories'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update a product
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array().map(error => ({
              field: error.type === 'field' ? error.path : 'unknown',
              message: error.msg
            }))
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const id = req.params['id'] as string;
      const storeId = req.params['storeId'] as string;

      const product = await this.productService.updateProduct(id, storeId, req.body);

      const response: ApiResponse = {
        success: true,
        data: product,
        message: 'Product updated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Product update error:', error);

      if (error instanceof Error && error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'PRODUCT_CONFLICT',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'PRODUCT_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update product'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Adjust stock
   */
  async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array().map(error => ({
              field: error.type === 'field' ? error.path : 'unknown',
              message: error.msg
            }))
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const id = req.params['id'] as string;
      const storeId = req.params['storeId'] as string;
      const { adjustment, reason } = req.body;

      const product = await this.productService.adjustStock(id, storeId, adjustment, reason);

      const response: ApiResponse = {
        success: true,
        data: product,
        message: 'Stock adjusted successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Stock adjustment error:', error);

      if (error instanceof Error && error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (error instanceof Error && error.message.includes('Insufficient stock')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'STOCK_ADJUSTMENT_FAILED',
          message: 'Failed to adjust stock'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete a product
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const storeId = req.params['storeId'] as string;

      await this.productService.deleteProduct(id, storeId);

      const response: ApiResponse = {
        success: true,
        message: 'Product deleted successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Product deletion error:', error);

      if (error instanceof Error && error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'PRODUCT_DELETION_FAILED',
          message: 'Failed to delete product'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}

