/**
 * Product Types
 * Types for inventory management
 */

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  barcode?: string;
  sku?: string;
  category?: string;
  price: number;
  cost: number;
  stock: number; // Legacy field - will be deprecated
  stock_deposito: number; // Warehouse/storage stock
  stock_venta: number; // Sales floor stock
  min_stock_deposito: number; // Minimum warehouse stock
  min_stock_venta: number; // Minimum sales floor stock
  min_stock: number; // Legacy field - will be deprecated
  unit: string;
  image_url?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProductData {
  store_id: string;
  name: string;
  description?: string;
  barcode?: string;
  sku?: string;
  category?: string;
  price: number;
  cost: number;
  stock?: number; // Legacy field - optional for backward compatibility
  stock_deposito: number; // Required: initial warehouse stock
  stock_venta: number; // Required: initial sales floor stock
  min_stock?: number; // Legacy field - optional for backward compatibility
  min_stock_deposito?: number; // Minimum warehouse stock threshold
  min_stock_venta?: number; // Minimum sales floor stock threshold
  unit?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  barcode?: string;
  sku?: string;
  category?: string;
  price?: number;
  cost?: number;
  stock?: number; // Legacy field - optional for backward compatibility
  stock_deposito?: number; // Warehouse stock update
  stock_venta?: number; // Sales floor stock update
  min_stock?: number; // Legacy field - optional for backward compatibility
  min_stock_deposito?: number; // Minimum warehouse stock threshold
  min_stock_venta?: number; // Minimum sales floor stock threshold
  unit?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface ProductFilters {
  store_id: string;
  search?: string | undefined;
  category?: string | undefined;
  is_active?: boolean | undefined;
  low_stock?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sort_by?: 'name' | 'price' | 'stock' | 'created_at' | undefined;
  sort_order?: 'asc' | 'desc' | undefined;
}

export interface ProductStats {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  categories_count: number;
}

export interface ProductListResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: ProductStats;
}

// Stock operation interfaces
export interface RestockOperation {
  product_id: string;
  quantity: number; // Amount to move from warehouse to sales floor
  performed_by: string; // User ID who performed the operation
  notes?: string;
}

export interface StockAdjustment {
  product_id: string;
  stock_type: 'deposito' | 'venta'; // Which stock to adjust
  adjustment_type: 'increase' | 'decrease' | 'set'; // Type of adjustment
  quantity: number; // Amount to adjust (or new value for 'set')
  reason: string; // Reason for adjustment (required)
  performed_by: string; // User ID who performed the operation
  notes?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  store_id: string;
  movement_type: 'restock' | 'adjustment' | 'sale' | 'return';
  stock_type: 'deposito' | 'venta';
  quantity_change: number; // Positive for increase, negative for decrease
  quantity_before: number;
  quantity_after: number;
  reason: string;
  performed_by: string;
  notes?: string; // Optional field
  created_at: Date;
}

export interface StockOperationResult {
  success: boolean;
  movement_id?: string;
  updated_product: Product;
  message: string;
}
