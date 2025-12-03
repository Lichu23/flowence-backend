/**
 * Store Controller
 * Handles store management operations for multi-store architecture
 */

import { Request, Response, NextFunction } from 'express';
import { StoreModel } from '../models/StoreModel';
import { UserStoreModel } from '../models/UserStoreModel';
import { ProductModel } from '../models/ProductModel';
import { SaleModel } from '../models/SaleModel';
import { ApiResponse } from '../types';
import { CreateStoreData, UpdateStoreData } from '../types/store';
import { CurrencyConversionService } from '../services/CurrencyConversionService';

const storeModel = new StoreModel();
const userStoreModel = new UserStoreModel();
const productModel = new ProductModel();
const saleModel = new SaleModel();
const currencyConversionService = new CurrencyConversionService(productModel, saleModel);

export class StoreController {
  /**
   * Get all stores accessible by current user
   * @route GET /api/stores
   */
  async getUserStores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.['id'];
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      const stores = await storeModel.findByUser(userId);

      const response: ApiResponse = {
        success: true,
        data: stores,
        message: 'Stores retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific store by ID
   * @route GET /api/stores/:id
   */
  async getStoreById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['id'];
      const userId = (req as any).user?.['id'];
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Verify user has access to this store
      const hasAccess = await userStoreModel.hasAccess(userId, storeId);
      if (!hasAccess) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this store'
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      const store = await storeModel.findByIdWithOwner(storeId);

      if (!store) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Store not found'
          },
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      // Get store statistics
      const stats = await storeModel.getStats(storeId);

      const response: ApiResponse = {
        success: true,
        data: {
          store,
          stats
        },
        message: 'Store retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new store (owners only)
   * @route POST /api/stores
   */
  async createStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.['id'];
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }
      const userRole = (req as any).user?.['role'];

      // Only owners can create stores
      if (userRole !== 'owner') {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only owners can create stores'
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      const storeData: CreateStoreData = {
        owner_id: userId,
        name: req.body.name,
        address: req.body.address,
        phone: req.body.phone,
        currency: req.body.currency || 'USD',
        tax_rate: req.body.tax_rate || 0,
        low_stock_threshold: req.body.low_stock_threshold || 5
      };

      // Create store
      const newStore = await storeModel.create(storeData);

      // Create user-store relationship
      await userStoreModel.create({
        user_id: userId,
        store_id: newStore.id,
        role: 'owner'
      });

      const response: ApiResponse = {
        success: true,
        data: newStore,
        message: 'Store created successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update store (owners only)
   * @route PUT /api/stores/:id
   */
  async updateStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['id'];
      const userId = (req as any).user?.['id'];
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Verify user is owner of this store
      const isOwner = await storeModel.isOwner(userId, storeId);
      if (!isOwner) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only store owners can update store settings'
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      const updates: UpdateStoreData = {
        name: req.body.name,
        address: req.body.address,
        phone: req.body.phone,
        currency: req.body.currency,
        tax_rate: req.body.tax_rate,
        timezone: req.body.timezone,
        date_format: req.body.date_format,
        time_format: req.body.time_format,
        receipt_header: req.body.receipt_header,
        receipt_footer: req.body.receipt_footer,
        logo_url: req.body.logo_url
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => 
        updates[key as keyof UpdateStoreData] === undefined && 
        delete updates[key as keyof UpdateStoreData]
      );

      // Get existing store before update
      const existingStore = await storeModel.findById(storeId);
      if (!existingStore) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Store not found'
          },
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      const updatedStore = await storeModel.update(storeId, updates);

      const response: ApiResponse = {
        success: true,
        data: updatedStore,
        message: 'Store updated successfully',
        timestamp: new Date().toISOString()
      };

      // Check if currency was changed and convert product prices and sales
      if (updates.currency && existingStore.currency !== updates.currency) {
        console.log(`Currency change detected: ${existingStore.currency} → ${updates.currency}`);
        
        try {
          // Convert products
          const productConversionResult = await currencyConversionService.convertStoreProducts(
            storeId,
            existingStore.currency,
            updates.currency
          );

          // Convert sales
          const salesConversionResult = await currencyConversionService.convertStoreSales(
            storeId,
            existingStore.currency,
            updates.currency
          );

          if (productConversionResult.success && salesConversionResult.success) {
            console.log(`Successfully converted ${productConversionResult.converted_count} products and ${salesConversionResult.converted_count} sales to ${updates.currency}`);
            
            // Add conversion info to response
            (response.data as any).currency_conversion = {
              from: existingStore.currency,
              to: updates.currency,
              products: {
                converted: productConversionResult.converted_count,
                failed: productConversionResult.failed_count,
                errors: productConversionResult.errors
              },
              sales: {
                converted: salesConversionResult.converted_count,
                failed: salesConversionResult.failed_count,
                errors: salesConversionResult.errors
              },
              total_converted: productConversionResult.converted_count + salesConversionResult.converted_count
            };
          } else {
            console.error('Currency conversion failed:', {
              products: productConversionResult.errors,
              sales: salesConversionResult.errors
            });
            
            // Add warning to response but don't fail the update
            (response.data as any).currency_conversion = {
              from: existingStore.currency,
              to: updates.currency,
              products: {
                converted: productConversionResult.converted_count,
                failed: productConversionResult.failed_count,
                errors: productConversionResult.errors
              },
              sales: {
                converted: salesConversionResult.converted_count,
                failed: salesConversionResult.failed_count,
                errors: salesConversionResult.errors
              },
              warning: 'Some items could not be converted'
            };
          }
        } catch (conversionError) {
          console.error('Currency conversion error:', conversionError);
          
          // Add warning to response but don't fail the update
          (response.data as any).currency_conversion = {
            from: existingStore.currency,
            to: updates.currency,
            error: conversionError instanceof Error ? conversionError.message : 'Unknown conversion error',
            warning: 'Currency conversion failed, but store settings were updated'
          };
        }
      }

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update store business size (owners only)
   * @route POST /api/stores/:id/business-size
   */
  async updateBusinessSize(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['id'];
      const userId = (req as any).user?.['id'];
      const { business_size } = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      if (!business_size || (business_size !== 'small' && business_size !== 'medium_large')) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Valid business size is required (small or medium_large)'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Verify user is owner of this store
      const isOwner = await storeModel.isOwner(userId, storeId);
      if (!isOwner) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only store owners can update business size'
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      const updatedStore = await storeModel.update(storeId, { business_size });

      const response: ApiResponse = {
        success: true,
        data: updatedStore,
        message: 'Business size updated successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get exchange rate between two currencies
   * @route GET /api/stores/exchange-rate/:from/:to
   */
  async getExchangeRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to } = req.params;
      
      if (!from || !to) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'From and to currency codes are required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      if (!currencyConversionService.isValidCurrency(from) || !currencyConversionService.isValidCurrency(to)) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_CURRENCY',
            message: 'Invalid currency code. Supported currencies: ' + currencyConversionService.getSupportedCurrencies().join(', ')
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const rate = await currencyConversionService.convertAmount(1, from.toUpperCase(), to.toUpperCase());

      const response: ApiResponse = {
        success: true,
        data: {
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          rate: rate,
          updated_at: new Date().toISOString()
        },
        message: 'Exchange rate retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert amount between currencies
   * @route POST /api/stores/convert-amount
   */
  async convertAmount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { amount, from, to } = req.body;
      
      if (!amount || !from || !to) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'Amount, from, and to currency codes are required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      if (!currencyConversionService.isValidCurrency(from) || !currencyConversionService.isValidCurrency(to)) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_CURRENCY',
            message: 'Invalid currency code. Supported currencies: ' + currencyConversionService.getSupportedCurrencies().join(', ')
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const convertedAmount = await currencyConversionService.convertAmount(
        parseFloat(amount),
        from.toUpperCase(),
        to.toUpperCase()
      );

      const response: ApiResponse = {
        success: true,
        data: {
          original_amount: parseFloat(amount),
          from: from.toUpperCase(),
          converted_amount: convertedAmount,
          to: to.toUpperCase(),
          rate: convertedAmount / parseFloat(amount),
          updated_at: new Date().toISOString()
        },
        message: 'Amount converted successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Preview currency conversion for store products
   * @route POST /api/stores/:id/preview-conversion
   */
  async previewCurrencyConversion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['id'];
      const { toCurrency } = req.body;
      const userId = (req as any).user?.['id'];
      
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId || !toCurrency) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID and target currency are required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Verify user is owner of this store
      const isOwner = await storeModel.isOwner(userId, storeId);
      if (!isOwner) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only store owners can preview currency conversion'
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      // Get store info
      const store = await storeModel.findById(storeId);
      if (!store) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Store not found'
          },
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      // Validate target currency
      if (!currencyConversionService.isValidCurrency(toCurrency)) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_CURRENCY',
            message: 'Invalid currency code. Supported currencies: ' + currencyConversionService.getSupportedCurrencies().join(', ')
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Don't preview if same currency
      if (store.currency === toCurrency) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'SAME_CURRENCY',
            message: 'Target currency is the same as current currency'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Get exchange rate
      const exchangeRate = await currencyConversionService.convertAmount(1, store.currency, toCurrency);

      // Get products and preview conversion
      const products = await productModel.findByStore({
        store_id: storeId,
        page: 1,
        limit: 10 // Show preview for first 10 products
      });

      const previewProducts = products.products.map(product => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        current_price: product.price,
        current_cost: product.cost,
        current_currency: store.currency,
        converted_price: Math.round(product.price * exchangeRate * 100) / 100,
        converted_cost: Math.round(product.cost * exchangeRate * 100) / 100,
        target_currency: toCurrency
      }));

      const response: ApiResponse = {
        success: true,
        data: {
          store_id: storeId,
          from_currency: store.currency,
          to_currency: toCurrency,
          exchange_rate: exchangeRate,
          preview_products: previewProducts,
          total_products: products.pagination.total,
          message: `Preview of currency conversion from ${store.currency} to ${toCurrency}`
        },
        message: 'Currency conversion preview generated successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert specific products to new currency
   * @route POST /api/stores/:id/convert-products
   */
  async convertSpecificProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['id'];
      const { productIds, toCurrency } = req.body;
      const userId = (req as any).user?.['id'];
      
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId || !productIds || !Array.isArray(productIds) || !toCurrency) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID, product IDs array, and target currency are required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Verify user is owner of this store
      const isOwner = await storeModel.isOwner(userId, storeId);
      if (!isOwner) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only store owners can convert product currencies'
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      // Get store info
      const store = await storeModel.findById(storeId);
      if (!store) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Store not found'
          },
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      // Validate target currency
      if (!currencyConversionService.isValidCurrency(toCurrency)) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_CURRENCY',
            message: 'Invalid currency code. Supported currencies: ' + currencyConversionService.getSupportedCurrencies().join(', ')
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Get exchange rate
      const exchangeRate = await currencyConversionService.convertAmount(1, store.currency, toCurrency);

      // Convert each specified product
      const results = {
        successful: [] as any[],
        failed: [] as any[]
      };

      for (const productId of productIds) {
        try {
          // Get product
          const product = await productModel.findById(productId, storeId);
          if (!product) {
            results.failed.push({
              product_id: productId,
              error: 'Product not found'
            });
            continue;
          }

          // Convert prices
          const convertedPrice = Math.round(product.price * exchangeRate * 100) / 100;
          const convertedCost = Math.round(product.cost * exchangeRate * 100) / 100;

          // Update product
          await productModel.update(productId, storeId, {
            price: convertedPrice,
            cost: convertedCost
          });

          results.successful.push({
            product_id: productId,
            name: product.name,
            original_price: product.price,
            converted_price: convertedPrice,
            original_cost: product.cost,
            converted_cost: convertedCost
          });
        } catch (error) {
          results.failed.push({
            product_id: productId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          store_id: storeId,
          from_currency: store.currency,
          to_currency: toCurrency,
          exchange_rate: exchangeRate,
          results: results,
          summary: {
            total_requested: productIds.length,
            successful: results.successful.length,
            failed: results.failed.length
          }
        },
        message: `Converted ${results.successful.length} of ${productIds.length} products to ${toCurrency}`,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert specific sales to new currency
   * @route POST /api/stores/:id/convert-sales
   */
  async convertSpecificSales(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['id'];
      const { saleIds, toCurrency } = req.body;
      const userId = (req as any).user?.['id'];
      
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId || !saleIds || !Array.isArray(saleIds) || !toCurrency) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID, sale IDs array, and target currency are required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Verify user is owner of this store
      const isOwner = await storeModel.isOwner(userId, storeId);
      if (!isOwner) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only store owners can convert sales currencies'
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      // Get store info
      const store = await storeModel.findById(storeId);
      if (!store) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Store not found'
          },
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      // Validate target currency
      if (!currencyConversionService.isValidCurrency(toCurrency)) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_CURRENCY',
            message: 'Invalid currency code. Supported currencies: ' + currencyConversionService.getSupportedCurrencies().join(', ')
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Get exchange rate
      const exchangeRate = await currencyConversionService.convertAmount(1, store.currency, toCurrency);

      // Convert each specified sale
      const results = {
        successful: [] as any[],
        failed: [] as any[]
      };

      for (const saleId of saleIds) {
        try {
          // Get sale
          const sale = await saleModel.findById(saleId, storeId);
          if (!sale) {
            results.failed.push({
              sale_id: saleId,
              error: 'Sale not found'
            });
            continue;
          }

          // Convert sale amounts
          const convertedSubtotal = Math.round(sale.sale.subtotal * exchangeRate * 100) / 100;
          const convertedTax = Math.round(sale.sale.tax * exchangeRate * 100) / 100;
          const convertedDiscount = Math.round(sale.sale.discount * exchangeRate * 100) / 100;
          const convertedTotal = Math.round(sale.sale.total * exchangeRate * 100) / 100;

          // Update sale
          await saleModel.updateSale(saleId, storeId, {
            subtotal: convertedSubtotal,
            tax: convertedTax,
            discount: convertedDiscount,
            total: convertedTotal
          });

          // Update sale items
          for (const item of sale.items) {
            const convertedUnitPrice = Math.round(item.unit_price * exchangeRate * 100) / 100;
            const convertedItemSubtotal = Math.round(item.subtotal * exchangeRate * 100) / 100;
            const convertedItemDiscount = Math.round(item.discount * exchangeRate * 100) / 100;
            const convertedItemTotal = Math.round(item.total * exchangeRate * 100) / 100;

            await saleModel.updateSaleItem(item.id, {
              unit_price: convertedUnitPrice,
              subtotal: convertedItemSubtotal,
              discount: convertedItemDiscount,
              total: convertedItemTotal
            });
          }

          results.successful.push({
            sale_id: saleId,
            receipt_number: sale.sale.receipt_number,
            original_total: sale.sale.total,
            converted_total: convertedTotal
          });
        } catch (error) {
          results.failed.push({
            sale_id: saleId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          store_id: storeId,
          from_currency: store.currency,
          to_currency: toCurrency,
          exchange_rate: exchangeRate,
          results: results,
          summary: {
            total_requested: saleIds.length,
            successful: results.successful.length,
            failed: results.failed.length
          }
        },
        message: `Converted ${results.successful.length} of ${saleIds.length} sales to ${toCurrency}`,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supported currencies
   * @route GET /api/stores/supported-currencies
   */
  async getSupportedCurrencies(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const response: ApiResponse = {
        success: true,
        data: {
          currencies: currencyConversionService.getSupportedCurrencies()
        },
        message: 'Supported currencies retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
  async deleteStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['id'];
      const userId = (req as any).user?.['id'];
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Verify user is owner of this store
      const isOwner = await storeModel.isOwner(userId, storeId);
      if (!isOwner) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only store owners can delete stores'
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      // Check if this is the user's only store
      const userStores = await storeModel.findByUser(userId);
      if (userStores.length === 1) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Cannot delete your only store. Create another store first.'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Delete store (cascade will handle related data)
      await storeModel.delete(storeId);

      const response: ApiResponse = {
        success: true,
        message: 'Store deleted successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get store users (employees and owners)
   * @route GET /api/stores/:id/users
   */
  async getStoreUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['id'];
      const userId = (req as any).user?.['id'];
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Verify user has access to this store
      const hasAccess = await userStoreModel.hasAccess(userId, storeId);
      if (!hasAccess) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this store'
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      const users = await userStoreModel.getStoreUsers(storeId);

      const response: ApiResponse = {
        success: true,
        data: users,
        message: 'Store users retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get store statistics
   * @route GET /api/stores/:id/stats
   */
  async getStoreStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['id'];
      const userId = (req as any).user?.['id'];
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Verify user has access to this store
      const hasAccess = await userStoreModel.hasAccess(userId, storeId);
      if (!hasAccess) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this store'
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      const stats = await storeModel.getStats(storeId);

      const response: ApiResponse = {
        success: true,
        data: stats,
        message: 'Store statistics retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const storeController = new StoreController();

