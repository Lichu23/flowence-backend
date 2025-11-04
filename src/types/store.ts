/**
 * Store Types (Multi-Store Architecture)
 */

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  address?: string;
  phone?: string;
  currency: string;
  tax_rate: number;
  low_stock_threshold: number;
  timezone?: string;
  date_format?: string;
  time_format?: string;
  receipt_header?: string;
  receipt_footer?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStoreData {
  owner_id: string;
  name: string;
  address?: string;
  phone?: string;
  currency?: string;
  tax_rate?: number;
  low_stock_threshold?: number;
}

export interface UpdateStoreData {
  name?: string;
  address?: string;
  phone?: string;
  currency?: string;
  tax_rate?: number;
  timezone?: string;
  date_format?: string;
  time_format?: string;
  receipt_header?: string;
  receipt_footer?: string;
  logo_url?: string;
}

export interface StoreWithOwner extends Store {
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

export interface StoreSettings {
  currency: string;
  tax_rate: number;
  low_stock_threshold: number;
  timezone?: string;
  date_format?: string;
  time_format?: string;
  receipt_header?: string;
  receipt_footer?: string;
  logo_url?: string;
}

export interface StoreStats {
  total_products: number;
  total_sales: number;
  total_revenue: number;
  low_stock_products: number;
  total_users: number;
  average_sale_amount: number;
  last_sale_date?: string;
}

export interface StoreAnalytics {
  daily_revenue: Array<{
    date: string;
    revenue: number;
    sales: number;
  }>;
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
  sales_by_payment_method: Array<{
    payment_method: string;
    count: number;
    total: number;
  }>;
  low_stock_alerts: Array<{
    product_id: string;
    product_name: string;
    current_stock: number;
    threshold: number;
  }>;
}

export interface StoreListItem {
  id: string;
  name: string;
  address?: string;
  role: 'owner' | 'employee'; // User's role in this store
  product_count?: number;
  employee_count?: number;
  last_sale_date?: string;
}
