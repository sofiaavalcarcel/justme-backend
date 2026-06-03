import { AppDataSource } from '../database/data-source';
import { Professional } from '../professionals/entities/professional.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../wallet/entities/transaction.entity';

/**
 * Seed: Operational Balance Transactions
 * Generates realistic sample transaction history using the new
 * operational balance model (TOP_UP + COMMISSION only).
 */
async function bootstrap() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await AppDataSource.initialize();
        console.log('✅ Base de datos conectada.');

        const professionalRepo = AppDataSource.getRepository(Professional);
        const walletRepo       = AppDataSource.getRepository(Wallet);
        const transactionRepo  = AppDataSource.getRepository(Transaction);

        const professionals = await professionalRepo.find({ relations: ['user', 'wallet'] });

        if (professionals.length === 0) {
            console.warn('⚠️ No hay profesionales registrados. Por favor corre el seed base primero.');
            return;
        }

        console.log(`💼 Procesando transacciones para ${professionals.length} profesionales...`);

        for (const pro of professionals) {
            let wallet = pro.wallet;

            if (!wallet) {
                console.log(`👛 Creando wallet para ${pro.user.name}...`);
                wallet = walletRepo.create({ professionalId: pro.id, balance: 0, currency: 'COP' });
                wallet = await walletRepo.save(wallet);
            }

            console.log(`💸 Insertando transacciones para wallet ID: ${wallet.id} (${pro.user.name})...`);

            // Simulate: top-up → 3 completed bookings with commissions
            const COMMISSION_RATE = 0.09;
            let runningBalance = Number(wallet.balance);

            const events: Array<{ daysAgo: number; type: TransactionType; amount: number; serviceAmount?: number; bookingId?: number; description: string }> = [
                { daysAgo: 15, type: TransactionType.TOP_UP,     amount: 200000, description: 'Recarga inicial via Stripe' },
                { daysAgo: 10, type: TransactionType.COMMISSION, amount: -(100000 * COMMISSION_RATE), serviceAmount: 100000, bookingId: 1001, description: 'Comisión JUSTME 9% — Reserva #1001 (Corte y Barba)' },
                { daysAgo: 7,  type: TransactionType.TOP_UP,     amount: 150000, description: 'Recarga via Stripe' },
                { daysAgo: 5,  type: TransactionType.COMMISSION, amount: -(120000 * COMMISSION_RATE), serviceAmount: 120000, bookingId: 1002, description: 'Comisión JUSTME 9% — Reserva #1002 (Coloración Premium)' },
                { daysAgo: 2,  type: TransactionType.COMMISSION, amount: -(85000  * COMMISSION_RATE), serviceAmount: 85000,  bookingId: 1003, description: 'Comisión JUSTME 9% — Reserva #1003 (Manicura)' },
            ];

            for (const ev of events) {
                const balanceBefore = runningBalance;
                runningBalance      = Math.round(runningBalance + ev.amount);

                const tx = transactionRepo.create({
                    walletId:             wallet.id,
                    type:                 ev.type,
                    amount:               Math.round(ev.amount),
                    serviceAmount:        ev.serviceAmount ?? null,
                    commissionPercentage: ev.type === TransactionType.COMMISSION ? COMMISSION_RATE : null,
                    balanceBefore,
                    balanceAfter:         runningBalance,
                    relatedBookingId:     ev.bookingId ?? null,
                    description:          ev.description,
                    status:               TransactionStatus.COMPLETED,
                    createdAt:            new Date(Date.now() - ev.daysAgo * 86400000),
                } as Partial<Transaction>);

                await transactionRepo.save(tx);
            }

            wallet.balance = runningBalance;
            await walletRepo.save(wallet);
            console.log(`  ✅ Balance final: $${runningBalance.toLocaleString('es-CO')} COP`);
        }

        console.log('✅ Transacciones de prueba insertadas exitosamente.');
        console.log('🎉 Proceso completado.');

    } catch (error) {
        console.error('❌ Error durante la inserción de transacciones:', error);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

bootstrap();
