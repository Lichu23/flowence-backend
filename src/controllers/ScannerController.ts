/**
 * Scanner Controller
 * Handles barcode scanning and product lookup functionality
 */

import { Request, Response } from 'express';
import { ProductModel } from '../models/ProductModel';

export class ScannerController {
  private static productModel = new ProductModel();

  /**
   * Search product by barcode
   * GET /api/stores/:storeId/products/search/barcode/:code
   * Available to: all authenticated users with store access
   */
  static async searchByBarcode(req: Request, res: Response): Promise<void> {
    try {
      const { storeId, code } = req.params;
      
      // Validate inputs
      if (!storeId || !code) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Store ID and barcode are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate barcode format (basic validation)
      const barcodeRegex = /^[0-9]{8,14}$/; // Common barcode formats (EAN-8, EAN-13, UPC, etc.)
      if (!barcodeRegex.test(code)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BARCODE_FORMAT',
            message: 'Invalid barcode format. Must be 8-14 digits.'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Search for product by barcode in the specified store
      const product = await ScannerController.productModel.findByBarcode(code, storeId);

      if (!product) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'No product found with this barcode in the current store'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Return found product
      res.json({
        success: true,
        data: {
          product
        },
        message: 'Product found successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('ScannerController.searchByBarcode error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search for product'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Validate barcode uniqueness within store
   * GET /api/stores/:storeId/products/barcode/:code/validate
   * Available to: all authenticated users with store access
   */
  static async validateBarcode(req: Request, res: Response): Promise<void> {
    try {
      const { storeId, code } = req.params;
      const { excludeProductId } = req.query; // For edit scenarios
      
      // Validate inputs
      if (!storeId || !code) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Store ID and barcode are required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate barcode format
      const barcodeRegex = /^[0-9]{8,14}$/;
      if (!barcodeRegex.test(code)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BARCODE_FORMAT',
            message: 'Invalid barcode format. Must be 8-14 digits.'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if barcode already exists
      const existingProduct = await ScannerController.productModel.findByBarcode(code, storeId);
      
      const isUnique = !existingProduct || 
        (excludeProductId && existingProduct.id === excludeProductId);

      res.json({
        success: true,
        data: {
          isUnique,
          existingProduct: isUnique ? null : {
            id: existingProduct!.id,
            name: existingProduct!.name,
            barcode: existingProduct!.barcode
          }
        },
        message: isUnique ? 'Barcode is available' : 'Barcode already exists',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('ScannerController.validateBarcode error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate barcode'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get scanner statistics for a store
   * GET /api/stores/:storeId/scanner/stats
   * Available to: owners only
   */
  static async getScannerStats(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;
      const userRole = (req as any).storeRole;
      
      // Only owners can access scanner statistics
      if (userRole !== 'owner') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only store owners can access scanner statistics'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

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

      // Get products with and without barcodes
      const allProducts = await ScannerController.productModel.findByStore({
        store_id: storeId,
        page: 1,
        limit: 10000, // Get all products for stats
        is_active: true
      });

      const products = allProducts.products || [];
      const totalProducts = products.length;
      const productsWithBarcode = products.filter(p => p.barcode && p.barcode.trim() !== '').length;
      const productsWithoutBarcode = totalProducts - productsWithBarcode;
      const barcodeUsagePercentage = totalProducts > 0 ? Math.round((productsWithBarcode / totalProducts) * 100) : 0;

      res.json({
        success: true,
        data: {
          totalProducts,
          productsWithBarcode,
          productsWithoutBarcode,
          barcodeUsagePercentage,
          scannerEnabled: true // For future scanner configuration
        },
        message: 'Scanner statistics retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('ScannerController.getScannerStats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve scanner statistics'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}
