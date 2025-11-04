/**
 * Product Service
 * Business logic for product management
 */

import { ProductModel } from '../models/ProductModel';
import { 
  Product, 
  CreateProductData, 
  UpdateProductData, 
  ProductFilters,
  ProductListResponse
} from '../types/product';

export class ProductService {
  private productModel: ProductModel;

  constructor() {
    this.productModel = new ProductModel();
  }

  /**
   * Create a new product
   */
  async createProduct(productData: CreateProductData): Promise<Product> {
    // Validate price and cost
    if (productData.price < 0) {
      throw new Error('Price must be a positive number');
    }

    if (productData.cost < 0) {
      throw new Error('Cost must be a positive number');
    }

    // Validate dual stock system (required fields)
    if (productData.stock_deposito < 0) {
      throw new Error('Warehouse stock cannot be negative');
    }

    if (productData.stock_venta < 0) {
      throw new Error('Sales floor stock cannot be negative');
    }

    // Legacy stock validation (optional field for backward compatibility)
    if (productData.stock !== undefined && productData.stock < 0) {
      throw new Error('Stock cannot be negative');
    }

    // Check if barcode already exists
    if (productData.barcode) {
      const existingByBarcode = await this.productModel.existsByBarcode(
        productData.barcode,
        productData.store_id
      );

      if (existingByBarcode) {
        throw new Error('A product with this barcode already exists in this store');
      }
    }

    // Check if SKU already exists
    if (productData.sku) {
      const existingBySku = await this.productModel.existsBySku(
        productData.sku,
        productData.store_id
      );

      if (existingBySku) {
        throw new Error('A product with this SKU already exists in this store');
      }
    }

    console.log('✅ Creating product:', productData.name);
    return await this.productModel.create(productData);
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string, storeId: string): Promise<Product> {
    const product = await this.productModel.findById(id, storeId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * Get product by barcode (for scanning)
   */
  async getProductByBarcode(barcode: string, storeId: string): Promise<Product> {
    const product = await this.productModel.findByBarcode(barcode, storeId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * Get products for a store with filters
   */
  async getProducts(filters: ProductFilters): Promise<ProductListResponse> {
    return await this.productModel.findByStore(filters);
  }

  /**
   * Get categories for a store
   */
  async getCategories(storeId: string): Promise<string[]> {
    return await this.productModel.getCategories(storeId);
  }

  /**
   * Update a product
   */
  async updateProduct(id: string, storeId: string, updates: UpdateProductData): Promise<Product> {
    // Verify product exists
    const existingProduct = await this.productModel.findById(id, storeId);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Validate price and cost if provided
    if (updates.price !== undefined && updates.price < 0) {
      throw new Error('Price must be a positive number');
    }

    if (updates.cost !== undefined && updates.cost < 0) {
      throw new Error('Cost must be a positive number');
    }

    // Validate dual stock fields if provided
    if (updates.stock_deposito !== undefined && updates.stock_deposito < 0) {
      throw new Error('Warehouse stock cannot be negative');
    }

    if (updates.stock_venta !== undefined && updates.stock_venta < 0) {
      throw new Error('Sales floor stock cannot be negative');
    }

    // Legacy stock validation (for backward compatibility)
    if (updates.stock !== undefined && updates.stock < 0) {
      throw new Error('Stock cannot be negative');
    }

    // Check if new barcode conflicts with existing products
    if (updates.barcode && updates.barcode !== existingProduct.barcode) {
      const existingByBarcode = await this.productModel.existsByBarcode(
        updates.barcode,
        storeId,
        id
      );

      if (existingByBarcode) {
        throw new Error('A product with this barcode already exists in this store');
      }
    }

    // Check if new SKU conflicts with existing products
    if (updates.sku && updates.sku !== existingProduct.sku) {
      const existingBySku = await this.productModel.existsBySku(
        updates.sku,
        storeId,
        id
      );

      if (existingBySku) {
        throw new Error('A product with this SKU already exists in this store');
      }
    }

    console.log('✅ Updating product:', id);
    return await this.productModel.update(id, storeId, updates);
  }

  /**
   * Adjust product stock (add or remove)
   */
  async adjustStock(id: string, storeId: string, adjustment: number, reason?: string): Promise<Product> {
    const product = await this.productModel.findById(id, storeId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    const newStock = product.stock + adjustment;

    if (newStock < 0) {
      throw new Error('Insufficient stock for this operation');
    }

    console.log(`📦 Adjusting stock for ${product.name}: ${product.stock} → ${newStock} (${reason || 'manual adjustment'})`);

    return await this.productModel.updateStock(id, storeId, adjustment);
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string, storeId: string): Promise<void> {
    const product = await this.productModel.findById(id, storeId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    console.log('🗑️ Deleting product:', product.name);
    await this.productModel.delete(id, storeId);
  }

  /**
   * Check low stock products
   */
  async getLowStockProducts(storeId: string): Promise<Product[]> {
    const result = await this.productModel.findByStore({
      store_id: storeId,
      low_stock: true,
      limit: 100
    });

    return result.products;
  }

  /**
   * Bulk update stock (for sales or restocking)
   */
  async bulkUpdateStock(
    storeId: string, 
    updates: Array<{ productId: string; adjustment: number }>
  ): Promise<Product[]> {
    const updatedProducts: Product[] = [];

    for (const update of updates) {
      try {
        const product = await this.adjustStock(
          update.productId,
          storeId,
          update.adjustment,
          'bulk update'
        );
        updatedProducts.push(product);
      } catch (error) {
        console.error(`Error updating product ${update.productId}:`, error);
        // Continue with other products
      }
    }

    return updatedProducts;
  }
}

export const productService = new ProductService();

