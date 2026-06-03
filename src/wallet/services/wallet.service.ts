import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { ProfessionalsService } from '../../professionals/services/professionals.service';

const COMMISSION_RATE      = 0.09;
const LOW_BALANCE_COP      = 20_000;   // warn threshold
const MIN_BALANCE_COP      = -20_000;  // hide profile threshold

/**
 * WalletService — Operational Balance Model
 *
 * The wallet is NOT a banking wallet. It is a prepaid operational credit that
 * professionals must maintain to remain visible and receive bookings on the
 * JUSTME platform.
 *
 * Business rules:
 *  1. Professionals top-up via Stripe.
 *  2. When a booking is marked COMPLETED, 9% of the service price is automatically
 *     deducted as a platform commission.
 *  3. New bookings are blocked when balance ≤ 0.
 *  4. Professional profile is hidden when balance < MIN_BALANCE_COP.
 */
@Injectable()
export class WalletService {

    constructor(
        @InjectRepository(Wallet)      private walletRepo:       Repository<Wallet>,
        @InjectRepository(Transaction) private transactionRepo:  Repository<Transaction>,
        private readonly dataSource:           DataSource,
        private readonly notificationsService: NotificationsService,
        private readonly professionalsService: ProfessionalsService,
    ) {}

    // ─── Helpers ──────────────────────────────────────────────────────────────

    async getOrCreateWallet(professionalId: number): Promise<Wallet> {
        const proExists = await this.walletRepo.query(
            'SELECT id FROM professionals WHERE id = $1',
            [professionalId],
        );
        if (!proExists?.length) {
            throw new BadRequestException(`Professional ${professionalId} not found.`);
        }

        let wallet = await this.walletRepo.findOne({ where: { professionalId } });
        if (!wallet) {
            wallet = await this.walletRepo.save(
                this.walletRepo.create({ professionalId, balance: 0, currency: 'COP' }),
            );
        }
        return wallet;
    }

    async getWalletWithTransactions(professionalId: number) {
        const wallet = await this.getOrCreateWallet(professionalId);
        const transactions = await this.transactionRepo.find({
            where: { walletId: wallet.id },
            order: { createdAt: 'DESC' },
            take: 50,
        });
        return { ...wallet, transactions };
    }

    // ─── Balance check ─────────────────────────────────────────────────────────

    /**
     * Returns whether the professional can accept new bookings.
     * Rule: balance must be > 0.
     */
    async canAcceptBookings(professionalId: number): Promise<{ canBook: boolean; balance: number }> {
        const wallet = await this.getOrCreateWallet(professionalId);
        const balance = Number(wallet.balance);
        return { canBook: balance > 0, balance };
    }

    // ─── Top-Up (Stripe) ───────────────────────────────────────────────────────

    /**
     * Credits the professional's operational balance.
     * Called after a successful Stripe payment confirmation.
     * Idempotent via Stripe paymentIntentId de-duplication.
     */
    async topUp(professionalId: number, amount: number, stripePaymentIntentId?: string): Promise<Wallet> {
        const rechargeAmount = Number(amount);
        if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
            throw new BadRequestException('Monto de recarga inválido.');
        }

        const wallet = await this.getOrCreateWallet(professionalId);

        const description = stripePaymentIntentId
            ? `Recarga via Stripe (ID: ${stripePaymentIntentId})`
            : 'Recarga de saldo operativo';

        // Idempotency: reject duplicate Stripe payment intents
        if (stripePaymentIntentId) {
            const duplicate = await this.transactionRepo.findOne({ where: { description } });
            if (duplicate) return wallet;
        }

        const balanceBefore = Number(wallet.balance);
        const balanceAfter  = balanceBefore + rechargeAmount;

        await this.transactionRepo.save(
            this.transactionRepo.create({
                walletId:    wallet.id,
                type:        TransactionType.TOP_UP,
                amount:      rechargeAmount,
                balanceBefore,
                balanceAfter,
                description,
                status:      TransactionStatus.COMPLETED,
            }),
        );

        wallet.balance = balanceAfter;
        const updated = await this.walletRepo.save(wallet);

        // Re-activate visibility if balance is now above minimum
        if (balanceAfter > MIN_BALANCE_COP) {
            await this.professionalsService.setVisibility(professionalId, true);
        }

        return updated;
    }

    // ─── Commission Deduction ─────────────────────────────────────────────────

    /**
     * Deducts the 9% platform commission when a booking is completed.
     * Uses a DB transaction to ensure atomicity.
     * Idempotent: will skip if a COMMISSION row for this booking already exists.
     *
     * @param bookingId    The completed booking
     * @param professionalId
     * @param servicePrice The gross price of the service paid by the customer
     */
    async deductCommission(
        bookingId:      number,
        professionalId: number,
        servicePrice:   number,
    ): Promise<{ commission: number; balanceAfter: number }> {

        return this.dataSource.transaction(async (manager) => {

            // Idempotency check — skip if already processed
            const existing = await manager.findOne(Transaction, {
                where: { relatedBookingId: bookingId, type: TransactionType.COMMISSION },
            });
            if (existing) {
                const wallet = await manager.findOne(Wallet, { where: { professionalId } });
                return { commission: Math.abs(Number(existing.amount)), balanceAfter: Number(wallet?.balance ?? 0) };
            }

            // Lock the wallet row for update
            const wallet = await manager
                .getRepository(Wallet)
                .createQueryBuilder('wallet')
                .setLock('pessimistic_write')
                .where('wallet.professionalId = :professionalId', { professionalId })
                .getOne();

            if (!wallet) throw new BadRequestException(`Wallet for professional ${professionalId} not found.`);

            const commission    = Math.round(Number(servicePrice) * COMMISSION_RATE);
            const balanceBefore = Number(wallet.balance);
            const balanceAfter  = balanceBefore - commission;

            // Save commission transaction
            await manager.save(
                manager.create(Transaction, {
                    walletId:             wallet.id,
                    type:                 TransactionType.COMMISSION,
                    amount:               -commission,
                    serviceAmount:        Number(servicePrice),
                    commissionPercentage: COMMISSION_RATE,
                    balanceBefore,
                    balanceAfter,
                    relatedBookingId:     bookingId,
                    description:          `Comisión JUSTME 9% — Reserva #${bookingId}`,
                    status:               TransactionStatus.COMPLETED,
                }),
            );

            // Update balance
            wallet.balance = balanceAfter;
            await manager.save(wallet);

            // Post-transaction side effects (outside the DB transaction is fine)
            setImmediate(() => this.handlePostCommission(wallet, professionalId).catch(console.error));

            return { commission, balanceAfter };
        });
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private async handlePostCommission(wallet: Wallet, professionalId: number) {
        const balance = Number(wallet.balance);

        // Hide profile if balance below minimum
        if (balance < MIN_BALANCE_COP) {
            await this.professionalsService.setVisibility(professionalId, false);
        }

        // Fetch userId to send notification
        const pro = await this.professionalsService.findOne(professionalId).catch(() => null);
        if (!pro?.userId) return;

        if (balance <= 0) {
            await this.notificationsService.send(
                pro.userId,
                '⚠️ Saldo operativo agotado',
                `Tu saldo operativo ha llegado a $${balance.toLocaleString('es-CO')} COP. No podrás recibir nuevas reservas hasta que recargues.`,
                NotificationType.WALLET,
                { walletId: wallet.id },
            );
        } else if (balance < LOW_BALANCE_COP) {
            await this.notificationsService.send(
                pro.userId,
                '⚡ Saldo operativo bajo',
                `Tu saldo operativo es $${balance.toLocaleString('es-CO')} COP. Recarga pronto para seguir recibiendo reservas.`,
                NotificationType.WALLET,
                { walletId: wallet.id },
            );
        }
    }
}
