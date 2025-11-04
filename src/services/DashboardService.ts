import { ProductModel } from '../models/ProductModel';
import { UserModel } from '../models/UserModel';
import { UserStoreModel } from '../models/UserStoreModel';
import { SaleModel } from '../models/SaleModel';
import { Product } from '../types/product';

export interface DashboardStats {
  totalProducts: number;
  totalSales: number;
  revenue: number;
  employees: number;
  lowStockProducts?: number; // Only for owners
  totalValue?: number; // Only for owners (deprecated, use monthlyExpenses)
  recentProducts?: any[]; // Only for owners
  monthlyExpenses?: number; // Monthly product purchases (cost × quantity)
  monthlySales?: number; // Sales count for current month
  monthlyRevenue?: number; // Revenue for current month
  currentMonth?: string; // e.g., "Octubre 2025"
  totalLosses?: number; // Total losses from defective products
  refundedOrders?: number; // Total number of refunded orders
  overallRevenue?: number; // Total revenue across all time (not just monthly)
  overallExpenses?: number; // Total expenses across all time (not just monthly)
}

export interface StoreInventoryStats {
  storeId: string;
  storeName: string;
  totalProducts: number;
  totalValue: number;
  lowStockProducts: number;
  employees: number;
}

export class DashboardService {
  private static productModel = new ProductModel();
  private static userModel = new UserModel();
  private static userStoreModel = new UserStoreModel();
  private static saleModel = new SaleModel();

  /**
   * Get dashboard statistics based on user role
   */
  static async getDashboardStats(
    storeId: string, 
    userRole: string
  ): Promise<DashboardStats> {
    const stats: DashboardStats = {
      totalProducts: 0,
      totalSales: 0,
      revenue: 0,
      employees: 0
    };

    try {
      // Get products count for the store
      const productsResult = await this.productModel.findByStore({
        store_id: storeId,
        page: 1,
        limit: 1, // We only need the count
        is_active: true
      });

      stats.totalProducts = productsResult.pagination.total || 0;

      // Get employees count for the store (excluding owners)
      const employees = await this.userModel.findByStore(storeId);
      stats.employees = employees.filter(emp => emp.role === 'employee').length;

      // Owner gets additional metrics
      if (userRole === 'owner') {
        // Get all products to calculate total value
        const allProductsResult = await this.productModel.findByStore({
          store_id: storeId,
          page: 1,
          limit: 1000, // Get all products
          is_active: true
        });

        const products = (allProductsResult.products || []) as Product[];
        
        // Calculate total inventory value using dual stock (kept for backward compatibility)
        stats.totalValue = products.reduce((total: number, product: Product) => {
          const warehouseValue = (product.cost * (product.stock_deposito || 0));
          const salesValue = (product.cost * (product.stock_venta || 0));
          return total + warehouseValue + salesValue;
        }, 0);

        // Count low stock products using dual stock
        stats.lowStockProducts = products.filter((product: Product) => {
          const isLowWarehouse = (product.stock_deposito || 0) <= (product.min_stock_deposito || 0);
          const isLowSales = (product.stock_venta || 0) <= (product.min_stock_venta || 0);
          return isLowWarehouse || isLowSales;
        }).length;

        // Get recent products (last 5)
        stats.recentProducts = products
          .sort((a: Product, b: Product) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map((product: Product) => ({
            id: product.id,
            name: product.name,
            stock: product.stock,
            price: product.price,
            created_at: product.created_at
          }));

        // Calculate monthly expenses (products purchased this month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        stats.currentMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

        const productsThisMonth = products.filter((p: Product) => new Date(p.created_at) >= startOfMonth);
        stats.monthlyExpenses = productsThisMonth.reduce((total: number, product: Product) => {
          const totalStock = (product.stock_deposito || 0) + (product.stock_venta || 0);
          return total + (product.cost * totalStock);
        }, 0);

        // Calculate overall expenses (all-time)
        stats.overallExpenses = products.reduce((total: number, product: Product) => {
          const totalStock = (product.stock_deposito || 0) + (product.stock_venta || 0);
          return total + (product.cost * totalStock);
        }, 0);
      }

      // Get sales statistics for the store
      const salesResult = await this.saleModel.list({
        store_id: storeId,
        page: 1,
        limit: 1000, // Get all sales to calculate totals
        payment_status: 'completed' // Only count completed sales
      });

      stats.totalSales = salesResult.total || 0;
      
      // Calculate total revenue from completed sales
      stats.revenue = salesResult.sales.reduce((total: number, sale: any) => {
        return total + parseFloat(sale.total || 0);
      }, 0);

      // Calculate overall revenue (all-time)
      stats.overallRevenue = stats.revenue;

      // Calculate total losses from defective products
      const defectiveMovements = await (this.productModel as any)['supabase']
        .from('stock_movements')
        .select('quantity_change, product_id')
        .eq('store_id', storeId)
        .eq('movement_type', 'return')
        .like('reason', '%defective%');

      if (!defectiveMovements.error) {
        let totalLosses = 0;
        for (const movement of defectiveMovements.data || []) {
          const product = await this.productModel.findById(movement.product_id, storeId);
          if (product) {
            totalLosses += product.cost * Math.abs(Number(movement.quantity_change || 0));
          }
        }
        stats.totalLosses = totalLosses;
      }

      // Calculate refunded orders
      const refundedSales = salesResult.sales.filter((sale: any) => sale.status === 'refund');
      stats.refundedOrders = refundedSales.length;

      // Calculate monthly sales and revenue
      if (userRole === 'owner') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlySalesData = salesResult.sales.filter((sale: any) => new Date(sale.created_at) >= startOfMonth);
        stats.monthlySales = monthlySalesData.length;
        stats.monthlyRevenue = monthlySalesData.reduce((total: number, sale: any) => {
          return total + parseFloat(sale.total || 0);
        }, 0);
      }

      return stats;
    } catch (error) {
      console.error('DashboardService.getDashboardStats error:', error);
      throw error;
    }
  }

  /**
   * Get inventory statistics for all stores owned by a user
   * Only available for owners
   */
  static async getOwnerStoresInventoryStats(userId: string): Promise<StoreInventoryStats[]> {
    try {
      // Get all stores owned by the user
      const ownedStores = await this.userStoreModel.getOwnedStores(userId);
      
      const storesStats: StoreInventoryStats[] = [];

      // Get stats for each store
      for (const userStore of ownedStores) {
        const store = userStore.store;
        if (!store) continue;

        // Get products for this store
        const productsResult = await this.productModel.findByStore({
          store_id: store.id,
          page: 1,
          limit: 1000, // Get all products
          is_active: true
        });

        const products = productsResult.products || [];

        // Calculate total value using cost and dual stock
        const totalValue = products.reduce((total: number, product: Product) => {
          const warehouseValue = (product.cost * (product.stock_deposito || 0));
          const salesValue = (product.cost * (product.stock_venta || 0));
          return total + warehouseValue + salesValue;
        }, 0);

        // Count low stock products using dual stock
        const lowStockProducts = products.filter((product: Product) => {
          const isLowWarehouse = (product.stock_deposito || 0) <= (product.min_stock_deposito || 0);
          const isLowSales = (product.stock_venta || 0) <= (product.min_stock_venta || 0);
          return isLowWarehouse || isLowSales;
        }).length;

        // Get employees count for this store (excluding owners)
        const employees = await this.userModel.findByStore(store.id);

        storesStats.push({
          storeId: store.id,
          storeName: store.name,
          totalProducts: productsResult.pagination.total || 0,
          totalValue,
          lowStockProducts,
          employees: employees.filter(emp => emp.role === 'employee').length
        });
      }

      return storesStats;
    } catch (error) {
      console.error('DashboardService.getOwnerStoresInventoryStats error:', error);
      throw error;
    }
  }

  /**
   * Get defective products for a store
   * Returns products that have been returned as defective with monetary value
   */
  static async getDefectiveProducts(storeId: string): Promise<{ products: Array<{ product_id: string; product_name: string; total_defective: number; last_return_date: string; monetary_loss: number }> }> {
    try {
      // Query stock_movements for defective returns
      const { data: movements, error } = await (this.productModel as any)['supabase']
        .from('stock_movements')
        .select('product_id, quantity_change, created_at, reason')
        .eq('store_id', storeId)
        .eq('movement_type', 'return')
        .like('reason', '%defective%')
        .order('created_at', { ascending: false });

      if (error) throw new Error('Failed to fetch defective products');

      // Aggregate by product_id
      const byProduct = new Map<string, { total: number; lastDate: string }>();
      for (const m of movements || []) {
        const existing = byProduct.get(m.product_id);
        const qty = Number(m.quantity_change || 0);
        const date = m.created_at;
        if (!existing) {
          byProduct.set(m.product_id, { total: qty, lastDate: date });
        } else {
          existing.total += qty;
          if (new Date(date) > new Date(existing.lastDate)) {
            existing.lastDate = date;
          }
        }
      }

      // Fetch product names and calculate monetary loss
      const productIds = Array.from(byProduct.keys());
      const productsData: Array<{ product_id: string; product_name: string; total_defective: number; last_return_date: string; monetary_loss: number }> = [];

      for (const pid of productIds) {
        const product = await this.productModel.findById(pid, storeId);
        if (product) {
          const stats = byProduct.get(pid)!;
          const monetaryLoss = product.cost * stats.total; // Loss = cost × quantity
          productsData.push({
            product_id: pid,
            product_name: product.name,
            total_defective: stats.total,
            last_return_date: stats.lastDate,
            monetary_loss: monetaryLoss
          });
        }
      }

      // Sort by total defective descending
      productsData.sort((a, b) => b.total_defective - a.total_defective);

      return { products: productsData };
    } catch (error) {
      console.error('DashboardService.getDefectiveProducts error:', error);
      throw error;
    }
  }

  /**
   * Get global summary for all owned stores
   * Returns total employees and total profit with per-store breakdown
   */
  static async getGlobalSummary(userId: string): Promise<{ 
    totalEmployees: number; 
    totalProfit: number; 
    totalRevenue: number;
    totalExpenses: number;
    stores: Array<{ 
      storeId: string; 
      storeName: string; 
      month: string; 
      expenses: number; 
      revenue: number; 
      profit: number;
      employees: number;
    }> 
  }> {
    try {
      // Get all stores owned by the user
      const ownedStores = await this.userStoreModel.getOwnedStores(userId);
      
      let totalEmployees = 0;
      let totalRevenue = 0;
      let totalExpenses = 0;
      const storesBreakdown: Array<{ 
        storeId: string; 
        storeName: string; 
        month: string; 
        expenses: number; 
        revenue: number; 
        profit: number;
        employees: number;
      }> = [];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const currentMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

      // Get stats for each store
      for (const userStore of ownedStores) {
        const store = userStore.store;
        if (!store) continue;

        // Get employees count for this store (excluding owners)
        const employees = await this.userModel.findByStore(store.id);
        const employeeCount = employees.filter(emp => emp.role === 'employee').length;
        totalEmployees += employeeCount;

        // Get products for monthly expenses
        const productsResult = await this.productModel.findByStore({
          store_id: store.id,
          page: 1,
          limit: 1000,
          is_active: true
        });

        const products = productsResult.products || [];
        const productsThisMonth = products.filter((p: Product) => new Date(p.created_at) >= startOfMonth);
        const monthlyExpenses = productsThisMonth.reduce((total: number, product: Product) => {
          const totalStock = (product.stock_deposito || 0) + (product.stock_venta || 0);
          return total + (product.cost * totalStock);
        }, 0);

        // Get sales for monthly revenue
        const salesResult = await this.saleModel.list({
          store_id: store.id,
          page: 1,
          limit: 1000,
          payment_status: 'completed'
        });

        const monthlySalesData = salesResult.sales.filter((sale: any) => new Date(sale.created_at) >= startOfMonth);
        const monthlyRevenue = monthlySalesData.reduce((total: number, sale: any) => {
          return total + parseFloat(sale.total || 0);
        }, 0);

        const profit = monthlyRevenue - monthlyExpenses;

        totalRevenue += monthlyRevenue;
        totalExpenses += monthlyExpenses;

        storesBreakdown.push({
          storeId: store.id,
          storeName: store.name,
          month: currentMonth,
          expenses: monthlyExpenses,
          revenue: monthlyRevenue,
          profit,
          employees: employeeCount
        });
      }

      const totalProfit = totalRevenue - totalExpenses;

      return {
        totalEmployees,
        totalProfit,
        totalRevenue,
        totalExpenses,
        stores: storesBreakdown
      };
    } catch (error) {
      console.error('DashboardService.getGlobalSummary error:', error);
      throw error;
    }
  }
}
