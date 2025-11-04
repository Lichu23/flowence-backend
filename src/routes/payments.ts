import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireStoreAccess } from '../middleware/storeAccess';
import { PaymentController } from '../controllers/PaymentController';

const router = Router();
const controller = new PaymentController();

// Webhook endpoint (no authentication required - Mercado Pago uses signature verification)
// Note: This needs to match the URL configured in Mercado Pago dashboard
router.post('/stores/webhooks/mercado-pago', controller.handleMercadoPagoWebhook.bind(controller));

// Protected payment endpoints
router.use(authenticate);

router.post('/:storeId/payments/intents', requireStoreAccess(), controller.createIntent.bind(controller));
router.post('/:storeId/payments/confirm', requireStoreAccess(), controller.confirmPayment.bind(controller));
router.get('/:storeId/payments/:paymentIntentId/status', requireStoreAccess(), controller.getPaymentStatus.bind(controller));

// Mercado Pago QR endpoints
router.post('/:storeId/payments/mercado-pago/qr-order', requireStoreAccess(), controller.createMercadoPagoQrOrder.bind(controller));
router.delete('/:storeId/payments/mercado-pago/qr-order', requireStoreAccess(), controller.cancelMercadoPagoQrOrder.bind(controller));

export default router;


