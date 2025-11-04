export type PaymentMethod = 'cash' | 'card' | 'mixed';
export type PaymentStatus = 'completed' | 'refunded' | 'cancelled' | 'pending';
export type StockType = 'venta' | 'deposito';

export interface Sale {
  id: string;
  store_id: string;
  user_id: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  receipt_number: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  product_barcode: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount: number;
  total: number;
  stock_type: StockType;
  created_at: string;
}

export interface CreateSaleItemRequest {
  product_id: string;
  quantity: number;
  unit_price?: number;
  discount?: number;
  stock_type?: StockType;
}

export interface CreateSaleRequest {
  store_id: string;
  items: CreateSaleItemRequest[];
  payment_method: PaymentMethod;
  discount?: number;
  notes?: string;
}

export interface SaleFilters {
  store_id: string;
  user_id?: string;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  start_date?: Date | undefined;
  end_date?: Date | undefined;
  page?: number;
  limit?: number;
}
 

