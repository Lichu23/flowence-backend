import Stripe from 'stripe';
import config from '../config';

export interface CreatePaymentIntentParams {
  amountCents: number;
  currency: string;
  storeId: string;
  receiptNumber?: string;
  metadata?: Record<string, string>;
}

export class PaymentService {
  private stripe: Stripe;

  constructor() {
    if (!config.stripe.secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY');
    }
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: config.stripe.apiVersion,
      typescript: true
    });
  }

  async createPaymentIntent(params: CreatePaymentIntentParams) {
    const { amountCents, currency, storeId, receiptNumber, metadata } = params;
    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      capture_method: 'automatic',
      metadata: {
        store_id: storeId,
        receipt_number: receiptNumber || '',
        app: config.server.appName,
        ...metadata
      }
    });
    return intent;
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId);
  }
}


