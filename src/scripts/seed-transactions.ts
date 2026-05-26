import { AppDataSource } from '../database/data-source';
import { Professional } from '../professionals/entities/professional.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../wallet/entities/transaction.entity';

async function bootstrap() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await AppDataSource.initialize();
        console.log('✅ Base de datos conectada.');

        const professionalRepo = AppDataSource.getRepository(Professional);
        const walletRepo = AppDataSource.getRepository(Wallet);
        const transactionRepo = AppDataSource.getRepository(Transaction);

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
                wallet = walletRepo.create({
                    professionalId: pro.id,
                    balance: 0,
                    currency: 'COP'
                });
                wallet = await walletRepo.save(wallet);
            }

            console.log(`💸 Insertando transacciones para el wallet ID: ${wallet.id} (${pro.user.name})...`);

            const transactionsData = [
                {
                    walletId: wallet.id,
                    type: TransactionType.RECHARGE,
                    amount: 150000,
                    description: 'Recarga inicial de saldo via PSE',
                    status: TransactionStatus.COMPLETED,
                    createdAt: new Date(Date.now() - 15 * 86400000) // 15 days ago
                },
                {
                    walletId: wallet.id,
                    type: TransactionType.PAYMENT,
                    amount: 85000,
                    description: 'Pago por servicio "Corte y Barba" - Ref: #BK-7892',
                    status: TransactionStatus.COMPLETED,
                    createdAt: new Date(Date.now() - 10 * 86400000)
                },
                {
                    walletId: wallet.id,
                    type: TransactionType.COMMISSION,
                    amount: -12750,
                    description: 'Comisión JustMe (15%) - Ref: #BK-7892',
                    status: TransactionStatus.COMPLETED,
                    createdAt: new Date(Date.now() - 10 * 86400000 + 1000)
                },
                {
                    walletId: wallet.id,
                    type: TransactionType.PAYMENT,
                    amount: 120000,
                    description: 'Pago por servicio "Coloración Premium" - Ref: #BK-8012',
                    status: TransactionStatus.COMPLETED,
                    createdAt: new Date(Date.now() - 5 * 86400000)
                },
                {
                    walletId: wallet.id,
                    type: TransactionType.COMMISSION,
                    amount: -18000,
                    description: 'Comisión JustMe (15%) - Ref: #BK-8012',
                    status: TransactionStatus.COMPLETED,
                    createdAt: new Date(Date.now() - 5 * 86400000 + 1000)
                },
                {
                    walletId: wallet.id,
                    type: TransactionType.PAYOUT,
                    amount: -200000,
                    description: 'Retiro de fondos a cuenta Bancolombia *4521',
                    status: TransactionStatus.COMPLETED,
                    createdAt: new Date(Date.now() - 2 * 86400000)
                },
                {
                    walletId: wallet.id,
                    type: TransactionType.PAYMENT,
                    amount: 95000,
                    description: 'Pago por servicio "Manicura y Pedicura" - Ref: #BK-8155',
                    status: TransactionStatus.PENDING,
                    createdAt: new Date(Date.now() - 3600000) // 1 hour ago
                }
            ];

            let totalIn = 0;
            for (const data of transactionsData) {
                const tx = transactionRepo.create(data);
                await transactionRepo.save(tx);
                if (data.status === TransactionStatus.COMPLETED) {
                    totalIn += Number(data.amount);
                }
            }

            // Update balance
            wallet.balance = Number(wallet.balance) + totalIn;
            await walletRepo.save(wallet);
        }

        console.log('✅ Transacciones de prueba insertadas exitosamente.');
        console.log('🎉 Proceso completado.');

    } catch (error) {
        console.error('❌ Error durante la inserción de transacciones:', error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        process.exit(0);
    }
}

bootstrap();
