import { ProductModel } from '../models/ProductModel';
import { StoreModel } from '../models/StoreModel';
import { SaleModel } from '../models/SaleModel';
import { CreateSaleRequest, Sale, SaleItem } from '../types/sale';

export class SaleService {
  private saleModel = new SaleModel();
  private productModel = new ProductModel();
  private storeModel = new StoreModel();

  async generateReceipt(storeId: string): Promise<string> {
    const year = new Date().getFullYear();
    const latest = await this.saleModel.latestReceiptNumberPrefix(storeId, year);
    const next = latest ? parseInt(latest.split('-')[2] || '0', 10) + 1 : 1;
    return `REC-${year}-${String(next).padStart(6, '0')}`;
  }

  async processSale(req: CreateSaleRequest, userId: string, requirePaymentConfirmation: boolean = false): Promise<Sale & { items: SaleItem[] }> {
    const { store_id, items, payment_method, discount = 0, notes } = req;
    if (!items || items.length === 0) throw new Error('Sale must contain at least one item');

    // Validate each item and compute totals
    let subtotal = 0;
    const preparedItems: Omit<SaleItem, 'id' | 'sale_id' | 'created_at'>[] = [];

    for (const it of items) {
      const product = await this.productModel.findById(it.product_id, store_id);
      if (!product) throw new Error('Product not found');
      if (!product.is_active) throw new Error(`Product ${product.name} is inactive`);

      const stockType = it.stock_type || 'venta';
      const available = stockType === 'venta' ? (product.stock_venta || 0) : (product.stock_deposito || 0);
      if (available < it.quantity) throw new Error(`Insufficient stock for ${product.name}`);

      const unit_price = it.unit_price ?? product.price;
      const itemSubtotal = unit_price * it.quantity;
      const itemDiscount = it.discount || 0;
      const itemTotal = itemSubtotal - itemDiscount;
      subtotal += itemTotal;

      preparedItems.push({
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku ?? null,
        product_barcode: product.barcode ?? null,
        quantity: it.quantity,
        unit_price,
        subtotal: itemSubtotal,
        discount: itemDiscount,
        total: itemTotal,
        stock_type: stockType
      });
    }

    // Tax rate from store (stored as percentage, e.g., 16.00 for 16%)
    const store = await this.storeModel.findById(store_id);
    const taxRate = store?.tax_rate ? Number(store.tax_rate) / 100 : 0;
    const tax = subtotal * taxRate;
    const total = subtotal + tax - discount;

    const receipt_number = await this.generateReceipt(store_id);

    const saleData = {
      store_id,
      user_id: userId,
      subtotal,
      tax,
      discount,
      total,
      payment_method,
      payment_status: requirePaymentConfirmation ? 'pending' as const : 'completed' as const,
      receipt_number,
      notes
    };

    const { sale, items: createdItems } = await this.saleModel.createSale(saleData as any, preparedItems);

    // Only update stock if payment is confirmed (not pending)
    if (!requirePaymentConfirmation) {
      // Update stock and record movements
      for (const item of createdItems) {
        const product = await this.productModel.findById(item.product_id, sale.store_id);
        if (!product) continue;
        const stockField = item.stock_type === 'venta' ? 'stock_venta' : 'stock_deposito';
        const before = (product as any)[stockField] || 0;
        const after = before - item.quantity;
        if (after < 0) throw new Error(`Stock negative for ${product.name}`);

        // Persist new stock
        await (this as any).productModel['supabase']
          .from('products')
          .update({ [stockField]: after })
          .eq('id', item.product_id)
          .eq('store_id', sale.store_id);

        // Record movement
        await (this as any).productModel['supabase']
          .from('stock_movements')
          .insert({
            product_id: item.product_id,
            store_id: sale.store_id,
            movement_type: 'sale',
            stock_type: item.stock_type,
            quantity_change: -item.quantity,
            quantity_before: before,
            quantity_after: after,
            reason: `Sale ${sale.receipt_number}`,
            performed_by: sale.user_id,
            notes: null
          });
      }
    }

    return { ...(sale as any), items: createdItems };
  }

  async confirmPendingSale(saleId: string, storeId: string): Promise<Sale & { items: SaleItem[] }> {
    // Get the pending sale
    const existing = await this.saleModel.findById(saleId, storeId);
    if (!existing) throw new Error('Sale not found');
    const { sale, items } = existing;
    
    if (sale.payment_status !== 'pending') {
      throw new Error('Sale is not in pending status');
    }

    // Update sale status to completed
    const { data: updatedSaleRows, error: updErr } = await (this as any).saleModel['supabase']
      .from('sales')
      .update({ payment_status: 'completed' })
      .eq('id', saleId)
      .eq('store_id', storeId)
      .select('*')
      .limit(1);
    
    if (updErr || !updatedSaleRows || updatedSaleRows.length === 0) {
      throw new Error('Failed to update sale status');
    }

    const updatedSale = updatedSaleRows[0] as Sale;

    // Now update stock and record movements
    for (const item of items) {
      const product = await this.productModel.findById(item.product_id, sale.store_id);
      if (!product) continue;
      const stockField = item.stock_type === 'venta' ? 'stock_venta' : 'stock_deposito';
      const before = (product as any)[stockField] || 0;
      const after = before - item.quantity;
      if (after < 0) throw new Error(`Stock negative for ${product.name}`);

      // Persist new stock
      await (this as any).productModel['supabase']
        .from('products')
        .update({ [stockField]: after })
        .eq('id', item.product_id)
        .eq('store_id', sale.store_id);

      // Record movement
      await (this as any).productModel['supabase']
        .from('stock_movements')
        .insert({
          product_id: item.product_id,
          store_id: sale.store_id,
          movement_type: 'sale',
          stock_type: item.stock_type,
          quantity_change: -item.quantity,
          quantity_before: before,
          quantity_after: after,
          reason: `Sale ${sale.receipt_number}`,
          performed_by: sale.user_id,
          notes: null
        });
    }

    return { ...updatedSale, items };
  }

  async refundSale(saleId: string, storeId: string, userId: string): Promise<{ sale: Sale; items: SaleItem[] }> {
    const existing = await this.saleModel.findById(saleId, storeId);
    if (!existing) throw new Error('Sale not found');
    const { sale, items } = existing;
    if (sale.payment_status === 'refunded') throw new Error('Sale already refunded');

    // Reverse stock for each item
    for (const item of items) {
      const product = await this.productModel.findById(item.product_id, storeId);
      if (!product) continue;
      const stockField = item.stock_type === 'venta' ? 'stock_venta' : 'stock_deposito';
      const before = (product as any)[stockField] || 0;
      const after = before + item.quantity;

      await (this as any).productModel['supabase']
        .from('products')
        .update({ [stockField]: after })
        .eq('id', item.product_id)
        .eq('store_id', storeId);

      await (this as any).productModel['supabase']
        .from('stock_movements')
        .insert({
          product_id: item.product_id,
          store_id: storeId,
          movement_type: 'return',
          stock_type: item.stock_type,
          quantity_change: item.quantity,
          quantity_before: before,
          quantity_after: after,
          reason: `Return ${sale.receipt_number}`,
          performed_by: userId,
          notes: null,
        });
    }

    // Update sale status to refunded
    const { data: updatedSaleRows, error: updErr } = await (this as any).saleModel['supabase']
      .from('sales')
      .update({ payment_status: 'refunded' })
      .eq('id', saleId)
      .eq('store_id', storeId)
      .select('*')
      .limit(1);
    if (updErr || !updatedSaleRows || updatedSaleRows.length === 0) {
      throw new Error('Failed to update sale status');
    }

    return { sale: updatedSaleRows[0] as Sale, items };
  }

  async getReturnsSummary(saleId: string, storeId: string): Promise<{ items: Array<{ sale_item: SaleItem; returned_quantity: number; remaining_quantity: number; stock_current: number }> }> {
    const existing = await this.saleModel.findById(saleId, storeId);
    if (!existing) throw new Error('Sale not found');
    // const { sale, items } = existing;
    const { items } = existing;

    // Fetch stock movements for this sale's returns (linked by sale_id)
    const { data: movements, error: movErr } = await (this as any).productModel['supabase']
      .from('stock_movements')
      .select('product_id, stock_type, quantity_change, reason')
      .eq('store_id', storeId)
      .eq('movement_type', 'return')
      .eq('sale_id', saleId);
    if (movErr) throw new Error('Failed to load returns summary');

    const returnedByKey = new Map<string, number>();
    for (const m of movements || []) {
      const key = `${m.product_id}:${m.stock_type}`;
      const prev = returnedByKey.get(key) || 0;
      returnedByKey.set(key, prev + Number(m.quantity_change || 0));
    }

    const summaryItems = await Promise.all(items.map(async (it) => {
      const key = `${it.product_id}:${it.stock_type}`;
      const returned = returnedByKey.get(key) || 0;
      const remaining = Math.max(0, Number(it.quantity) - Number(returned));
      const product = await this.productModel.findById(it.product_id, storeId);
      const stockField = it.stock_type === 'venta' ? 'stock_venta' : 'stock_deposito';
      const stock_current = product ? Number((product as any)[stockField] || 0) : 0;
      return { sale_item: it, returned_quantity: returned, remaining_quantity: remaining, stock_current };
    }));

    return { items: summaryItems };
  }

  async returnItemsBatch(
    saleId: string,
    storeId: string,
    userId: string,
    items: Array<{ sale_item_id: string; product_id: string; stock_type: 'venta' | 'deposito'; quantity: number; return_type: 'defective' | 'customer_mistake' }>
  ): Promise<{ processed: Array<{ sale_item_id: string; quantity: number; return_type: string }>; summary: { items: Array<{ sale_item: SaleItem; returned_quantity: number; remaining_quantity: number; stock_current: number }> } }>{
    if (!items || items.length === 0) throw new Error('No items to return');

    const existing = await this.saleModel.findById(saleId, storeId);
    if (!existing) throw new Error('Sale not found');
    const { sale, items: saleItems } = existing;

    // Build quick lookup
    const byId = new Map<string, SaleItem>(saleItems.map((it) => [it.id, it]));

    // Get current returns summary to validate remaining quantities
    const currentSummary = await this.getReturnsSummary(saleId, storeId);
    const remainingByKey = new Map<string, number>();
    for (const s of currentSummary.items) {
      const key = `${s.sale_item.product_id}:${s.sale_item.stock_type}`;
      remainingByKey.set(key, s.remaining_quantity);
    }

    const processed: Array<{ sale_item_id: string; quantity: number; return_type: string }> = [];

    for (const req of items) {
      const si = byId.get(req.sale_item_id);
      if (!si || si.product_id !== req.product_id || si.stock_type !== req.stock_type) {
        throw new Error('Invalid sale item in return request');
      }
      if (req.quantity <= 0) throw new Error('Return quantity must be positive');
      const key = `${req.product_id}:${req.stock_type}`;
      const remaining = remainingByKey.get(key) ?? Math.max(0, Number(si.quantity));
      if (req.quantity > remaining) throw new Error(`Return quantity exceeds remaining for ${si.product_name}`);

      const product = await this.productModel.findById(req.product_id, storeId);
      if (!product) throw new Error('Product not found');

      const stockField = req.stock_type === 'venta' ? 'stock_venta' : 'stock_deposito';
      const before = (product as any)[stockField] || 0;
      let after = before;

      // For customer mistake, add back to stock; for defective, do not update stock
      if (req.return_type === 'customer_mistake') {
        after = before + req.quantity;
        await (this as any).productModel['supabase']
          .from('products')
          .update({ [stockField]: after })
          .eq('id', req.product_id)
          .eq('store_id', storeId);
      }

      // Record movement with quantity_change for both types to prevent double returns
      await (this as any).productModel['supabase']
        .from('stock_movements')
        .insert({
          product_id: req.product_id,
          store_id: storeId,
          movement_type: 'return',
          stock_type: req.stock_type,
          quantity_change: req.quantity,
          quantity_before: before,
          quantity_after: after,
          reason: `Return ${sale.receipt_number} (${req.return_type})`,
          sale_id: sale.id,
          performed_by: userId,
          notes: req.return_type === 'defective' ? 'Defective item excluded from inventory' : null
        });

      processed.push({ sale_item_id: req.sale_item_id, quantity: req.quantity, return_type: req.return_type });

      // Update remaining for validation in same batch
      remainingByKey.set(key, (remainingByKey.get(key) || remaining) - req.quantity);
    }

    const summary = await this.getReturnsSummary(saleId, storeId);
    
    // Check if all items have been fully returned
    const allFullyReturned = summary.items.every(item => item.remaining_quantity === 0);
    
    // Update sale status to 'refunded' if all items are fully returned
    if (allFullyReturned && sale.payment_status !== 'refunded') {
      await (this as any).saleModel['supabase']
        .from('sales')
        .update({ payment_status: 'refunded' })
        .eq('id', saleId)
        .eq('store_id', storeId);
    }
    
    return { processed, summary };
  }

  async getReturnedProducts(saleId: string, storeId: string): Promise<{ returns: Array<{ product_id: string; product_name: string; quantity: number; return_date: string; return_type: 'defective' | 'customer_mistake' }> }> {
    const existing = await this.saleModel.findById(saleId, storeId);
    if (!existing) throw new Error('Sale not found');

    // Fetch stock movements for this sale's returns
    const { data: movements, error: movErr } = await (this as any).productModel['supabase']
      .from('stock_movements')
      .select('product_id, quantity_change, created_at, reason, notes')
      .eq('store_id', storeId)
      .eq('movement_type', 'return')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false });
    
    if (movErr) throw new Error('Failed to load returned products');

    const returns: Array<{ product_id: string; product_name: string; quantity: number; return_date: string; return_type: 'defective' | 'customer_mistake' }> = [];

    for (const m of movements || []) {
      const product = await this.productModel.findById(m.product_id, storeId);
      if (!product) continue;

      // Determine return type from reason or notes
      const returnType = m.reason?.includes('defective') || m.notes?.includes('Defective') ? 'defective' : 'customer_mistake';

      returns.push({
        product_id: m.product_id,
        product_name: product.name,
        quantity: Number(m.quantity_change || 0),
        return_date: m.created_at,
        return_type: returnType
      });
    }

    return { returns };
  }
}
