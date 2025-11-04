import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { User, Store, Product, Sale } from '../types';

export class SupabaseService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor() {
    // Client for regular operations
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        }
      }
    );

    // Admin client for server-side operations
    this.supabaseAdmin = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey || config.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  // Get the regular client
  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Get the admin client
  getAdminClient(): SupabaseClient {
    return this.supabaseAdmin;
  }

  // User operations
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role: 'owner' | 'employee';
    storeId?: string;
    email_confirm?: boolean;
  }) {
    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: userData.email_confirm || false,
      user_metadata: {
        name: userData.name,
        role: userData.role,
        store_id: userData.storeId
      }
    });

    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string, metadata: any) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async getUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  // Database operations using Supabase client
  async getUsers(storeId?: string) {
    let query = this.supabaseAdmin
      .from('users')
      .select('*')
      .eq('is_active', true);

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getUserById(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(id: string, updates: Partial<User>) {
    const { data, error } = await this.supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteUser(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Store operations
  async getStores(ownerId?: string) {
    let query = this.supabaseAdmin
      .from('stores')
      .select('*')
      .eq('is_active', true);

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getStoreById(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  }

  async createStore(storeData: Partial<Store>) {
    const { data, error } = await this.supabaseAdmin
      .from('stores')
      .insert(storeData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateStore(id: string, updates: Partial<Store>) {
    const { data, error } = await this.supabaseAdmin
      .from('stores')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Product operations
  async getProducts(storeId: string, filters?: {
    search?: string;
    category?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }) {
    let query = this.supabaseAdmin
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.lowStock) {
      // This would need a join with stores table to get low_stock_threshold
      // For now, we'll use a simple stock check
      query = query.lt('stock', 10);
    }

    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getProductById(id: string, storeId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  }

  async createProduct(productData: Partial<Product>) {
    const { data, error } = await this.supabaseAdmin
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProduct(id: string, updates: Partial<Product>) {
    const { data, error } = await this.supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProduct(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Sale operations
  async getSales(storeId: string, filters?: {
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    let query = this.supabaseAdmin
      .from('sales')
      .select(`
        *,
        sale_items (
          *,
          products (
            name,
            barcode
          )
        )
      `)
      .eq('store_id', storeId);

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async createSale(saleData: Partial<Sale>, items: any[]) {
    const { data: sale, error: saleError } = await this.supabaseAdmin
      .from('sales')
      .insert(saleData)
      .select()
      .single();

    if (saleError) throw saleError;

    // Insert sale items
    const saleItems = items.map(item => ({
      sale_id: sale.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity
    }));

    const { data: itemsData, error: itemsError } = await this.supabaseAdmin
      .from('sale_items')
      .insert(saleItems)
      .select();

    if (itemsError) throw itemsError;

    return { ...sale, items: itemsData };
  }

  // Storage operations
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await this.supabaseAdmin.storage
      .from(bucket)
      .upload(path, file);

    if (error) throw error;
    return data;
  }

  async getPublicUrl(bucket: string, path: string) {
    const { data } = this.supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);

    return data;
  }

  // Realtime subscriptions
  subscribeToTable(table: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table },
        callback
      )
      .subscribe();
  }

  // Close connections
  async close() {
    // Supabase client doesn't need explicit closing
    // but we can clear any active subscriptions
    await this.supabase.removeAllChannels();
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
