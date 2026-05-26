import { Injectable } from '@nestjs/common';

/**
 * Payment service abstraction layer.
 * Ready for Stripe or Mercado Pago integration.
 */
@Injectable()
export class PaymentsService {
    async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>) {
        // TODO: Integrate with Stripe/MercadoPago
        // Example: const intent = await stripe.paymentIntents.create({...})
        return {
            id: `pi_${Date.now()}`,
            amount,
            currency,
            status: 'pending',
            metadata,
            message: 'Payment intent created (mock - integrate Stripe/MercadoPago)',
        };
    }

    async confirmPayment(paymentIntentId: string) {
        // TODO: Verify payment with provider
        return {
            id: paymentIntentId,
            status: 'completed',
            message: 'Payment confirmed (mock - integrate Stripe/MercadoPago)',
        };
    }

    async processRefund(paymentIntentId: string, amount?: number) {
        // TODO: Process refund with provider
        return {
            id: `rf_${Date.now()}`,
            paymentIntentId,
            amount,
            status: 'refunded',
            message: 'Refund processed (mock - integrate Stripe/MercadoPago)',
        };
    }
}
