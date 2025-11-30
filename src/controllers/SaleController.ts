import { Response } from 'express';
import { SaleService } from '../services/SaleService';
import { CreateSaleRequest } from '../types/sale';
import { ReceiptService } from '../services/ReceiptService';
import { StoreModel } from '../models/StoreModel';

export class SaleController {
  private saleService = new SaleService();
  private receiptService = new ReceiptService();
  private storeModel = new StoreModel();

  async process(req: any, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId;
      const storeId = req.params.storeId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }
      const payload: CreateSaleRequest = { ...req.body, store_id: storeId };

      // For manual POS payments (cash or card), both are completed immediately
      // Only set requirePaymentConfirmation=true for payment gateway integrations (Stripe, MercadoPago)
      const sale = await this.saleService.processSale(payload, userId, false);
      res.status(201).json({ success: true, data: { sale, receipt_number: sale.receipt_number }, message: 'Sale processed successfully', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { code: 'SALE_FAILED', message: error instanceof Error ? error.message : 'Failed to process sale' }, timestamp: new Date().toISOString() });
    }
  }

  async list(req: any, res: Response): Promise<void> {
    try {
      const storeId = req.params.storeId as string;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const payment_method = req.query.payment_method as any;
      const payment_status = req.query.payment_status as any;
      const start_date = req.query.start_date ? new Date(String(req.query.start_date)) : undefined;
      const end_date = req.query.end_date ? new Date(String(req.query.end_date)) : undefined;

      const filters = {
        store_id: storeId,
        // All users (owners and employees) can see all store sales
        // Sales belong to the store, not individual users
        payment_method,
        payment_status,
        start_date,
        end_date,
        page,
        limit,
      };

      // Delegate to model through service (or directly via model if needed)
      const model = (this.saleService as any).saleModel;
      const { sales, total } = await model.list(filters);
      const pages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: { sales, pagination: { page, limit, total, pages } },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: { code: 'SALES_LIST_FAILED', message: error instanceof Error ? error.message : 'Failed to list sales' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getOne(req: any, res: Response): Promise<void> {
    try {
      const user = req.user;
      const storeId = req.params.storeId as string;
      const saleId = req.params.saleId as string;

      const model = (this.saleService as any).saleModel;
      const result = await model.findById(saleId, storeId);
      if (!result) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sale not found' }, timestamp: new Date().toISOString() });
        return;
      }

      // If employee, restrict viewing to own sales
      if (user?.role === 'employee' && result.sale.user_id !== (user.id || user.userId)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not allowed' }, timestamp: new Date().toISOString() });
        return;
      }

      res.json({ success: true, data: { sale: result.sale, items: result.items }, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { code: 'SALE_GET_FAILED', message: error instanceof Error ? error.message : 'Failed to get sale' }, timestamp: new Date().toISOString() });
    }
  }

  async downloadReceipt(req: any, res: Response): Promise<void> {
    try {
      const storeId = req.params.storeId as string;
      const saleId = req.params.saleId as string;
      const model = (this.saleService as any).saleModel;
      const result = await model.findById(saleId, storeId);
      if (!result) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sale not found' }, timestamp: new Date().toISOString() });
        return;
      }
      const store = await this.storeModel.findById(storeId);
      const storeInfo: { name: string; address?: string; phone?: string; currency?: string; timezone?: string; date_format?: string; time_format?: string } = {
        name: store?.name || 'Flowence'
      };
      if (store?.address) storeInfo.address = store.address;
      if (store?.phone) storeInfo.phone = store.phone;
      if (store?.currency) storeInfo.currency = store.currency;
      if (store?.timezone) storeInfo.timezone = store.timezone;
      if (store?.date_format) storeInfo.date_format = store.date_format;
      if (store?.time_format) storeInfo.time_format = store.time_format;
      const buffer = await this.receiptService.generateReceiptPdf(result.sale, result.items, storeInfo);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.sale.receipt_number}.pdf"`);
      res.status(200).send(buffer);
    } catch (error) {
      res.status(400).json({ success: false, error: { code: 'RECEIPT_GENERATION_FAILED', message: error instanceof Error ? error.message : 'Failed to generate receipt' }, timestamp: new Date().toISOString() });
    }
  }

  async refund(req: any, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId;
      const storeId = req.params.storeId as string;
      const saleId = req.params.saleId as string;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }

      const result = await this.saleService.refundSale(saleId, storeId, userId);
      res.json({ success: true, data: { sale: result.sale }, message: 'Sale refunded', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { code: 'REFUND_FAILED', message: error instanceof Error ? error.message : 'Failed to refund sale' }, timestamp: new Date().toISOString() });
    }
  }

  async returnsSummary(req: any, res: Response): Promise<void> {
    try {
      const storeId = req.params.storeId as string;
      const saleId = req.params.saleId as string;
      const summary = await this.saleService.getReturnsSummary(saleId, storeId);
      res.json({ success: true, data: summary, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { code: 'RETURNS_SUMMARY_FAILED', message: error instanceof Error ? error.message : 'Failed to get returns summary' }, timestamp: new Date().toISOString() });
    }
  }

  async returnItemsBatch(req: any, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
        return;
      }
      const storeId = req.params.storeId as string;
      const saleId = req.params.saleId as string;
      const items = req.body?.items as Array<{ sale_item_id: string; product_id: string; stock_type: 'venta' | 'deposito'; quantity: number; return_type: 'defective' | 'customer_mistake' }>;
      const result = await this.saleService.returnItemsBatch(saleId, storeId, userId, items);
      res.json({ success: true, data: result, message: 'Items returned', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { code: 'RETURNS_BATCH_FAILED', message: error instanceof Error ? error.message : 'Failed to return items' }, timestamp: new Date().toISOString() });
    }
  }

  async getReturnedProducts(req: any, res: Response): Promise<void> {
    try {
      const storeId = req.params.storeId as string;
      const saleId = req.params.saleId as string;
      const result = await this.saleService.getReturnedProducts(saleId, storeId);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { code: 'RETURNED_PRODUCTS_FAILED', message: error instanceof Error ? error.message : 'Failed to get returned products' }, timestamp: new Date().toISOString() });
    }
  }

  async searchByTicket(req: any, res: Response): Promise<void> {
    try {
      const user = req.user;
      const storeId = req.params.storeId as string;
      const searchTerm = req.query.ticket as string;

      if (!searchTerm) {
        res.status(400).json({ success: false, error: { code: 'MISSING_SEARCH_TERM', message: 'Ticket number or barcode is required' }, timestamp: new Date().toISOString() });
        return;
      }

      const model = (this.saleService as any).saleModel;
      const result = await model.searchByTicket(storeId, searchTerm);
      
      if (!result) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sale not found' }, timestamp: new Date().toISOString() });
        return;
      }

      // If employee, restrict viewing to own sales
      if (user?.role === 'employee' && result.sale.user_id !== (user.id || user.userId)) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not allowed' }, timestamp: new Date().toISOString() });
        return;
      }

      res.json({ success: true, data: { sale: result.sale, items: result.items }, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ success: false, error: { code: 'SEARCH_FAILED', message: error instanceof Error ? error.message : 'Failed to search sale' }, timestamp: new Date().toISOString() });
    }
  }
}
