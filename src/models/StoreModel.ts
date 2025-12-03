/**
 * Store Model (Multi-Store Architecture)
 * Handles store data and relationships
 */

import { BaseModel } from './BaseModel';
import { Store, CreateStoreData, UpdateStoreData, StoreWithOwner, StoreListItem } from '../types/store';

export class StoreModel extends BaseModel {
  /**
   * Find store by ID
   */
  async findById(id: string): Promise<Store | null> {
    const { data, error } = await this.supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Get store with owner information
   */
  async findByIdWithOwner(id: string): Promise<StoreWithOwner | null> {
    const { data, error } = await this.supabase
      .from('stores')
      .select(`
        *,
        owner:users!stores_owner_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Get all stores for a user
   */
  async findByUser(userId: string): Promise<StoreListItem[]> {
    const { data, error } = await this.supabase
      .from('user_stores')
      .select(`
        role,
        store:stores (
          id,
          name,
          address,
          phone,
          currency,
          tax_rate,
          logo_url,
          business_size
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.handleError(error, 'Get user stores');
    }

    return data?.map((us: any) => ({
      id: us.store?.id,
      name: us.store?.name,
      address: us.store?.address,
      role: us.role,
      logo_url: us.store?.logo_url,
      business_size: us.store?.business_size
    })) || [];
  }

  /**
   * Get stores owned by user
   */
  async findOwnedByUser(userId: string): Promise<Store[]> {
    const { data, error } = await this.supabase
      .from('stores')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.handleError(error, 'Get owned stores');
    }

    return data || [];
  }

  /**
   * Create new store
   */
  async create(storeData: CreateStoreData): Promise<Store> {
    const { data, error } = await this.supabase
      .from('stores')
      .insert({
        owner_id: storeData.owner_id,
        name: storeData.name,
        address: storeData.address,
        phone: storeData.phone,
        currency: storeData.currency || 'USD',
        tax_rate: storeData.tax_rate || 0,
        low_stock_threshold: storeData.low_stock_threshold || 5
      })
      .select()
      .single();

    if (error) {
      this.handleError(error, 'Create store');
    }

    return data;
  }

  /**
   * Update store
   */
  async update(id: string, updates: UpdateStoreData): Promise<Store> {
    const { data, error } = await this.supabase
      .from('stores')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.handleError(error, 'Update store');
    }

    return data;
  }

  /**
   * Delete store
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('stores')
      .delete()
      .eq('id', id);

    if (error) {
      this.handleError(error, 'Delete store');
    }
  }

  /**
   * Check if user is owner of store
   */
  async isOwner(userId: string, storeId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('owner_id', userId)
      .single();

    if (error) {
      return false;
    }

    return !!data;
  }

  /**
   * Get store statistics
   */
  async getStats(storeId: string) {
    // Get product count
    const { count: productCount } = await this.supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId);

    // Get sales count and total
    const { data: salesData } = await this.supabase
      .from('sales')
      .select('total')
      .eq('store_id', storeId);

    const totalSales = salesData?.length || 0;
    const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;

    // Get employee count
    const { count: employeeCount } = await this.supabase
      .from('user_stores')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('role', 'employee');

    return {
      total_products: productCount || 0,
      total_sales: totalSales,
      total_revenue: totalRevenue,
      total_employees: employeeCount || 0,
      average_sale_amount: totalSales > 0 ? totalRevenue / totalSales : 0
    };
  }
}
