import { BaseModel } from './BaseModel';
import { Sale, SaleItem, SaleFilters } from '../types/sale';

export class SaleModel extends BaseModel {
  async createSale(
    sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<SaleItem, 'id' | 'sale_id' | 'created_at'>[]
  ): Promise<{ sale: Sale; items: SaleItem[] }> {
    const { data: saleRows, error: saleErr } = await this.supabase
      .from('sales')
      .insert(sale)
      .select('*')
      .limit(1);
    if (saleErr || !saleRows || saleRows.length === 0) this.handleError(saleErr, 'createSale');
    const createdSale = saleRows[0] as Sale;

    const withSaleId = items.map(i => ({ ...i, sale_id: createdSale.id }));
    const { data: itemRows, error: itemErr } = await this.supabase
      .from('sale_items')
      .insert(withSaleId)
      .select('*');
    if (itemErr) this.handleError(itemErr, 'createSaleItems');

    return { sale: createdSale, items: (itemRows || []) as SaleItem[] };
  }

  async findById(saleId: string, storeId: string): Promise<{ sale: Sale; items: SaleItem[] } | null> {
    const { data: sale, error } = await this.supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .eq('store_id', storeId)
      .single();
    if (error && (error as any).code !== 'PGRST116') this.handleError(error, 'findSaleById');
    if (!sale) return null;

    const { data: items } = await this.supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: true });
    return { sale: sale as Sale, items: (items || []) as SaleItem[] };
  }

  async list(filters: SaleFilters): Promise<{ sales: Sale[]; total: number }> {
    const { store_id, user_id, payment_method, payment_status, start_date, end_date, page = 1, limit = 20 } = filters;
    let query = this.supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .eq('store_id', store_id);
    if (user_id) query = query.eq('user_id', user_id);
    if (payment_method) query = query.eq('payment_method', payment_method);
    if (payment_status) query = query.eq('payment_status', payment_status);
    if (start_date) query = query.gte('created_at', start_date.toISOString());
    if (end_date) query = query.lte('created_at', end_date.toISOString());

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) this.handleError(error, 'listSales');
    return { sales: (data || []) as Sale[], total: count || 0 };
  }

  async latestReceiptNumberPrefix(storeId: string, year: number): Promise<string | null> {
    const { data } = await this.supabase
      .from('sales')
      .select('receipt_number')
      .eq('store_id', storeId)
      .like('receipt_number', `REC-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1);
    return data && data.length > 0 ? (data[0] as any).receipt_number : null;
  }

  async searchByTicket(storeId: string, searchTerm: string): Promise<{ sale: Sale; items: SaleItem[] } | null> {
    // Try to find by sale ID first (barcode scan)
    let query = this.supabase
      .from('sales')
      .select('*')
      .eq('store_id', storeId);

    // Check if searchTerm looks like a UUID (sale ID from barcode)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(searchTerm)) {
      query = query.eq('id', searchTerm);
    } else {
      // Otherwise search by receipt number
      query = query.eq('receipt_number', searchTerm);
    }

    const { data: sale, error } = await query.single();
    if (error && (error as any).code !== 'PGRST116') this.handleError(error, 'searchByTicket');
    if (!sale) return null;

    const { data: items } = await this.supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', (sale as Sale).id)
      .order('created_at', { ascending: true });
    
    return { sale: sale as Sale, items: (items || []) as SaleItem[] };
  }

  async updateSale(
    saleId: string, 
    storeId: string, 
    updates: {
      subtotal?: number;
      tax?: number;
      discount?: number;
      total?: number;
    }
  ): Promise<Sale> {
    const { data, error } = await this.supabase
      .from('sales')
      .update(updates)
      .eq('id', saleId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating sale:', error);
      throw new Error(`Failed to update sale: ${error.message}`);
    }

    if (!data) {
      throw new Error('Sale not found');
    }

    return data as Sale;
  }

  async updateSaleItem(
    itemId: string, 
    updates: {
      unit_price?: number;
      subtotal?: number;
      discount?: number;
      total?: number;
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('sale_items')
      .update(updates)
      .eq('id', itemId);

    if (error) {
      console.error('Error updating sale item:', error);
      throw new Error(`Failed to update sale item: ${error.message}`);
    }
  }
}
