/**
 * Product Model
 * Handles database operations for products
 */

import { BaseModel } from './BaseModel';
import { 
  Product, 
  CreateProductData, 
  UpdateProductData, 
  ProductFilters,
  ProductStats,
  ProductListResponse
} from '../types/product';

export class ProductModel extends BaseModel {
  private tableName = 'products';

  /**
   * Create a new product
   */
  async create(productData: CreateProductData): Promise<Product> {
    const { data, error} = await this.supabase
      .from(this.tableName)
      .insert({
        ...productData,
        // Legacy support
        stock: (productData.stock_deposito || 0) + (productData.stock_venta || 0), // Total stock for backward compatibility
        min_stock: productData.min_stock ?? 5, // Legacy field
        // New dual stock fields
        stock_deposito: productData.stock_deposito,
        stock_venta: productData.stock_venta,
        min_stock_deposito: productData.min_stock_deposito ?? 10, // Default minimum warehouse stock
        min_stock_venta: productData.min_stock_venta ?? 5, // Default minimum sales floor stock
        // Other defaults
        unit: productData.unit ?? 'unit',
        is_active: productData.is_active ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      throw new Error(`Failed to create product: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Get product by ID
   */
  async findById(id: string, storeId: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('store_id', storeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows returned
      }
      console.error('Error fetching product:', error);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Get product by barcode
   */
  async findByBarcode(barcode: string, storeId: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('barcode', barcode)
      .eq('store_id', storeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching product by barcode:', error);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Get product by SKU
   */
  async findBySku(sku: string, storeId: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('sku', sku)
      .eq('store_id', storeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching product by SKU:', error);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Get all products for a store with filters
   */
  async findByStore(filters: ProductFilters): Promise<ProductListResponse> {
    const { 
      store_id, 
      search, 
      category, 
      is_active, 
      low_stock,
      page = 1, 
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = filters;

    // Build query
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('store_id', store_id);

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }

    // Apply sorting
    const ascending = sort_order === 'asc';
    query = query.order(sort_by, { ascending });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    let products = (data as Product[]) || [];

    // Apply low_stock filter in-memory if needed
    if (low_stock === true) {
      // Show only products with low stock (either warehouse or sales floor)
      products = products.filter(p => 
        p.stock_venta <= p.min_stock_venta || 
        p.stock_deposito <= p.min_stock_deposito ||
        p.stock <= p.min_stock // Legacy support
      );
    }
    // If low_stock is false or undefined, show all products (no filtering)

    // Get stats
    const stats = await this.getStats(store_id);

    // Calculate pagination (use filtered count if low_stock applied)
    const total = low_stock ? products.length : (count || 0);
    const pages = Math.ceil(total / limit);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages
      },
      stats
    };
  }

  /**
   * Get product statistics for a store
   */
  async getStats(storeId: string): Promise<ProductStats> {
    // Total products
    const { count: totalProducts } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId);

    // Low stock count - fetch all products and filter in-memory
    const { data: allProducts } = await this.supabase
      .from(this.tableName)
      .select('stock, min_stock, stock_deposito, min_stock_deposito, stock_venta, min_stock_venta')
      .eq('store_id', storeId);
    
    const lowStockData = (allProducts || []).filter((p: any) => 
      p.stock_venta <= p.min_stock_venta || 
      p.stock_deposito <= p.min_stock_deposito ||
      p.stock <= p.min_stock // Legacy support
    );

    // Out of stock count (both warehouse and sales floor empty)
    const { count: outOfStock } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('stock_deposito', 0)
      .eq('stock_venta', 0);

    // Total value (warehouse + sales floor stock * cost)
    const { data: products } = await this.supabase
      .from(this.tableName)
      .select('stock, cost, stock_deposito, stock_venta')
      .eq('store_id', storeId);

    const totalValue = (products || []).reduce((sum: number, p: any) => {
      const totalStock = (p.stock_deposito || 0) + (p.stock_venta || 0);
      return sum + (totalStock * p.cost);
    }, 0);

    // Unique categories
    const { data: categories } = await this.supabase
      .from(this.tableName)
      .select('category')
      .eq('store_id', storeId)
      .not('category', 'is', null);

    const uniqueCategories = new Set((categories || []).map((c: any) => c.category));

    return {
      total_products: totalProducts || 0,
      total_value: totalValue,
      low_stock_count: lowStockData?.length || 0,
      out_of_stock_count: outOfStock || 0,
      categories_count: uniqueCategories.size
    };
  }

  /**
   * Get unique categories for a store
   */
  async getCategories(storeId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('category')
      .eq('store_id', storeId)
      .not('category', 'is', null)
      .order('category');

    if (error) {
      console.error('Error fetching categories:', error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    // Get unique categories
    const categories = Array.from(
      new Set((data || []).map((item: any) => item.category).filter(Boolean))
    );

    return categories as string[];
  }

  /**
   * Update a product
   */
  async update(id: string, storeId: string, updates: UpdateProductData): Promise<Product> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      throw new Error(`Failed to update product: ${error.message}`);
    }

    if (!data) {
      throw new Error('Product not found');
    }

    return data as Product;
  }

  /**
   * Update product stock
   */
  async updateStock(id: string, storeId: string, stockChange: number): Promise<Product> {
    // Get current product
    const product = await this.findById(id, storeId);
    if (!product) {
      throw new Error('Product not found');
    }

    const newStock = product.stock + stockChange;
    
    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }

    return this.update(id, storeId, { stock: newStock });
  }

  /**
   * Delete a product
   */
  async delete(id: string, storeId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('store_id', storeId);

      if (error) {
      console.error('Error deleting product:', error);
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  /**
   * Check if product exists by barcode
   */
  async existsByBarcode(barcode: string, storeId: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('barcode', barcode)
      .eq('store_id', storeId);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count } = await query;
    return (count || 0) > 0;
  }

  /**
   * Check if product exists by SKU
   */
  async existsBySku(sku: string, storeId: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('sku', sku)
      .eq('store_id', storeId);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count } = await query;
    return (count || 0) > 0;
  }
}
