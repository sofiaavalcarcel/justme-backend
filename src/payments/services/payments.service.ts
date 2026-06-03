import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WalletService } from '../../wallet/services/wallet.service';
import Stripe from 'stripe';

/**
 * Payment service abstraction layer.
 * Integrated with Stripe for professional wallet recharge.
 */
@Injectable()
export class PaymentsService {
    private stripe: any;

    constructor(
        private readonly configService: ConfigService,
        private readonly walletService: WalletService,
    ) {
        const stripeSecretKey = this.configService.get<string>('config.stripe.secretKey') || process.env.STRIPE_SECRET_KEY;
        this.stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
            // Using undefined lets the Stripe SDK use its own default pinned API version.
            apiVersion: undefined as any,
        });
    }

    async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>) {
        try {
            // Stripe treats COP as a 2-decimal currency (cents), so we must multiply by 100.
            // This applies to almost all standard currencies in Stripe.
            const stripeAmount = Math.round(amount * 100);
            const lowerCurrency = currency.toLowerCase();

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: stripeAmount,
                currency: lowerCurrency,
                metadata: {
                    ...metadata,
                    professionalId: String(metadata?.professionalId || ''),
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            return {
                id: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
                amount: amount,
                currency: currency,
                status: paymentIntent.status,
            };
        } catch (error) {
            console.error('Error creating Stripe Payment Intent:', error);
            throw new InternalServerErrorException(error.message);
        }
    }

    async confirmPayment(paymentIntentId: string) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            
            if (paymentIntent.status !== 'succeeded') {
                throw new BadRequestException(`Payment has not succeeded. Status: ${paymentIntent.status}`);
            }

            const professionalId = Number(paymentIntent.metadata?.professionalId);
            if (isNaN(professionalId) || !professionalId) {
                throw new BadRequestException('Professional ID not found in payment metadata');
            }

            // Convert amount back to normal units (cents to full units)
            const amount = paymentIntent.amount / 100;

            // Credit the professional's operational balance (idempotent via Stripe paymentIntentId)
            const updatedWallet = await this.walletService.topUp(professionalId, amount, paymentIntentId);

            return {
                id: paymentIntentId,
                status: 'completed',
                balance: updatedWallet.balance,
                message: 'Saldo operativo acreditado exitosamente',
            };
        } catch (error) {
            console.error('Error confirming Stripe Payment:', error);
            throw new BadRequestException(error.message);
        }
    }

    async processRefund(paymentIntentId: string, amount?: number) {
        try {
            const stripeAmount = amount ? Math.round(amount * 100) : undefined;
            const refund = await this.stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: stripeAmount,
            });

            return {
                id: refund.id,
                paymentIntentId,
                amount: refund.amount,
                status: refund.status,
                message: 'Refund processed successfully',
            };
        } catch (error) {
            console.error('Error processing Stripe Refund:', error);
            throw new BadRequestException(error.message);
        }
    }
}
