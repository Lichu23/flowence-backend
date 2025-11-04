import crypto from 'crypto';

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string;
  external_reference?: string;
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string;
  card?: {
    last_four_digits: string;
  };
  authorization_code?: string;
  date_created: string;
  date_approved?: string;
}

export interface MercadoPagoWebhookPayload {
  id: string;
  type: string;
  data: {
    id: string;
  };
  live_mode: boolean;
  timestamp: string;
}

export class MercadoPagoService {
  private accessToken: string | null = null;
  private webhookSecret: string | null = null;
  private baseUrl: string | null = null;
  private initialized = false;

  // Optional QR configuration (distinct app or same)
  private qrAccessToken: string | null = null;
  private collectorId: string | null = null; // user/merchant id
  private posId: string | null = null; // POS id configured in MP Dashboard

  private initialize(): void {
    if (this.initialized) return;

    const env = process.env as Record<string, string | undefined>;
    this.accessToken = env['MERCADO_PAGO_ACCESS_TOKEN'] || null;
    this.webhookSecret = env['MERCADO_PAGO_WEBHOOK_SECRET'] || null;
    this.baseUrl = process.env['NODE_ENV'] === 'production' 
      ? 'https://api.mercadopago.com'
      : 'https://api.sandbox.mercadopago.com';

    // QR optional settings
    this.qrAccessToken = env['MERCADO_PAGO_QR_ACCESS_TOKEN'] || this.accessToken;
    this.collectorId = env['MERCADO_PAGO_QR_COLLECTOR_ID'] || null;
    this.posId = env['MERCADO_PAGO_QR_POS_ID'] || null;

    this.initialized = true;

    // Validate required environment variables
    if (!this.accessToken) {
      throw new Error('Missing required environment variable: MERCADO_PAGO_ACCESS_TOKEN');
    }

    // Only require webhook secret in production
    if (process.env['NODE_ENV'] === 'production' && !this.webhookSecret) {
      throw new Error('Missing required environment variable: MERCADO_PAGO_WEBHOOK_SECRET is required in production');
    }
  }

  /**
   * Make API request to Mercado Pago
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    this.initialize();
    const url = `${this.baseUrl}${endpoint}`;
    const options: {
      method: string;
      headers: Record<string, string>;
      body?: string;
    } = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Mercado Pago API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Make API request with QR token (can be different from default token)
   */
  private async makeQrRequest<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    this.initialize();
    if (!this.qrAccessToken) throw new Error('Missing QR access token');
    const url = `${this.baseUrl}${endpoint}`;
    const options: {
      method: string;
      headers: Record<string, string>;
      body?: string;
    } = {
      method,
      headers: {
        'Authorization': `Bearer ${this.qrAccessToken}`,
        'Content-Type': 'application/json'
      }
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Mercado Pago QR API error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  /**
   * Retrieve payment details from Mercado Pago API
   */
  async getPayment(paymentId: number): Promise<MercadoPagoPayment> {
    try {
      return await this.makeRequest<MercadoPagoPayment>(
        'GET',
        `/v1/payments/${paymentId}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to retrieve payment from Mercado Pago: ${errorMsg}`);
    }
  }

  /**
   * Search payments by external reference
   */
  async searchPayments(externalReference: string): Promise<MercadoPagoPayment[]> {
    try {
      const url = `/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}`;
      const response = await this.makeRequest<{ results: MercadoPagoPayment[] }>(
        'GET',
        url
      );
      return response.results || [];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to search payments: ${errorMsg}`);
    }
  }

  /**
   * Verify webhook signature
   * Mercado Pago uses X-Signature header with HMAC-SHA256
   * @param payload - Raw request body as string
   * @param signature - X-Signature header value in format: ts=<timestamp>,v1=<signature>
   * @returns boolean - True if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    this.initialize();
    
    // Log the incoming request details (redact sensitive parts in production)
    const logSensitive = process.env['NODE_ENV'] !== 'production';
    
    if (!this.webhookSecret) {
      const message = 'No webhook secret configured. Webhook validation will be bypassed.';
      console.warn('[MercadoPago]', message);
      if (process.env['NODE_ENV'] === 'production') {
        console.error('[MercadoPago] SECURITY WARNING: Running in production without webhook validation!');
      }
      return true; // Bypass validation if no secret is set (not recommended in production)
    }

    try {
      // Log incoming signature for debugging
      if (logSensitive) {
        console.log('[MercadoPago] Received signature header:', signature ? '***' : 'Not provided');
      }

      // Mercado Pago signature format: ts=<timestamp>,v1=<signature>
      const parts = signature.split(',');
      const timestamp = parts[0]?.split('=')[1];
      const receivedSignature = parts[1]?.split('=')[1];

      if (!timestamp || !receivedSignature) {
        console.error('[MercadoPago] Invalid signature format. Expected: ts=<timestamp>,v1=<signature>');
        return false;
      }

      // Create the string to sign: <timestamp>.<payload>
      const stringToSign = `${timestamp}.${payload}`;
      
      if (logSensitive) {
        console.log(`[MercadoPago] String to sign: ${stringToSign.substring(0, 100)}...`);
      }

      // Generate HMAC-SHA256
      const hmac = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(stringToSign)
        .digest('hex');

      // Compare signatures
      const isValid = hmac === receivedSignature;
      
      if (!isValid && logSensitive) {
        console.log('[MercadoPago] Signature validation failed');
        console.log(`[MercadoPago] Expected signature: ${hmac}`);
        console.log(`[MercadoPago] Received signature: ${receivedSignature}`);
      } else if (isValid) {
        console.log('[MercadoPago] Webhook signature validated successfully');
      }
      
      return isValid;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[MercadoPago] Error verifying webhook signature:', errorMessage);
      return false;
    }
  }

  /**
   * Format payment data for ticket generation
   */
  formatPaymentForTicket(payment: MercadoPagoPayment): {
    paymentId: number;
    status: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    lastFourDigits?: string | undefined;
    authorizationCode?: string | undefined;
    dateApproved: string;
  } {
    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      paymentMethod: payment.payment_method_id,
      lastFourDigits: payment.card?.last_four_digits,
      authorizationCode: payment.authorization_code,
      dateApproved: payment.date_approved || new Date().toISOString()
    };
  }

  /**
   * Check if payment is approved
   */
  isPaymentApproved(payment: MercadoPagoPayment): boolean {
    return payment.status === 'approved';
  }

  /**
   * Get supported payment methods
   */
  async getPaymentMethods(): Promise<Record<string, unknown>[]> {
    try {
      const response = await this.makeRequest<Record<string, unknown>[]>(
        'GET',
        '/v1/payment_methods'
      );
      return response || [];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to retrieve payment methods: ${errorMsg}`);
    }
  }

  /**
   * Create QR Order for in-store payment
   * Docs: POST /instore/orders/qr/seller/collectors/{collector_id}/pos/{pos_id}/qrs
   */
  async createQrOrder(params: {
    externalReference: string;
    title: string;
    description?: string;
    totalAmount: number;
    items: Array<{
      title: string;
      quantity: number;
      unit_price: number;
      total_amount?: number;
      unit_measure?: string;
    }>;
    notificationUrl?: string;
  }): Promise<{ qr_data: string; in_store_order_id: string } & Record<string, unknown>> {
    try {
      this.initialize();
      if (!this.collectorId || !this.posId) {
        throw new Error('Missing MERCADO_PAGO_QR_COLLECTOR_ID or MERCADO_PAGO_QR_POS_ID');
      }

      const endpoint = `/instore/orders/qr/seller/collectors/${encodeURIComponent(this.collectorId)}/pos/${encodeURIComponent(this.posId)}/qrs`;
      const body = {
        external_reference: params.externalReference,
        title: params.title,
        description: params.description,
        notification_url: params.notificationUrl,
        total_amount: params.totalAmount,
        items: params.items.map(i => ({
          title: i.title,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_amount: i.total_amount ?? i.unit_price * i.quantity,
          unit_measure: i.unit_measure ?? 'unit'
        }))
      };
      return await this.makeQrRequest('POST', endpoint, body);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create QR order: ${errorMsg}`);
    }
  }

  /**
   * Cancel QR Order by external_reference (deactivate pending order)
   * Docs: DELETE /instore/orders/qr/seller/collectors/{collector_id}/pos/{pos_id}/qrs?external_reference=...
   */
  async cancelQrOrder(externalReference: string): Promise<void> {
    try {
      this.initialize();
      if (!this.collectorId || !this.posId) {
        throw new Error('Missing MERCADO_PAGO_QR_COLLECTOR_ID or MERCADO_PAGO_QR_POS_ID');
      }
      const endpoint = `/instore/orders/qr/seller/collectors/${encodeURIComponent(this.collectorId)}/pos/${encodeURIComponent(this.posId)}/qrs?external_reference=${encodeURIComponent(externalReference)}`;
      await this.makeQrRequest('DELETE', endpoint);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to cancel QR order: ${errorMsg}`);
    }
  }
}
