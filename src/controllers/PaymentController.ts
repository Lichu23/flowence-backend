import { Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';
import { SaleService } from '../services/SaleService';
import { MercadoPagoService } from '../services/MercadoPagoService';

export class PaymentController {
  private paymentService = new PaymentService();
  private saleService = new SaleService();
  private mercadoPagoService = new MercadoPagoService();

  async createIntent(req: Request, res: Response): Promise<void> {
    try {
      const { amount_cents, currency = 'usd', receipt_number, metadata } = req.body as any;
      const storeId = (req.params as any)['storeId'] as string;

      if (!amount_cents || typeof amount_cents !== 'number' || amount_cents <= 0) {
        res
          .status(400)
          .json({
            success: false,
            error: { code: 'INVALID_AMOUNT', message: 'amount_cents must be a positive number' },
            timestamp: new Date().toISOString()
          });
        return;
      }

      const intent = await this.paymentService.createPaymentIntent({
        amountCents: amount_cents,
        currency,
        storeId,
        receiptNumber: receipt_number,
        metadata
      });

      res
        .status(201)
        .json({
          success: true,
          data: { client_secret: (intent as any).client_secret, payment_intent_id: intent.id },
          message: 'Payment intent created',
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          error: {
            code: 'PAYMENT_INTENT_FAILED',
            message: error instanceof Error ? error.message : 'Failed to create payment intent'
          },
          timestamp: new Date().toISOString()
        });
    }
  }

  async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 PaymentController.confirmPayment called');
      console.log('🔍 Request params:', req.params);
      console.log('🔍 Request body:', req.body);

      const { payment_intent_id, sale_data } = req.body as any;
      const storeId = (req.params as any)['storeId'] as string;
      const userId = (req as any).user?.id || (req as any).user?.userId;

      if (!payment_intent_id) {
        res
          .status(400)
          .json({
            success: false,
            error: { code: 'MISSING_PAYMENT_INTENT', message: 'payment_intent_id is required' },
            timestamp: new Date().toISOString()
          });
        return;
      }

      if (!sale_data) {
        res
          .status(400)
          .json({
            success: false,
            error: { code: 'MISSING_SALE_DATA', message: 'sale_data is required' },
            timestamp: new Date().toISOString()
          });
        return;
      }

      if (!userId) {
        res
          .status(401)
          .json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
            timestamp: new Date().toISOString()
          });
        return;
      }

      // Verify payment intent status with Stripe
      const paymentIntent = await this.paymentService.retrievePaymentIntent(payment_intent_id);

      if (paymentIntent.status !== 'succeeded') {
        res.status(400).json({
          success: false,
          error: {
            code: 'PAYMENT_NOT_SUCCEEDED',
            message: `Payment not successful. Status: ${paymentIntent.status}`
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Only process sale after payment is confirmed successful
      const sale = await this.saleService.processSale(
        { ...sale_data, store_id: storeId },
        userId,
        true
      );

      // Confirm the pending sale and update stock
      const confirmedSale = await this.saleService.confirmPendingSale(sale.id, storeId);

      res.status(201).json({
        success: true,
        data: { sale: confirmedSale, receipt_number: confirmedSale.receipt_number },
        message: 'Payment confirmed and sale processed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_CONFIRMATION_FAILED',
          message:
            error instanceof Error ? error.message : 'Failed to confirm payment and process sale'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  async getPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { paymentIntentId } = req.params as any;

      if (!paymentIntentId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PAYMENT_INTENT_ID',
            message: 'payment_intent_id is required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Retrieve payment intent status from Stripe
      const paymentIntent = await this.paymentService.retrievePaymentIntent(paymentIntentId);

      res.json({
        success: true,
        data: {
          status: paymentIntent.status,
          payment_intent_id: paymentIntent.id
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve payment status';
      res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_STATUS_FAILED',
          message: errorMsg
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle Mercado Pago webhook for payment notifications
   * @route POST /api/webhooks/mercado-pago
   */
  async handleMercadoPagoWebhook(req: Request, res: Response): Promise<void> {
    console.log('🔔 Mercado Pago Webhook Received:', {
      headers: req.headers,
      query: req.query,
      body: req.body
    });

    try {
      const signature = req.headers['x-signature'] as string;
      const payload = JSON.stringify(req.body);

      // For test webhooks, we might not have a signature
      const isTestWebhook = req.body?.live_mode === false && req.body?.action === 'payment.updated';

      // Only verify signature for non-test webhooks
      if (!isTestWebhook) {
        if (!signature) {
          console.error('❌ Missing X-Signature header');
          res.status(401).json({
            success: false,
            error: { code: 'MISSING_SIGNATURE', message: 'Missing X-Signature header' },
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (!this.mercadoPagoService.verifyWebhookSignature(payload, signature)) {
          console.error('❌ Invalid webhook signature');
          res.status(401).json({
            success: false,
            error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' },
            timestamp: new Date().toISOString()
          });
          return;
        }
      } else {
        console.log('ℹ️ Test webhook detected, skipping signature verification');
      }

      const webhookData = req.body as any;
      console.log('📩 Webhook data:', {
        type: webhookData.type || webhookData.action,
        id: webhookData.id,
        live_mode: webhookData.live_mode,
        data_id: webhookData.data?.id
      });

      // Handle both test and production webhook formats
      const isPaymentNotification =
        webhookData.type === 'payment' ||
        (webhookData.action === 'payment.updated' && webhookData.data?.id);

      if (!isPaymentNotification) {
        console.log('ℹ️ Webhook received but not processed (not a payment notification)');
        res.status(200).json({
          success: true,
          message: 'Webhook received but not processed (not a payment notification)',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get payment ID from webhook data (handles both test and production formats)
      const paymentId = webhookData.data?.id || webhookData.id;
      if (!paymentId) {
        console.error('❌ Payment ID not found in webhook data');
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PAYMENT_ID', message: 'Payment ID not found in webhook data' },
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🔍 Retrieving payment details for ID: ${paymentId}`);

      try {
        // Retrieve full payment details from Mercado Pago API
        const payment = await this.mercadoPagoService.getPayment(parseInt(paymentId, 10));
        console.log(`ℹ️ Payment status: ${payment.status}`);

        // Check if payment is approved
        if (!this.mercadoPagoService.isPaymentApproved(payment)) {
          console.log(`ℹ️ Payment ${paymentId} not approved (status: ${payment.status})`);
          res.status(200).json({
            success: true,
            message: `Payment ${paymentId} processed but not approved (status: ${payment.status})`,
            timestamp: new Date().toISOString()
          });
          return;
        }

        console.log(`✅ Payment ${paymentId} approved, processing...`);

        // TODO: Process the approved payment (update order status, send confirmation, etc.)
        // For now, we'll just log it and return success

        res.status(200).json({
          success: true,
          data: {
            payment_id: payment.id,
            status: payment.status,
            amount: payment.transaction_amount,
            currency: payment.currency_id,
            external_reference: payment.external_reference,
            is_test: webhookData.live_mode === false
          },
          message: 'Payment webhook processed successfully',
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Successfully processed webhook for payment ${paymentId}`);
      } catch (error) {
        console.error(`❌ Error processing payment ${paymentId}:`, error);
        throw error; // Let the outer catch handle it
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Webhook processing failed:', errorMsg);
      res.status(500).json({
        success: false,
        error: { code: 'WEBHOOK_PROCESSING_FAILED', message: errorMsg },
        timestamp: new Date().toISOString()
      });
    }
  } /**
   * Create a Mercado Pago QR order for in-person payment
   * @route POST /api/stores/:storeId/payments/mercado-pago/qr-order
   */
  async createMercadoPagoQrOrder(req: Request, res: Response): Promise<void> {
    try {
      const storeId = (req.params as any)['storeId'] as string;
      const body = req.body as any;

      const { items, title, description, external_reference, total_amount, notification_url } =
        body || {};

      if (!Array.isArray(items) || items.length === 0) {
        res
          .status(400)
          .json({
            success: false,
            error: { code: 'INVALID_ITEMS', message: 'items is required' },
            timestamp: new Date().toISOString()
          });
        return;
      }

      const total =
        typeof total_amount === 'number'
          ? total_amount
          : items.reduce((acc: number, i: any) => acc + i.unit_price * i.quantity, 0);
      const extRef = external_reference || `store:${storeId}:ts:${Date.now()}`;

      const qr = await this.mercadoPagoService.createQrOrder({
        externalReference: extRef,
        title: title || 'Pedido en tienda',
        description,
        totalAmount: total,
        items: items.map((i: any) => ({
          title: i.title,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_amount: i.total_amount,
          unit_measure: i.unit_measure
        })),
        notificationUrl: notification_url
      });

      res.status(201).json({
        success: true,
        data: {
          qr_data: (qr as any).qr_data,
          in_store_order_id: (qr as any).in_store_order_id,
          external_reference: extRef
        },
        message: 'QR order created',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'QR_ORDER_CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create QR order'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Cancel Mercado Pago QR order (by external_reference)
   * @route DELETE /api/stores/:storeId/payments/mercado-pago/qr-order
   */
  async cancelMercadoPagoQrOrder(req: Request, res: Response): Promise<void> {
    try {
      const { external_reference } = (req.body || {}) as any;
      if (!external_reference) {
        res
          .status(400)
          .json({
            success: false,
            error: {
              code: 'MISSING_EXTERNAL_REFERENCE',
              message: 'external_reference is required'
            },
            timestamp: new Date().toISOString()
          });
        return;
      }

      await this.mercadoPagoService.cancelQrOrder(external_reference);
      res
        .status(200)
        .json({
          success: true,
          message: 'QR order cancelled',
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'QR_ORDER_CANCEL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to cancel QR order'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}
